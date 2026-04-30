import { BOOKING_CATALOG } from "../_shared/catalog";
import { createCheckoutSession } from "../_shared/paymongo";
import { enforceRateLimit } from "../_shared/rateLimit";
import { supabaseAdmin } from "../_shared/supabaseAdmin";

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
    const resumeRateLimit = await enforceRateLimit({
      request,
      scope: "payments.resume_checkout",
      maxRequests: 5,
      windowSeconds: 60,
    });

    if (!resumeRateLimit.allowed) {
      return json(
        { error: "Too many resume attempts. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(resumeRateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = await request.json();
    const booking_id = typeof body?.booking_id === "string" ? body.booking_id.trim() : "";

    if (!booking_id) {
      return json({ error: "booking_id is required" }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("checkout_sessions")
      .select("id, booking_payload")
      .eq("booking_id", booking_id)
      .single();

    if (sessionError || !session?.booking_payload) {
      return json({ error: "Booking session not found" }, { status: 404 });
    }

    const payload = session.booking_payload as Record<string, unknown>;
    const propertyId =
      typeof payload.property_id === "string" ? payload.property_id : "";
    const property = propertyId ? BOOKING_CATALOG[propertyId] : null;

    const downpayment =
      typeof payload.downpayment_amount === "number"
        ? payload.downpayment_amount
        : Number(payload.downpayment_amount);

    if (!Number.isFinite(downpayment) || downpayment <= 0) {
      return json({ error: "Invalid booking payment details" }, { status: 400 });
    }

    const guestName = typeof payload.full_name === "string" ? payload.full_name : "";
    const guestEmail = typeof payload.email === "string" ? payload.email : "";
    const guestPhone = typeof payload.phone === "string" ? payload.phone : "";
    const baseUrl = getBaseUrl(request);

    const checkoutSession = await createCheckoutSession({
      amount: downpayment,
      propertyName: property?.name || "Premier Rentals",
      description: property?.name
        ? `${property.name} booking`
        : "Premier Rentals booking",
      bookingId: booking_id,
      guestName,
      guestEmail,
      guestPhone,
      successUrl: `${baseUrl}/booking/success?booking_id=${booking_id}`,
      cancelUrl: `${baseUrl}/booking/failed?booking_id=${booking_id}`,
    });

    const paymongoSessionId = checkoutSession?.id;
    const checkoutUrl = checkoutSession?.attributes?.checkout_url;

    if (!paymongoSessionId || !checkoutUrl) {
      return json({ error: "Failed to initialize payment checkout" }, { status: 502 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("checkout_sessions")
      .update({
        checkout_session_id: paymongoSessionId,
        consumed: false,
      })
      .eq("id", session.id);

    if (updateError) {
      console.error("[RESUME CHECKOUT] Failed to update checkout session:", updateError);
      return json({ error: "Failed to resume checkout session" }, { status: 500 });
    }

    return json({ checkout_url: checkoutUrl }, { status: 200 });
  } catch (error) {
    console.error("payments/resume-checkout failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
