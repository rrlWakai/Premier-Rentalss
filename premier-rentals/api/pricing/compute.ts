import { BOOKING_CATALOG } from "../_shared/catalog";
import { computeBookingPrice, PricingError } from "../_shared/pricing";
import { getActiveDiscount } from "../_shared/discounts";

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
  if (request.method === "OPTIONS") {
    return json(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { property_id, rate_tier, rate_label, reservation_date, guests } =
      body ?? {};

    if (
      typeof property_id !== "string" ||
      !property_id ||
      typeof rate_tier !== "string" ||
      !rate_tier ||
      typeof rate_label !== "string" ||
      !rate_label ||
      typeof reservation_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(reservation_date) ||
      typeof guests !== "number" ||
      !Number.isInteger(guests) ||
      guests < 1
    ) {
      return json({ error: "Invalid input" }, { status: 400 });
    }

    if (!BOOKING_CATALOG[property_id]) {
      return json({ error: "Invalid property selection." }, { status: 400 });
    }

    const appliedDiscount = await getActiveDiscount(reservation_date, property_id, rate_label);

    // computeBookingPrice throws PricingError for validation failures (unknown
    // tier/label, guest limit exceeded, etc.) and plain Error for unexpected bugs.
    const breakdown = computeBookingPrice({
      propertyId: property_id,
      rateTier: rate_tier,
      rateLabel: rate_label,
      reservationDate: reservation_date,
      guests,
      appliedDiscount,
    });

    return json(breakdown, { status: 200 });
  } catch (error) {
    if (error instanceof PricingError) {
      // Known validation error — tell the frontend what went wrong.
      return json({ error: error.message }, { status: 400 });
    }
    console.error("[PRICING] compute unexpected error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
