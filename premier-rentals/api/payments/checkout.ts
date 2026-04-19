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

async function clearCheckoutInitializationLock(bookingId: string, initializationToken: string) {
  await supabaseAdmin
    .from("bookings")
    .update({ checkout_session_id: null })
    .eq("id", bookingId)
    .eq("checkout_session_id", initializationToken);
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
    const body = await request.json();
    const bookingId = typeof body?.booking_id === "string" ? body.booking_id : "";

    if (!bookingId) {
      return json({ error: "booking_id is required" }, { status: 400 });
    }

    const checkoutRateLimit = await enforceRateLimit({
      request,
      scope: "payments.checkout",
      maxRequests: 5,
      windowSeconds: 60,
      subjectSuffix: bookingId,
    });

    if (!checkoutRateLimit.allowed) {
      return json(
        { error: "Too many checkout attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(checkoutRateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.warn("[PAYMENT] booking not found:", { bookingId });
      return json({ error: "Booking not found" }, { status: 404 });
    }

    // Safety check: reject if booking hold has expired.
    const lockExpiry = booking.locked_until
      ? new Date(booking.locked_until).getTime()
      : 0;
    if (lockExpiry <= Date.now()) {
      console.warn("[PAYMENT] booking expired:", {
        bookingId,
        lockedUntil: booking.locked_until,
      });
      return json({ error: "Booking expired" }, { status: 410 });
    }

    // Safety check: reject if already confirmed or paid.
    if (booking.status === "confirmed" || booking.payment_status === "paid") {
      console.warn("[PAYMENT] booking already complete:", {
        bookingId,
        status: booking.status,
        paymentStatus: booking.payment_status,
      });
      return json({ error: "Slot already booked" }, { status: 409 });
    }

    if (booking.checkout_session_id) {
      if (String(booking.checkout_session_id).startsWith("initializing:")) {
        console.warn("[PAYMENT] checkout already initializing:", { bookingId });
        return json({ error: "Checkout already initialized" }, { status: 409 });
      }

      const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
        .from("payments")
        .select("status, checkout_session_id")
        .eq("booking_id", booking.id)
        .eq("checkout_session_id", booking.checkout_session_id)
        .maybeSingle();

      if (existingPaymentError) {
        console.error("[PAYMENT] payment lookup failed:", existingPaymentError.message);
        return json({ error: "Failed to verify checkout session" }, { status: 500 });
      }

      if (existingPayment?.checkout_session_id && existingPayment.status === "pending") {
        console.warn("[PAYMENT] active pending session exists:", { bookingId });
        return json({ error: "Checkout already initialized" }, { status: 409 });
      }

      // Session is terminal (expired/failed/cancelled) — clear it so the lock below can proceed.
      const { error: clearError } = await supabaseAdmin
        .from("bookings")
        .update({ checkout_session_id: null })
        .eq("id", booking.id)
        .eq("checkout_session_id", booking.checkout_session_id);

      if (clearError) {
        console.error("[PAYMENT] failed to clear stale session:", clearError.message);
        return json({ error: "Failed to reset checkout session" }, { status: 500 });
      }

      console.log("[PAYMENT] cleared stale checkout session:", { bookingId });
    }

    const property = BOOKING_CATALOG[booking.property_id];
    if (!property) {
      console.error("[PAYMENT] unknown property_id:", booking.property_id);
      return json({ error: "Invalid booking property" }, { status: 500 });
    }

    // Safety check: downpayment_amount was written by computeBookingPrice() at booking
    // creation and is the authoritative amount to charge. Never recompute here.
    const downpaymentAmount = Number(booking.downpayment_amount);
    if (!Number.isFinite(downpaymentAmount) || downpaymentAmount <= 0) {
      console.error("[PAYMENT] invalid downpayment_amount:", {
        bookingId,
        downpaymentAmount: booking.downpayment_amount,
      });
      return json({ error: "Invalid booking payment amount" }, { status: 500 });
    }

    console.log("[PAYMENT] initiating checkout:", {
      bookingId,
      propertyId: booking.property_id,
      downpaymentAmount,
      lockedUntil: booking.locked_until,
    });

    const initializationToken = `initializing:${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    const { data: lockedBooking, error: lockError } = await supabaseAdmin
      .from("bookings")
      .update({ checkout_session_id: initializationToken })
      .eq("id", booking.id)
      .is("checkout_session_id", null)
      .gt("locked_until", nowIso)
      .neq("status", "confirmed")
      .neq("payment_status", "paid")
      .select("id")
      .maybeSingle();

    if (lockError) {
      return json({ error: "Failed to initialize checkout" }, { status: 500 });
    }

    if (!lockedBooking) {
      return json({ error: "Checkout already initialized" }, { status: 409 });
    }

    const baseUrl = getBaseUrl(request);
    try {
      const checkoutSession = await createCheckoutSession({
        amount: downpaymentAmount,
        propertyName: property.name,
        description: `${property.name} booking for ${booking.booking_date} (${booking.time_slot})`,
        bookingId: booking.id,
        guestName: booking.full_name,
        guestEmail: booking.email,
        guestPhone: booking.phone || booking.contact_number || "",
        successUrl: `${baseUrl}/booking/success?booking_id=${booking.id}`,
        cancelUrl: `${baseUrl}/booking/failed?booking_id=${booking.id}`,
      });

      const checkoutSessionId = checkoutSession?.id;
      const checkoutUrl = checkoutSession?.attributes?.checkout_url;

      if (!checkoutSessionId || !checkoutUrl) {
        await clearCheckoutInitializationLock(booking.id, initializationToken);
        return json({ error: "Failed to initialize payment checkout" }, { status: 502 });
      }

      const { data: updatedBooking, error: bookingUpdateError } = await supabaseAdmin
        .from("bookings")
        .update({ checkout_session_id: checkoutSessionId })
        .eq("id", booking.id)
        .eq("checkout_session_id", initializationToken)
        .select("id")
        .maybeSingle();

      if (bookingUpdateError || !updatedBooking) {
        await clearCheckoutInitializationLock(booking.id, initializationToken);
        return json({ error: "Failed to save checkout details" }, { status: 500 });
      }

      const paymentRecord = {
        booking_id: booking.id,
        checkout_session_id: checkoutSessionId,
        amount: downpaymentAmount,
        status: "pending",
      };

      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .upsert(paymentRecord, { onConflict: "booking_id" });

      if (paymentError) {
        return json({ error: "Failed to save checkout details" }, { status: 500 });
      }

      console.log("[PAYMENT] checkout session created:", {
        bookingId: booking.id,
        checkoutSessionId,
      });
      return json({ checkout_url: checkoutUrl }, { status: 200 });
    } catch (error: any) {
      await clearCheckoutInitializationLock(booking.id, initializationToken);
      
      // Check if it's a PayMongo configuration error
      const errorMsg = error?.message || "";
      if (errorMsg.includes("not configured") || errorMsg.includes("PayMongo")) {
        console.warn("PayMongo configuration missing:", errorMsg);
        return json(
          { error: "Payment system not available. Please contact support." },
          { status: 503 }
        );
      }
      
      // Re-throw unexpected errors
      throw error;
    }
  } catch (error) {
    console.error("payments/checkout failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
