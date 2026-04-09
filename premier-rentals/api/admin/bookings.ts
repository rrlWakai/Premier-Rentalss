import { requireAdmin, requireStaff } from "../_shared/adminAuth";
import { json } from "../_shared/response";
import { supabaseAdmin } from "../_shared/supabaseAdmin";

export const config = {
  runtime: "edge",
};

const PAGE_SIZE = 50;

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Both owner and staff can read and (partially) update bookings.
  // DELETE is strictly owner-only and re-checks permissions inline below.
  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const role = auth.role;

  // GET - Fetch bookings with pagination
  if (request.method === "GET") {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? String(PAGE_SIZE), 10)),
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: bookings, error, count } = await supabaseAdmin
      .from("bookings")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Fetch bookings error:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json({ bookings: bookings ?? [], total: count ?? 0, page, limit });
  }

  // PATCH - Update booking (status or payment)
  if (request.method === "PATCH") {
    let body: { bookingId?: unknown; updates?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { bookingId, updates } = body;

    if (!bookingId || typeof updates !== "object" || updates === null) {
      return json({ error: "Missing required fields: bookingId, updates" }, { status: 400 });
    }

    // Validate bookingId exists
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, total_amount, downpayment_amount")
      .eq("id", bookingId)
      .single();

    if (fetchError || !existingBooking) {
      console.error("Booking not found:", bookingId);
      return json({ error: "Booking not found" }, { status: 404 });
    }

    // Allowlist: limit fields to avoid sneaky updates
    let ALLOWED_FIELDS: Set<string>;

    if (role === "admin") {
      // Owners can update everything
      ALLOWED_FIELDS = new Set([
        "status",
        "payment_status",
        "special_requests",
        "approved_at",
        "mode_of_payment",
      ]);
    } else {
      // Staff can only update basic booking status and remarks
      ALLOWED_FIELDS = new Set([
        "status",
        "special_requests",
        "approved_at",
      ]);
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates as Record<string, unknown>)) {
      if (ALLOWED_FIELDS.has(key)) sanitized[key] = value;
    }

    // paid_amount is a virtual helper field — use it to derive payment_status only
    const updatesObj = updates as Record<string, unknown>;
    if (updatesObj.paid_amount !== undefined) {
      const paidAmount = Number(updatesObj.paid_amount);
      if (Number.isFinite(paidAmount) && paidAmount >= 0) {
        sanitized.payment_status =
          paidAmount >= existingBooking.total_amount ? "paid" : "partial";
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return json({ error: "No valid update fields provided" }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update(sanitized)
      .eq("id", bookingId);

    if (updateError) {
      console.error("Update booking error:", updateError);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json({ success: true, bookingId });
  }

  // DELETE - Permanently remove a booking
  if (request.method === "DELETE") {
    // Re-verify that user is strictly 'admin' (owner), not just 'staff'
    if (role !== "admin") {
      return json(
        { error: "Forbidden: Only owners can delete bookings" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "Missing required field: id" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return json({ error: "Booking not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete booking error:", deleteError);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
