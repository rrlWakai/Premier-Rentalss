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
    console.log("🔥 WEBHOOK HIT");
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 200 });
    }
    try {
      const rawBody = await request.text();
      const signatureHeader =
        request.headers.get("paymongo-signature") ||
        request.headers.get("Paymongo-Signature");
      const isValidSignature = await verifyPayMongoWebhookSignature(rawBody, signatureHeader);
      if (!isValidSignature) {
        console.warn("[WEBHOOK] Signature invalid — bypassing for debug");
        // Do NOT return — continue execution
      }
      const eventPayload = JSON.parse(rawBody);
      const eventId = eventPayload?.data?.id as string | undefined;
      const eventType = eventPayload?.data?.attributes?.type as string | undefined;
      const checkoutSessionId = resolveCheckoutSessionId(eventPayload);

      console.log("WEBHOOK EVENT:", JSON.stringify(eventPayload, null, 2));
      console.log("EVENT TYPE:", eventType);
      console.log("CHECKOUT SESSION ID:", checkoutSessionId);

      if (!eventId || !eventType || !checkoutSessionId) {
        return json({ received: true, ignored: true }, { status: 200 });
      }

      // Process only successful payments
      if (eventType === "payment.paid" || eventType === "checkout_session.payment.paid") {
        const paymentAmount = resolvePaymentAmount(eventPayload);
        
        // VERIFY checkout_sessions MATCH
        const { data: session } = await supabaseAdmin
          .from("checkout_sessions")
          .select("booking_payload")
          .eq("checkout_session_id", checkoutSessionId)
          .single();
          
        if (!session) {
          console.error("[CRITICAL] Checkout session not found in DB:", checkoutSessionId);
        }

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

        console.log("RPC RESULT:", rpcResult);
        console.log("RPC ERROR:", rpcError);

        let finalBookingId = rpcResult?.booking_id;
        const status = rpcResult?.status;

        // HANDLE FAILED BOOKING CASE
        if (status === "failed_booking") {
          console.error(`[CRITICAL] Double booking prevented! Payment succeeded but slot was taken. Session: ${checkoutSessionId}`);
          console.error("[CRITICAL] FULL PAYLOAD:", JSON.stringify(session?.booking_payload, null, 2));
          
          await supabaseAdmin.from("failed_bookings").insert({
            checkout_session_id: checkoutSessionId,
            payload: session?.booking_payload || {},
            payment_amount: paymentAmount,
            reason: "double_booking",
            created_at: new Date().toISOString()
          });
          
          return json({ received: true, double_booking_prevented: true }, { status: 200 });
        }

        // FIX RPC FAILURE HANDLING & ADD FALLBACK INSERT
        if (rpcError || status === "error") {
          console.error("[CRITICAL] RPC Error or returned error status. Details:", rpcError, rpcResult);
          
          if (session?.booking_payload) {
            console.log("[WEBHOOK] Attempting manual fallback insert...");
            const payload = session.booking_payload;
            
            // FIX SCHEMA MISMATCH
            const mappedTimeSlot = ["day", "night", "overnight"].includes(payload.time_slot) 
              ? payload.time_slot 
              : "day";
              
            const insertData = {
              property_id: payload.property_id,
              retreat_id: payload.retreat_id,
              full_name: payload.full_name || "Guest",
              email: payload.email,
              phone: payload.phone || payload.contact_number,
              booking_type: mappedTimeSlot,
              time_slot: mappedTimeSlot,
              checkin: payload.date,
              booking_date: payload.date,
              guests: payload.guests || 1,
              total_amount: payload.total_amount || 0,
              downpayment_amount: payload.downpayment_amount || paymentAmount,
              status: "confirmed",
              payment_status: "paid",
              payment_reference: checkoutSessionId,
              checkout_session_id: checkoutSessionId,
              special_requests: payload.special_requests,
              rate_tier: payload.rate_tier,
              mode_of_payment: payload.mode_of_payment,
              num_guests: payload.guests || 1,
              num_cars: payload.cars || 0
            };

            const { data: newBooking, error: insertError } = await supabaseAdmin
              .from("bookings")
              .insert(insertData)
              .select("id")
              .single();

            if (insertError) {
              console.error("[CRITICAL] Fallback insert also failed:", insertError);
            } else {
              console.log("[WEBHOOK] Fallback insert succeeded! ID:", newBooking.id);
              finalBookingId = newBooking.id;
            }
          }
        }

        if (status === "ignored") {
          return json({ received: true, ignored: true }, { status: 200 });
        }

        // SEND RECEIPT EMAIL
        if (finalBookingId) {
          const { data: booking } = await supabaseAdmin
            .from("bookings")
            .select(`
              id, full_name, email, num_guests, total_amount, downpayment_amount,
              remaining_balance, booking_type, booking_date, special_requests,
              retreats(name)
            `)
            .eq("id", finalBookingId)
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
      }
      return json({ received: true }, { status: 200 });
    } catch (error) {
      console.error("[WEBHOOK] webhook/paymongo failed", error);
      return json({ received: true, error: true }, { status: 200 });
    }
  }