import { BOOKING_CATALOG, normalizeTimeSlot } from "../_shared/catalog";
import { createCheckoutSession } from "../_shared/paymongo";
import { enforceRateLimit } from "../_shared/rateLimit";
import { supabaseAdmin } from "../_shared/supabaseAdmin";
import { computeBookingPrice, PricingError } from "../_shared/pricing";
import { getActiveDiscount } from "../_shared/discounts";

export const config = {
  runtime: "edge",
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

function getBaseUrl(request: Request) {
  return process.env.PUBLIC_SITE_URL || new URL(request.url).origin;
}

/* =========================
   HELPERS (NEW)
========================= */

function parseDateToISO(input: string) {
  if (!input) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
}

function parseNumber(input: unknown) {
  if (typeof input === "number") return input;

  if (typeof input === "string") {
    const num = parseInt(input.replace(/[^\d]/g, ""), 10);
    return isNaN(num) ? 0 : num;
  }

  return 0;
}

/* =========================
   HANDLER
========================= */

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return json(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const checkoutRateLimit = await enforceRateLimit({
      request,
      scope: "payments.checkout",
      maxRequests: 5,
      windowSeconds: 60,
    });

    if (!checkoutRateLimit.allowed) {
      return json(
        { error: "Too many checkout attempts. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(checkoutRateLimit.retryAfterSeconds) } }
      );
    }

    const body = await request.json();

    const propertyId = typeof body?.property_id === "string" ? body.property_id : "";

    const rawDate = typeof body?.date === "string" ? body.date : "";
    const reservationDate = parseDateToISO(rawDate);

    const timeSlot = normalizeTimeSlot(
      typeof body?.time_slot === "string" ? body.time_slot : ""
    );

    const guestCount = parseNumber(body?.guests);
    const carCount = parseNumber(body?.cars);

    if (!propertyId || !reservationDate || !timeSlot) {
      return json({ error: "Missing critical booking details" }, { status: 400 });
    }

    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return json({ error: "Invalid guest count" }, { status: 400 });
    }

    if (!Number.isInteger(carCount) || carCount < 0) {
      return json({ error: "Invalid car count" }, { status: 400 });
    }

    const property = BOOKING_CATALOG[propertyId];
    if (!property) {
      return json({ error: "Invalid property selection" }, { status: 400 });
    }

    /* =========================
       AVAILABILITY CHECK
    ========================= */

    const { data: existingBooking, error: checkError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("property_id", propertyId)
      .eq("booking_date", reservationDate)
      .eq("time_slot", timeSlot)
      .in("status", ["half", "confirmed"])
      .maybeSingle();

    if (checkError) {
      console.error("[CHECKOUT] DB check error:", checkError.message);
      return json({ error: "Failed to verify slot availability" }, { status: 500 });
    }

    if (existingBooking) {
      return json(
        { error: "⚠️ This schedule is already booked. Please choose another date or package." },
        { status: 409 }
      );
    }

    /* =========================
       PRICING
    ========================= */

    const trimmedRateLabel =
      typeof body?.rate_label === "string" ? body.rate_label.trim() : "";
    const trimmedRateTier =
      typeof body?.rate_tier === "string" ? body.rate_tier.trim() : "";

    const appliedDiscount = await getActiveDiscount(
      reservationDate,
      propertyId,
      trimmedRateLabel
    );

    let pricing;
    try {
      pricing = computeBookingPrice({
        propertyId,
        rateTier: trimmedRateTier,
        rateLabel: trimmedRateLabel,
        reservationDate,
        guests: guestCount,
        appliedDiscount,
      });
    } catch (err) {
      if (err instanceof PricingError) {
        return json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    /* =========================
       RETREAT LOOKUP
    ========================= */

    const { data: retreat } = await supabaseAdmin
      .from("retreats")
      .select("id")
      .eq("slug", propertyId)
      .single();

    if (!retreat) {
      return json({ error: "Retreat not found" }, { status: 404 });
    }

    /* =========================
       PAYLOAD
    ========================= */

    const fullPayload = {
      ...body,
      date: reservationDate,
      guests: guestCount,
      cars: carCount,
      retreat_id: retreat.id,
      total_amount: pricing.finalTotal,
      downpayment_amount: pricing.downpayment,
    };

    const baseUrl = getBaseUrl(request);

    const tempReference = `req_${crypto.randomUUID()}`;

    /* =========================
       PAYMONGO SESSION
    ========================= */

    const checkoutSession = await createCheckoutSession({
      amount: pricing.downpayment,
      propertyName: property.name,
      description: `${property.name} booking for ${reservationDate} (${timeSlot})`,
      bookingId: tempReference,
      guestName: body?.full_name || "Guest",
      guestEmail: body?.email || "no-reply@example.com",
      guestPhone: body?.phone || body?.contact_number || "",
      successUrl: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/booking/failed?session_id={CHECKOUT_SESSION_ID}`,
    });

    const checkoutSessionId = checkoutSession?.id;
    const checkoutUrl = checkoutSession?.attributes?.checkout_url;

    if (!checkoutSessionId || !checkoutUrl) {
      return json({ error: "Failed to initialize payment checkout" }, { status: 502 });
    }

    /* =========================
       STORE SESSION
    ========================= */

    const { error: sessionInsertError } = await supabaseAdmin
      .from("checkout_sessions")
      .insert({
        checkout_session_id: checkoutSessionId,
        booking_payload: fullPayload,
      });

    if (sessionInsertError) {
      console.error("[CHECKOUT] Failed to save session payload:", sessionInsertError.message);
      return json({ error: "Failed to initialize booking session" }, { status: 500 });
    }

    console.log("[CHECKOUT] Session created:", checkoutSessionId);

    return json({ checkout_url: checkoutUrl }, { status: 200 });

  } catch (error) {
    console.error("payments/checkout failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}