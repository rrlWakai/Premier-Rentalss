import { BOOKING_CATALOG, normalizeTimeSlot } from "../_shared/catalog";
import {
  computeBookingPrice,
  PricingError,
  type PriceBreakdown,
} from "../_shared/pricing";
import { getActiveDiscount } from "../_shared/discounts";
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

function isPastDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const candidate = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return candidate < today;
}

const MAX_LENGTHS: Record<string, number> = {
  full_name: 100,
  email: 254,
  phone: 20,
  address: 300,
  special_requests: 1000,
};

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
    const bookingRateLimit = await enforceRateLimit({
      request,
      scope: "bookings.create",
      maxRequests: 8,
      windowSeconds: 60,
    });

    if (!bookingRateLimit.allowed) {
      return json(
        { error: "Too many booking attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(bookingRateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const body = await request.json();

    const {
      property_id,
      date,
      time_slot,
      guests,
      cars,
      full_name,
      email,
      phone,
      address,
      rate_tier,
      rate_label,
      mode_of_payment,
      special_requests,
    } = body ?? {};

    const propertyId = typeof property_id === "string" ? property_id : "";
    const reservationDate = typeof date === "string" ? date : "";
    const timeSlot = normalizeTimeSlot(
      typeof time_slot === "string" ? time_slot : "",
    );

    const guestCount = Number(guests);
    const carCount = Number(cars);
    const trimmedName = typeof full_name === "string" ? full_name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
    const trimmedAddress = typeof address === "string" ? address.trim() : "";
    const trimmedRateTier =
      typeof rate_tier === "string" ? rate_tier.trim() : "";
    const trimmedRateLabel =
      typeof rate_label === "string" ? rate_label.trim() : "";
    const trimmedModeOfPayment =
      typeof mode_of_payment === "string" ? mode_of_payment.trim() : "";
    const trimmedSpecialRequests =
      typeof special_requests === "string" ? special_requests.trim() : "";

    // Validate Input Lengths
    const fieldLengths: Record<string, string> = {
      full_name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      address: trimmedAddress,
      special_requests: trimmedSpecialRequests,
    };
    
    for (const [field, value] of Object.entries(fieldLengths)) {
      if (value.length > MAX_LENGTHS[field]) {
        return json(
          {
            error: `${field.replace("_", " ")} exceeds the maximum allowed length.`,
          },
          { status: 400 },
        );
      }
    }

    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(reservationDate);
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail);

    if (
      !propertyId ||
      !isIsoDate ||
      !timeSlot ||
      !trimmedName ||
      !isValidEmail ||
      !trimmedPhone ||
      !trimmedAddress ||
      !trimmedRateTier ||
      !trimmedRateLabel ||
      !trimmedModeOfPayment ||
      !Number.isInteger(guestCount) ||
      guestCount < 1 ||
      !Number.isInteger(carCount) ||
      carCount < 1
    ) {
      return json({ error: "Missing or invalid booking details" }, { status: 400 });
    }

    if (isPastDate(reservationDate)) {
      return json({ error: "Past dates are not allowed" }, { status: 400 });
    }

    const property = BOOKING_CATALOG[propertyId];
    if (!property) {
      return json({ error: "Invalid property selection" }, { status: 400 });
    }

    if (carCount > property.maxCars) {
      return json(
        { error: `Maximum ${property.maxCars} cars allowed for this property.` },
        { status: 400 },
      );
    }

    // Compute Price
    const appliedDiscount = await getActiveDiscount(reservationDate, propertyId, trimmedRateLabel);

    let pricing: PriceBreakdown;
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

    // Check Availability
    const { data: existingBookings, error: availabilityError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("property_id", propertyId)
      .eq("booking_date", reservationDate)
      .eq("time_slot", timeSlot)
      .in("status", ["half", "confirmed"]);

    if (availabilityError) {
      console.error("[BOOKING] Availability check failed:", availabilityError.message);
      return json({ error: "Failed to verify availability. Please try again." }, { status: 500 });
    }

    if (existingBookings && existingBookings.length > 0) {
      return json({ error: "The selected date and time slot are no longer available." }, { status: 409 });
    }

    // Validate Property
    const { data: retreat, error: retreatError } = await supabaseAdmin
      .from("retreats")
      .select("id, slug")
      .eq("slug", propertyId)
      .single();

    if (retreatError || !retreat?.id) {
      console.error("[BOOKING] Retreat lookup failed:", retreatError?.message);
      return json({ error: "Property record not found" }, { status: 404 });
    }

    // Create Checkout Session
    const checkoutSessionId = crypto.randomUUID();

    const { error: insertError } = await supabaseAdmin.from("checkout_sessions").insert({
      checkout_session_id: checkoutSessionId,
      booking_payload: {
        propertyId,
        retreatId: retreat.id,
        reservationDate,
        timeSlot,
        full_name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
        guests: guestCount,
        cars: carCount,
        rate_tier: trimmedRateTier,
        rate_label: trimmedRateLabel,
        mode_of_payment: trimmedModeOfPayment,
        special_requests: trimmedSpecialRequests,
        pricing,
      },
    });

    if (insertError) {
      console.error("[BOOKING] Failed to insert checkout session:", insertError.message);
      return json({ error: "Failed to initialize checkout session." }, { status: 500 });
    }

    // Return Response
    return json({
      checkout_session_id: checkoutSessionId,
      message: "Proceed to payment",
    });

  } catch (error) {
    console.error(
      "[BOOKING] Unhandled error:",
      error instanceof Error ? error.message : String(error),
    );
    return json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
