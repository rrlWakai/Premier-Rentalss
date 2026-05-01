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
        "id, status, payment_status, full_name, booking_date, time_slot",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!booking) {
      return new Response(JSON.stringify({ status: "pending" }), { status: 202 });
    }

    return new Response(
      JSON.stringify({ status: "confirmed", booking }),
      { status: 200 },
    );
  } catch (error) {
    console.error("bookings/status failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
