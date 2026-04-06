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

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return json(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const bookingId = url.searchParams.get("booking_id") || "";

    if (!bookingId) {
      return json({ error: "booking_id is required" }, { status: 400 });
    }

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, status, payment_status, locked_until, total_amount, downpayment_amount, property_id, booking_date, time_slot, full_name",
      )
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return json({ error: "Booking not found" }, { status: 404 });
    }

    return json(
      {
        booking_id: booking.id,
        status: booking.status,
        payment_status: booking.payment_status,
        locked_until: booking.locked_until,
        total_amount: booking.total_amount,
        downpayment_amount: booking.downpayment_amount ?? 0,
        property_id: booking.property_id ?? null,
        booking_date: booking.booking_date ?? null,
        time_slot: booking.time_slot ?? null,
        guest_name: booking.full_name,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("bookings/status failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
