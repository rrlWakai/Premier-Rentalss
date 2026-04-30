import { verifyPayMongoWebhookSignature } from "../_shared/paymongo";
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

function resolvePaymentAmount(eventPayload: any) {
  const eventType = eventPayload?.data?.attributes?.type;
  const eventData = eventPayload?.data?.attributes?.data;

  if (eventType === "payment.paid") {
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
  console.log("REQUEST METHOD:", request.method);

  if (request.method === "GET") {
    return json({ message: "Webhook active" }, { status: 200 });
  }

  if (request.method !== "POST") {
    return json({ received: true, error: "Method not allowed" }, { status: 200 });
  }

  try {
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get("paymongo-signature") ||
      request.headers.get("Paymongo-Signature");

    // FIX 3: Treat an invalid webhook signature as a hard failure.
    // The previous code logged a warning but continued processing, allowing any
    // unauthenticated HTTP request to trigger booking confirmation.
    const isValidSignature = await verifyPayMongoWebhookSignature(rawBody, signatureHeader);
    if (!isValidSignature) {
      console.error("[WEBHOOK] Signature validation failed — rejecting request.");
      // Return 200 so PayMongo does not keep retrying a rejected event,
      // but do NOT process any booking logic.
      return json({ received: true, error: "invalid_signature" }, { status: 200 });
    }

    let eventPayload;
    try {
      eventPayload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[WEBHOOK] JSON Parse Error:", parseError);
      return json({ received: true, error: "Invalid JSON body" }, { status: 200 });
    }

    const eventId = eventPayload?.data?.id as string | undefined;
    const eventType = eventPayload?.data?.attributes?.type as string | undefined;

    // FIX 2 (cont.): webhook reads booking_id — the same key checkout.ts stores
    // and BookingPages looks up. session_id is never the primary reference.
    const booking_id =
      eventPayload?.data?.attributes?.data?.attributes?.metadata?.booking_id ||
      eventPayload?.data?.attributes?.data?.attributes?.payments?.[0]?.attributes?.metadata
        ?.booking_id;

    console.log("WEBHOOK EVENT:", JSON.stringify(eventPayload, null, 2));
    console.log("EVENT TYPE:", eventType);
    console.log("BOOKING ID:", booking_id);

    if (!eventId || !eventType) {
      return json({ received: true, ignored: true }, { status: 200 });
    }

    if (eventType === "payment.paid" || eventType === "checkout_session.payment.paid") {
      if (!booking_id) {
        console.error("[WEBHOOK] Missing booking_id in metadata");
        return json({ received: true, error: "missing_booking_id" }, { status: 200 });
      }

      const paymentAmount = resolvePaymentAmount(eventPayload);

      const { data: session } = await supabaseAdmin
        .from("checkout_sessions")
        .select("booking_payload")
        .eq("booking_id", booking_id)
        .single();

      if (!session) {
        console.error("[CRITICAL] Session not found:", booking_id);
        return json({ received: true, error: "session_not_found" }, { status: 200 });
      }

      const payload = session.booking_payload;

      const insertData = {
        booking_id: payload.booking_id,
        property_id: payload.property_id,
        retreat_id: payload.retreat_id,
        booking_date: payload.booking_date,
        time_slot: payload.time_slot,
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        guests: payload.guests,
        num_guests: payload.num_guests ?? payload.guests,
        num_cars: payload.num_cars,
        total_amount: payload.total_amount,
        downpayment_amount: payload.downpayment_amount,
        status: "confirmed",
        payment_status: "paid",
        checkout_session_id: eventPayload?.data?.attributes?.data?.id || eventId,
      };

      const { error: insertError } = await supabaseAdmin.from("bookings").insert(insertData);

      if (insertError) {
        console.error("[CRITICAL] Booking insert failed:", insertError);
        await supabaseAdmin.from("failed_bookings").insert({
          checkout_session_id: eventPayload?.data?.attributes?.data?.id || eventId,
          payload: session.booking_payload,
          payment_amount: paymentAmount,
          reason: "insert_failed_or_duplicate",
          created_at: new Date().toISOString(),
        });
      }

      await supabaseAdmin
        .from("checkout_sessions")
        .update({ consumed: true })
        .eq("booking_id", booking_id);

      console.log("[WEBHOOK] booking_id:", booking_id);
      console.log("[WEBHOOK] payload:", payload);
      console.log("[WEBHOOK] insertData:", insertData);
    }

    return json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] webhook/paymongo failed", error);
    return json({ received: true, error: true }, { status: 200 });
  }
}