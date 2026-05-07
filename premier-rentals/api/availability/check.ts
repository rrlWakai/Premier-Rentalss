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

// Frontend sends "day"/"night"/"overnight"
// DB enum expects "daytime"/"nighttime"/"overnight"
function toDbTimeSlot(slot: string): string {
  if (slot === "day") return "daytime";
  if (slot === "night") return "nighttime";
  return "overnight";
}

export default async function handler(request: Request) {
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

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: AvailabilityRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { property_id, booking_date, time_slot, rate_tier } = body;

  if (!property_id || !booking_date || !time_slot || !rate_tier) {
    return json(
      { error: "Missing required fields: property_id, booking_date, time_slot, rate_tier" },
      { status: 400 }
    );
  }

  try {
    const dbSlot = toDbTimeSlot(time_slot);

    const { data: retreat, error: retreatError } = await supabaseAdmin
      .from("retreats")
      .select("id")
      .eq("slug", property_id)
      .maybeSingle();

    if (retreatError || !retreat) {
      return json({ error: "Property not found" }, { status: 404 });
    }

    const { data: blockedDate, error: blockedError } = await supabaseAdmin
      .from("blocked_dates")
      .select("id")
      .eq("retreat_id", retreat.id)
      .eq("date", booking_date)
      .maybeSingle();

    if (blockedError) {
      console.error("Blocked date check error:", blockedError);
      return json({ error: "Internal server error", detail: blockedError.message }, { status: 500 });
    }

    if (blockedDate) {
      return json(
        {
          available: false,
          reason: "This date is blocked by admin. Please choose a different date.",
        },
        { status: 200 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("id, status, time_slot, rate_tier")
      .eq("property_id", property_id)          // ← text column, slug works directly
      .eq("booking_date", booking_date)
      .eq("time_slot", dbSlot)                  // ← mapped to "daytime"/"nighttime"/"overnight"
      .in("status", ["pending", "confirmed"]);   // ← both enum values now exist

    if (error) {
      console.error("Availability check error:", error);
      return json({ error: "Internal server error", detail: error.message }, { status: 500 });
    }

    if (data && data.length > 0) {
      return json(
        {
          available: false,
          reason: "This date and session is already booked. Please choose a different date or session.",
        },
        { status: 200 }
      );
    }

    return json({ available: true }, { status: 200 });
  } catch (err) {
    console.error("Availability check exception:", err);
    return json({ error: "Internal server error", detail: String(err) }, { status: 500 });
  }
}
