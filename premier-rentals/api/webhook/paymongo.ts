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

function resolveBookingType(timeSlot: unknown) {
  if (timeSlot === "daytime" || timeSlot === "day") return "day";
  if (timeSlot === "nighttime" || timeSlot === "night") return "night";
  if (timeSlot === "overnight") return "overnight";
  return "day";
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
    const paymongoCheckoutSessionId =
      eventPayload?.data?.attributes?.data?.id as string | undefined;
    const metadataBookingId =
      eventPayload?.data?.attributes?.data?.attributes?.metadata?.booking_id ||
      eventPayload?.data?.attributes?.data?.attributes?.payments?.[0]?.attributes?.metadata
        ?.booking_id;

    console.log("WEBHOOK EVENT:", JSON.stringify(eventPayload, null, 2));
    console.log("EVENT TYPE:", eventType);
    console.log("PAYMONGO CHECKOUT SESSION ID:", paymongoCheckoutSessionId);
    console.log("METADATA BOOKING ID:", metadataBookingId);

    if (!eventId || !eventType) {
      return json({ received: true, ignored: true }, { status: 200 });
    }

    // Idempotency: ignore duplicate event IDs before doing any inserts.
    const { data: existingEvent } = await supabaseAdmin
      .from("payment_webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      return json({ received: true, ignored: "duplicate_event" }, { status: 200 });
    }

    // Persist the raw event for audit trail as soon as possible.
    const { error: eventInsertError } = await supabaseAdmin
      .from("payment_webhook_events")
      .insert({
        event_id: eventId,
        event_type: eventType,
        payload: eventPayload,
      });

    if (eventInsertError) {
      console.error("[WEBHOOK] Failed to persist webhook event:", eventInsertError);
      return json({ received: true, error: "event_persist_failed" }, { status: 200 });
    }

    if (eventType === "payment.paid" || eventType === "checkout_session.payment.paid") {
      if (!paymongoCheckoutSessionId && !metadataBookingId) {
        console.error("[WEBHOOK] Missing checkout session references");
        return json({ received: true, error: "missing_checkout_reference" }, { status: 200 });
      }

      const paymentAmount = resolvePaymentAmount(eventPayload);

      // Primary lookup: PayMongo checkout session ID from the event.
      // Fallbacks: metadata booking_id against checkout_sessions.booking_id,
      // and metadata booking_id against checkout_sessions.checkout_session_id
      // for legacy rows.
      const sessionFilters: string[] = [];
      if (paymongoCheckoutSessionId) {
        sessionFilters.push(`checkout_session_id.eq.${paymongoCheckoutSessionId}`);
      }
      if (metadataBookingId) {
        sessionFilters.push(`booking_id.eq.${metadataBookingId}`);
        sessionFilters.push(`checkout_session_id.eq.${metadataBookingId}`);
      }

      const { data: session, error: sessionLookupError } = await supabaseAdmin
        .from("checkout_sessions")
        .select("id, booking_id, checkout_session_id, booking_payload, consumed")
        .or(sessionFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionLookupError || !session) {
        console.error("[CRITICAL] Session not found:", sessionLookupError);
        return json({ received: true, error: "session_not_found" }, { status: 200 });
      }

      const payload = session.booking_payload as Record<string, any>;

      const insertData = {
        property_id: payload.property_id,
        retreat_id: payload.retreat_id,
        booking_date: payload.booking_date,
        time_slot: payload.time_slot,
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        guests: payload.guests ?? payload.num_guests,
        num_guests: payload.num_guests ?? payload.guests,
        num_cars: payload.num_cars ?? payload.cars ?? 0,
        total_amount: payload.total_amount,
        downpayment_amount: payload.downpayment_amount,
        booking_type: payload.booking_type ?? resolveBookingType(payload.time_slot),
        special_requests: payload.special_requests ?? null,
        rate_tier: payload.rate_tier ?? null,
        mode_of_payment: payload.mode_of_payment ?? null,
      };

      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc("atomic_webhook_booking", {
          p_session_id: session.id,
          p_insert_data: insertData,
          p_paymongo_cs_id: paymongoCheckoutSessionId || session.checkout_session_id,
          p_event_id: eventId,
        });

      if (rpcError) {
        console.error("[CRITICAL] atomic_webhook_booking RPC failed:", rpcError);
        await supabaseAdmin.from("failed_bookings").insert({
          checkout_session_id: paymongoCheckoutSessionId || session.checkout_session_id || eventId,
          booking_payload: session.booking_payload,
          amount: paymentAmount,
          user_email: payload.email ?? null,
          reason: "rpc_failed",
          created_at: new Date().toISOString(),
        });
        return json({ received: true, error: "booking_rpc_failed" }, { status: 200 });
      }

      const result = rpcResult as { status: string; booking_id?: string };

      if (result.status === "already_consumed") {
        console.log("[WEBHOOK] Session already consumed — idempotent skip.");
        return json({ received: true, ignored: "session_already_consumed" }, { status: 200 });
      }

      console.log("[WEBHOOK] booking_id:", result.booking_id);
      console.log("[WEBHOOK] payload:", payload);
      console.log("[WEBHOOK] insertData:", insertData);
    }

    return json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] webhook/paymongo failed", error);
    return json({ received: true, error: true }, { status: 200 });
  }
}
