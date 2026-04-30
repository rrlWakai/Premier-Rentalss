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
function resolvePaymentAmount(eventPayload: any) {
  const eventType = eventPayload?.data?.attributes?.type;
  const eventData = eventPayload?.data?.attributes?.data;
  if (eventType === "payment.paid") {
    // Paymongo amount is in cents
    return (eventData?.attributes?.amount || 0) / 100;
  }
  
  if (eventType === "checkout_session.payment.paid") {
    const payments = eventData?.attributes?.payments;
    if (payments && payments.length > 0) {
      return (payments[0]?.attributes?.amount || 0) / 100;
    }
  }
  
  return 0;
}
export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get("paymongo-signature") ||
      request.headers.get("Paymongo-Signature");
    const isValidSignature = await verifyPayMongoWebhookSignature(rawBody, signatureHeader);
    if (!isValidSignature) {
      return json({ error: "Invalid webhook signature" }, { status: 401 });
    }
    const eventPayload = JSON.parse(rawBody);
    const eventId = eventPayload?.data?.id as string | undefined;
    const eventType = eventPayload?.data?.attributes?.type as string | undefined;
    const checkoutSessionId = resolveCheckoutSessionId(eventPayload);
    if (!eventId || !eventType || !checkoutSessionId) {
      return json({ received: true, ignored: true }, { status: 200 });
    }
    // Process only successful payments
    if (eventType === "payment.paid" || eventType === "checkout_session.payment.paid") {
      const paymentAmount = resolvePaymentAmount(eventPayload);
      
      // Atomic processing via stored procedure
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        "process_webhook_booking",
        {
          p_event_id: eventId,
          p_event_type: eventType,
          p_checkout_session_id: checkoutSessionId,
          p_payment_amount: paymentAmount,
          p_payment_status: "paid",
          p_full_event_payload: eventPayload
        }
      );
      if (rpcError) {
        console.error("[WEBHOOK] RPC Error:", rpcError.message);
        return json({ received: true, error: true }, { status: 200 });
      }
      console.log("[WEBHOOK] Process result:", rpcResult);
      const status = rpcResult?.status;
      switch (status) {
        case "ignored":
          return json({ received: true, ignored: true }, { status: 200 });
        case "error":
          console.error("[WEBHOOK] RPC returned error status:", rpcResult);
          return json({ received: true, error: true }, { status: 200 });
        case "failed_booking":
          console.error(`[CRITICAL] Double booking prevented! Payment succeeded but slot was taken. Session: ${checkoutSessionId}`);
          return json({ received: true, double_booking_prevented: true }, { status: 200 });
        case "success":
          if (rpcResult.booking_id) {
            const bookingId = rpcResult.booking_id;
            const { data: booking } = await supabaseAdmin
              .from("bookings")
              .select(`
                id, full_name, email, num_guests, total_amount, downpayment_amount,
                remaining_balance, booking_type, booking_date, special_requests,
                retreats(name)
              `)
              .eq("id", bookingId)
              .single();
            if (booking) {
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
              try {
                await sendBookingReceipt(receiptData);
              } catch (err) {
                console.error("[WEBHOOK] Failed to send receipt email:", err);
              }
            }
          }
          break;
      }
    }
    return json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] webhook/paymongo failed", error);
    return json({ received: true, error: true }, { status: 200 });
  }
}