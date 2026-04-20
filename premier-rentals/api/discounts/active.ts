import { supabaseAdmin } from "../_shared/supabaseAdmin";

export const config = {
  runtime: "edge",
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...(init?.headers ?? {}),
    },
  });
}

export default async function handler(request: Request) {
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
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseAdmin
      .from("discounts")
      .select("name, percentage, applies_to, property_ids")
      .eq("active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("percentage", { ascending: false });

    if (error) {
      console.error("[DISCOUNTS] active fetch failed:", error.message);
      // Return empty list — a fetch failure must never break the page.
      return json({ discounts: [] }, { status: 200 });
    }

    return json({ discounts: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[DISCOUNTS] unexpected error:", err);
    return json({ discounts: [] }, { status: 200 });
  }
}
