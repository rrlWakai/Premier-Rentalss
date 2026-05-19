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

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
    let booking = null;
    let error = null;

    if (isUuid) {
      // 1. Primary Lookup: high-speed primary key index search
      const result = await supabaseAdmin
        .from("bookings")
        .select("id, status, payment_status, full_name, booking_date, time_slot")
        .eq("id", bookingId)
        .maybeSingle();
      
      booking = result.data;
      error = result.error;

      // 2. Fallback Lookup: if not found by id, search by checkout_session_id index
      if (!error && !booking) {
        const fallbackResult = await supabaseAdmin
          .from("bookings")
          .select("id, status, payment_status, full_name, booking_date, time_slot")
          .eq("checkout_session_id", bookingId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        booking = fallbackResult.data;
        error = fallbackResult.error;
      }
    } else {
      // 3. Alternate Lookup: search purely by checkout_session_id index (e.g. if PayMongo CS ID is passed)
      const sessionResult = await supabaseAdmin
        .from("bookings")
        .select("id, status, payment_status, full_name, booking_date, time_slot")
        .eq("checkout_session_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      booking = sessionResult.data;
      error = sessionResult.error;
    }

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
