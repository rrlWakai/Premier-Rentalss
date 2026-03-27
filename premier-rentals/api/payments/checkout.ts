import { BOOKING_CATALOG } from "../_shared/catalog";
import { createCheckoutSession } from "../_shared/paymongo";
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
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const bookingId = typeof body?.booking_id === "string" ? body.booking_id : "";

    if (!bookingId) {
      return json({ error: "booking_id is required" }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return json({ error: "Booking not found" }, { status: 404 });
    }

    if (!booking.locked_until || new Date(booking.locked_until).getTime() <= Date.now()) {
      return json({ error: "Booking expired" }, { status: 410 });
    }

    if (booking.status === "confirmed" || booking.payment_status === "paid") {
      return json({ error: "Slot already booked" }, { status: 409 });
    }

    if (booking.checkout_session_id) {
      const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
        .from("payments")
        .select("status, checkout_session_id")
        .eq("booking_id", booking.id)
        .eq("checkout_session_id", booking.checkout_session_id)
        .maybeSingle();

      if (existingPaymentError) {
        return json({ error: "Failed to verify checkout session" }, { status: 500 });
      }

      if (existingPayment?.checkout_session_id && existingPayment.status === "pending") {
        return json({ error: "Checkout already initialized" }, { status: 409 });
      }
    }

    const property = BOOKING_CATALOG[booking.property_id];
    if (!property) {
      return json({ error: "Invalid booking property" }, { status: 500 });
    }

    const baseUrl = getBaseUrl(request);
    const checkoutSession = await createCheckoutSession({
      amount: Number(booking.total_amount),
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
      return json({ error: "Failed to initialize payment checkout" }, { status: 502 });
    }

    const paymentUpsert = {
      booking_id: booking.id,
      checkout_session_id: checkoutSessionId,
      amount: booking.total_amount,
      status: "pending",
    };

    const [{ error: paymentError }, { error: bookingUpdateError }] = await Promise.all([
      supabaseAdmin.from("payments").insert([paymentUpsert]),
      supabaseAdmin
        .from("bookings")
        .update({ checkout_session_id: checkoutSessionId })
        .eq("id", booking.id),
    ]);

    if (paymentError || bookingUpdateError) {
      return json({ error: "Failed to save checkout details" }, { status: 500 });
    }

    return json({ checkout_url: checkoutUrl }, { status: 200 });
  } catch (error) {
    console.error("payments/checkout failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
