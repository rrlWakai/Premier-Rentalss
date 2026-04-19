import { BOOKING_CATALOG, normalizeTimeSlot } from "../_shared/catalog";
import {
  computeBookingPrice,
  PricingError,
  type PriceBreakdown,
} from "../_shared/pricing";
import { getActiveDiscount } from "../_shared/discounts";
import { enforceRateLimit } from "../_shared/rateLimit";
import { supabaseAdmin } from "../_shared/supabaseAdmin";

function rateLabelToPlan(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("platinum") || l.includes("overnight")) return "Platinum";
  if (l.includes("premium")) return "Premium";
  return "Basic";
}

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

    // Field length validation
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

    // ── Authoritative price computation ───────────────────────────────────────
    // computeBookingPrice is the single source of truth.
    // It validates guests, applies the holiday weekend override, and computes
    // the full total (base + extra pax). It throws PricingError on any
    // validation failure so there are no silent fallbacks.
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

    console.log("[BOOKING] pricing computed:", {
      propertyId,
      rateTier: trimmedRateTier,
      rateLabel: trimmedRateLabel,
      reservationDate,
      guests: guestCount,
      priceType: pricing.priceType,
      basePrice: pricing.basePrice,
      extraPax: pricing.extraPax,
      extraCost: pricing.extraCost,
      finalTotal: pricing.finalTotal,
      downpayment: pricing.downpayment,
    });

    // ── DB lookup ─────────────────────────────────────────────────────────────
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: retreat, error: retreatError } = await supabaseAdmin
      .from("retreats")
      .select("id, slug")
      .eq("slug", propertyId)
      .single();

    if (retreatError || !retreat?.id) {
      console.error(
        "[BOOKING] retreat lookup failed:",
        retreatError?.message,
      );
      return json({ error: "Property record not found" }, { status: 500 });
    }

    // ── Create locked booking ─────────────────────────────────────────────────
    const { data: booking, error: bookingError } = await supabaseAdmin.rpc(
      "create_locked_booking",
      {
        p_retreat_id: retreat.id,
        p_property_id: propertyId,
        p_booking_date: reservationDate,
        p_time_slot: timeSlot,
        p_full_name: trimmedName,
        p_email: trimmedEmail,
        p_phone: trimmedPhone,
        p_contact_number: trimmedPhone,
        p_address: trimmedAddress,
        p_booking_type:
          timeSlot === "daytime"
            ? "day"
            : timeSlot === "nighttime"
              ? "night"
              : "overnight",
        p_preferred_dates: reservationDate,
        p_preferred_time:
          timeSlot === "daytime"
            ? "Day"
            : timeSlot === "nighttime"
              ? "Night"
              : "Overnight",
        p_preferred_plan: rateLabelToPlan(trimmedRateLabel),
        p_rate_tier: trimmedRateTier,
        p_mode_of_payment: trimmedModeOfPayment,
        p_num_guests: guestCount,
        p_num_cars: carCount,
        // Full price computed by backend — includes base + extra pax.
        p_total_amount: pricing.finalTotal,
        p_downpayment_amount: pricing.downpayment,
        p_special_requests: trimmedSpecialRequests || null,
        p_locked_until: lockedUntil,
      },
    );

    if (bookingError) {
      console.error("[BOOKING] RPC error:", bookingError.message);
      return json(
        { error: "Unable to create booking. Please try again." },
        { status: 500 },
      );
    }

    const row = Array.isArray(booking) ? booking[0] : booking;
    if (!row) {
      return json({ error: "Unable to create booking" }, { status: 500 });
    }

    console.log("[BOOKING] booking created:", {
      bookingId: row.id,
      propertyId,
      reservationDate,
      timeSlot,
      finalTotal: pricing.finalTotal,
      downpayment: pricing.downpayment,
      lockedUntil,
    });

    // ── Pricing snapshot ──────────────────────────────────────────────────────
    // Stores the exact computed values at booking time for audit and debugging.
    // Best-effort: a failure here does NOT block the booking.
    const pricingSnapshot = {
      rateLabel: trimmedRateLabel,
      rateTier: trimmedRateTier,
      basePrice: pricing.basePrice,
      extraPax: pricing.extraPax,
      extraCost: pricing.extraCost,
      subtotal: pricing.subtotal,
      discountLabel: pricing.discountLabel || null,
      discountPercentage: pricing.discountPercentage || null,
      discountAmount: pricing.discountAmount || null,
      finalTotal: pricing.finalTotal,
      downpayment: pricing.downpayment,
      weekendApplied: pricing.priceType === "weekend",
    };

    const { error: snapshotError } = await supabaseAdmin
      .from("bookings")
      .update({ pricing_snapshot: pricingSnapshot })
      .eq("id", row.id);

    if (snapshotError) {
      console.error("[BOOKING] pricing_snapshot update failed (booking still created):", {
        bookingId: row.id,
        snapshotError: snapshotError.message,
        pricingSnapshot,
      });
    }

    return json(
      {
        booking_id: row.id,
        amount: row.total_amount,
        downpayment_amount: row.downpayment_amount,
        locked_until: row.locked_until,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[BOOKING] unhandled error:",
      error instanceof Error ? error.message : String(error),
    );
    return json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
