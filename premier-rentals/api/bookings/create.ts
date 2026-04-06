import {
  BOOKING_CATALOG,
  getBookingAmounts,
  labelToTimeSlot,
  normalizeTimeSlot,
} from "../_shared/catalog";
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
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return candidate < today;
}

export default async function handler(request: Request) {
  // Handle CORS preflight
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
    const timeSlot = normalizeTimeSlot(typeof time_slot === "string" ? time_slot : "");
    const guestCount = Number(guests);
    const carCount = Number(cars);
    const trimmedName = typeof full_name === "string" ? full_name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
    const trimmedAddress = typeof address === "string" ? address.trim() : "";
    const trimmedRateTier = typeof rate_tier === "string" ? rate_tier.trim() : "";
    const trimmedRateLabel = typeof rate_label === "string" ? rate_label.trim() : "";
    const trimmedModeOfPayment =
      typeof mode_of_payment === "string" ? mode_of_payment.trim() : "";
    const trimmedSpecialRequests =
      typeof special_requests === "string" ? special_requests.trim() : "";
    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(reservationDate);
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

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
      !trimmedModeOfPayment
    ) {
      return json({ error: "Missing or invalid booking details" }, { status: 400 });
    }

    if (isPastDate(reservationDate)) {
      return json({ error: "Past dates are not allowed" }, { status: 400 });
    }

    if (
      trimmedName.length > 120 ||
      trimmedPhone.length > 30 ||
      trimmedAddress.length > 255 ||
      trimmedRateTier.length > 50 ||
      trimmedRateLabel.length > 100 ||
      trimmedModeOfPayment.length > 50 ||
      trimmedSpecialRequests.length > 1000
    ) {
      return json({ error: "Booking details exceed allowed length" }, { status: 400 });
    }

    if (!["GCash", "Card"].includes(trimmedModeOfPayment)) {
      return json({ error: "Unsupported payment method" }, { status: 400 });
    }

    const property = BOOKING_CATALOG[propertyId];
    if (!property) {
      return json({ error: "Invalid property selection" }, { status: 400 });
    }

    if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > property.maxGuests) {
      return json({ error: "Invalid guest count" }, { status: 400 });
    }

    if (!Number.isFinite(carCount) || carCount < 1 || carCount > property.maxCars) {
      return json({ error: "Invalid car count" }, { status: 400 });
    }

    const selection = getBookingAmounts({
      propertyId,
      rateTier: trimmedRateTier,
      rateLabel: trimmedRateLabel,
      reservationDate,
    });

    if (!selection) {
      return json({ error: "Invalid rate selection" }, { status: 400 });
    }

    const derivedTimeSlot = labelToTimeSlot(selection.rate.label);
    if (derivedTimeSlot !== timeSlot) {
      return json({ error: "Selected session does not match the chosen time slot" }, { status: 400 });
    }

    if (guestCount > selection.pkg.maxPax) {
      return json({ error: "Guest count exceeds the selected package capacity" }, { status: 400 });
    }

    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: retreat, error: retreatError } = await supabaseAdmin
      .from("retreats")
      .select("id, slug")
      .eq("slug", propertyId)
      .single();

    if (retreatError || !retreat?.id) {
      return json({ error: "Property record not found" }, { status: 500 });
    }

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
          timeSlot === "daytime" ? "day" : timeSlot === "nighttime" ? "night" : "overnight",
        p_preferred_dates: reservationDate,
        p_preferred_time:
          timeSlot === "daytime" ? "Day" : timeSlot === "nighttime" ? "Night" : "Overnight",
        p_preferred_plan: selection.rate.label.toLowerCase().includes("platinum")
          ? "Platinum"
          : selection.rate.label.toLowerCase().includes("premium")
            ? "Premium"
            : "Basic",
        p_rate_tier: trimmedRateTier,
        p_mode_of_payment: trimmedModeOfPayment,
        p_num_guests: guestCount,
        p_num_cars: carCount,
        p_total_amount: selection.totalAmount,
        p_downpayment_amount: selection.downpaymentAmount,
        p_special_requests: trimmedSpecialRequests || null,
        p_locked_until: lockedUntil,
      },
    );

    if (bookingError) {
      if ((bookingError.message || "").includes("Slot already booked")) {
        return json({ error: "Slot already booked" }, { status: 409 });
      }
      return json({ error: "Unable to create booking" }, { status: 500 });
    }

    const row = Array.isArray(booking) ? booking[0] : booking;
    if (!row) {
      return json({ error: "Unable to create booking" }, { status: 500 });
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
    console.error("bookings/create failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
