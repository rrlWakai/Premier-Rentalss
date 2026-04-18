import {  requireStaff } from "../_shared/adminAuth";
import { json } from "../_shared/response";
import { supabaseAdmin } from "../_shared/supabaseAdmin";

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const role = auth.role;

  // GET - Fetch blocked dates (filtered by retreat_id if provided)
  if (request.method === "GET") {
    const url = new URL(request.url);
    const retreatId = url.searchParams.get("retreat_id");

    let query = supabaseAdmin.from("blocked_dates").select("*");
    if (retreatId) {
      query = query.eq("retreat_id", retreatId);
    }

    const { data: blockedDates, error } = await query.order("date", { ascending: true });

    if (error) {
      console.error("Fetch blocked dates error:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json({ blockedDates: blockedDates ?? [] });
  }

  // POST - Add new blocked date
  if (request.method === "POST") {
    if (role !== "admin") {
      return json(
        { error: "Forbidden: Only owners can block dates" },
        { status: 403 }
      );
    }

    let body: { retreatId?: unknown; date?: unknown; reason?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { retreatId, date, reason } = body;

    if (!retreatId || !date) {
      return json({ error: "Missing required fields: retreatId, date" }, { status: 400 });
    }

    // Validate retreat exists
    const { data: retreat, error: retreatError } = await supabaseAdmin
      .from("retreats")
      .select("id")
      .eq("id", retreatId)
      .single();

    if (retreatError || !retreat) {
      console.error("Retreat not found:", retreatId);
      return json({ error: "Retreat not found" }, { status: 404 });
    }

    // Check for duplicate blocked date
    const { data: existingBlock } = await supabaseAdmin
      .from("blocked_dates")
      .select("id")
      .eq("retreat_id", retreatId)
      .eq("date", date)
      .single();

    if (existingBlock) {
      return json({ error: "This date is already blocked" }, { status: 409 });
    }

    const { data: blockedDate, error: insertError } = await supabaseAdmin
      .from("blocked_dates")
      .insert([{ retreat_id: retreatId, date, reason: reason || "Blocked by admin" }])
      .select()
      .single();

    if (insertError) {
      console.error("Insert blocked date error:", insertError);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json(blockedDate, { status: 201 });
  }

  // DELETE - Remove blocked date
  if (request.method === "DELETE") {
    if (role !== "admin") {
      return json(
        { error: "Forbidden: Only owners can unblock dates" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "Missing required field: id" }, { status: 400 });
    }

    const { data: existingBlock, error: fetchError } = await supabaseAdmin
      .from("blocked_dates")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingBlock) {
      console.error("Blocked date not found:", id);
      return json({ error: "Blocked date not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("blocked_dates")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete blocked date error:", deleteError);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
