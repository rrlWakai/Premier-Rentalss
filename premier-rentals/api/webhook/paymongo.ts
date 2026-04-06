import { verifyPayMongoWebhookSignature } from "../_shared/paymongo";
import { supabaseAdmin } from "../_shared/supabaseAdmin";
import { sendBookingReceipt, type BookingReceiptData } from "../_shared/email";

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

async function resolveBookingIdFromEvent(eventPayload: any) {
  const eventType = eventPayload?.data?.attributes?.type;
  const eventData = eventPayload?.data?.attributes?.data;

  const metadataBookingId =
    eventData?.attributes?.metadata?.booking_id ||
    eventData?.attributes?.payment_intent?.attributes?.metadata?.booking_id ||
    eventData?.attributes?.payments?.[0]?.attributes?.metadata?.booking_id ||
    eventData?.attributes?.metadata?.bookingId;

  if (metadataBookingId) return metadataBookingId as string;

  const checkoutSessionId =
    eventType?.startsWith("checkout_session") ? eventData?.id : null;

  if (checkoutSessionId) {
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("booking_id")
      .eq("checkout_session_id", checkoutSessionId)
      .maybeSingle();

    if (payment?.booking_id) return payment.booking_id as string;
  }

  return null;
}

function resolveCheckoutSessionId(eventPayload: any) {
  const eventType = eventPayload?.data?.attributes?.type;
  const eventData = eventPayload?.data?.attributes?.data;

  if (eventType?.startsWith("checkout_session")) {
    return eventData?.id ?? null;
  }

  return (
    eventData?.attributes?.checkout_session_id ||
    eventData?.attributes?.metadata?.checkout_session_id ||
    null
  );
}

async function markPaymentState(params: {
  bookingId: string;
  paymentStatus: "paid" | "failed";
  bookingStatus: "confirmed" | "cancelled";
  checkoutSessionId: string;
}) {
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("id, status, payment_status, checkout_session_id")
    .eq("id", params.bookingId)
    .single();

  if (bookingError || !booking) return;

  if (!booking.checkout_session_id || booking.checkout_session_id !== params.checkoutSessionId) {
    return;
  }

  const paymentUpdate = supabaseAdmin
    .from("payments")
    .update({ status: params.paymentStatus })
    .eq("booking_id", params.bookingId)
    .eq("checkout_session_id", params.checkoutSessionId);

  const bookingUpdate = supabaseAdmin
    .from("bookings")
    .update({
      payment_status: params.paymentStatus,
      status: params.bookingStatus,
      locked_until: null,
    })
    .eq("id", params.bookingId)
    .eq("checkout_session_id", params.checkoutSessionId);

  await Promise.all([paymentUpdate, bookingUpdate]);
}

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const rawBody = await request.text();
  const signatureHeader =
    request.headers.get("paymongo-signature") ||
    request.headers.get("Paymongo-Signature");

  const isValidSignature = await verifyPayMongoWebhookSignature(rawBody, signatureHeader);
  if (!isValidSignature) {
    return json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const eventPayload = JSON.parse(rawBody);
    const eventId = eventPayload?.data?.id as string | undefined;
    const eventType = eventPayload?.data?.attributes?.type as string | undefined;
    const bookingId = await resolveBookingIdFromEvent(eventPayload);
    const checkoutSessionId = resolveCheckoutSessionId(eventPayload);

    if (!eventId || !bookingId || !eventType || !checkoutSessionId) {
      return json({ received: true, ignored: true }, { status: 200 });
    }

    const { error: eventInsertError } = await supabaseAdmin
      .from("payment_webhook_events")
      .insert([
        {
          event_id: eventId,
          event_type: eventType,
          booking_id: bookingId,
          payload: eventPayload,
        },
      ]);

    if (eventInsertError) {
      const message = eventInsertError.message || "";
      if (
        message.includes("duplicate key") ||
        message.includes("unique constraint") ||
        message.includes("payment_webhook_events_event_id_key")
      ) {
        return json({ received: true, duplicate: true }, { status: 200 });
      }

      throw eventInsertError;
    }

    if (eventType === "payment.paid" || eventType === "checkout_session.payment.paid") {
      await markPaymentState({
        bookingId,
        paymentStatus: "paid",
        bookingStatus: "confirmed",
        checkoutSessionId,
      });

      // Fetch booking details to send receipt email
      const { data: booking } = await supabaseAdmin
        .from("bookings")
        .select(
          `id, full_name, email, num_guests, total_amount, downpayment_amount,
           remaining_balance, booking_type, booking_date, special_requests,
           retreats(name)`
        )
        .eq("id", bookingId)
        .single();

      if (booking) {
        // Supabase .single() with a join returns retreats as a plain object, not an array
        const retreatRow = booking.retreats as { name?: string } | null;
        const receiptData: BookingReceiptData = {
          bookingId: booking.id,
          customerName: booking.full_name,
          customerEmail: booking.email,
          propertyName: retreatRow?.name ?? "Premier Rentals",
          checkInDate: booking.booking_date,
          bookingType: booking.booking_type,
          guests: booking.num_guests || 1,
          totalAmount: parseFloat(booking.total_amount) || 0,
          downpaymentAmount: parseFloat(booking.downpayment_amount) || 0,
          remainingBalance: parseFloat(booking.remaining_balance) || 0,
          specialRequests: booking.special_requests,
        };

        // Fire and forget — do not block the webhook response
        sendBookingReceipt(receiptData).catch((err) => {
          console.error("Failed to send receipt email:", err);
        });
      }
    }

    if (eventType === "payment.failed" || eventType === "checkout_session.payment.failed") {
      const { data: booking } = await supabaseAdmin
        .from("bookings")
        .select("payment_status, status, checkout_session_id")
        .eq("id", bookingId)
        .single();

      if (
        booking &&
        booking.checkout_session_id === checkoutSessionId &&
        booking.payment_status !== "paid" &&
        booking.status !== "confirmed"
      ) {
        await markPaymentState({
          bookingId,
          paymentStatus: "failed",
          bookingStatus: "cancelled",
          checkoutSessionId,
        });
      }
    }

    return json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("webhook/paymongo failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
