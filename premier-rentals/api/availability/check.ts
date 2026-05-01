import { json } from "../_shared/response";
import { supabaseAdmin } from "../_shared/supabaseAdmin";

export const config = {
  runtime: "edge",
};

interface AvailabilityRequest {
  property_id: string;
  booking_date: string;
  time_slot: "day" | "night" | "overnight";
  rate_tier: string;
}

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only allow POST
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: AvailabilityRequest;
  try {
    const parsed = await request.json();
    body = {
      property_id: parsed.property_id,
      booking_date: parsed.booking_date,
      time_slot: parsed.time_slot,
      rate_tier: parsed.rate_tier,
    };
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { property_id, booking_date, time_slot, rate_tier } = body;

  // Validate required fields
  if (!property_id || !booking_date || !time_slot || !rate_tier) {
    return json(
      { error: "Missing required fields: property_id, booking_date, time_slot, rate_tier" },
      { status: 400 }
    );
  }

  try {
    // Check for existing confirmed bookings on this date/time_slot
    const { data: existingBookings, error: queryError } = await supabaseAdmin
      .from("bookings")
      .select("id, status, time_slot, rate_tier")
      .eq("retreat_id", property_id)
      .eq("booking_date", booking_date)
      .eq("time_slot", time_slot)
      .eq("rate_tier", rate_tier)
      .in("status", ["pending", "confirmed"]);

    if (queryError) {
      console.error("Availability check error:", queryError);
      return json({ error: "Already Booked" }, { status: 500 });
    }

    // If there are existing pending or confirmed bookings, slot is unavailable
    if (existingBookings && existingBookings.length > 0) {
      return json(
        {
          available: false,
          reason: `This slot already has ${existingBookings.length} booking(s). Please choose a different date or session.`,
        },
        { status: 200 }
      );
    }

    // Slot is available
    return json({ available: true }, { status: 200 });
  } catch (err) {
    console.error("Availability check exception:", err);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}