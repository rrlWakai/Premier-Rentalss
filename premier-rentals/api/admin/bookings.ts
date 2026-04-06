import { supabaseAdmin } from "../_shared/supabaseAdmin";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  methodNotAllowedResponse,
  internalErrorResponse,
} from "../_shared/response";

export const config = {
  runtime: "edge",
};

/**
 * Admin Bookings API - Handles GET (fetch) and PATCH (update) operations
 * Authentication: Requires Bearer token with admin role
 * Service Role: Uses Supabase service role for unrestricted database access
 */
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

  // Validate Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorizedResponse();
  }

  try {
    // Verify user is authenticated and has admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      token
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return unauthorizedResponse();
    }

    // Check for admin role - DENY if not admin (403)
    if (user.app_metadata?.role !== "admin") {
      console.warn(`Non-admin user ${user.id} attempted admin access`);
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: admin role required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // GET - Fetch all bookings
    if (request.method === "GET") {
      const { data: bookings, error } = await supabaseAdmin
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch bookings error:", error);
        return internalErrorResponse();
      }

      return successResponse({ bookings: bookings || [] });
    }

    // PATCH - Update booking (status or payment)
    if (request.method === "PATCH") {
      const body = await request.json();
      const { bookingId, updates } = body;

      if (!bookingId || !updates) {
        return errorResponse(
          "Missing required fields: bookingId, updates",
          400
        );
      }

      // Validate bookingId exists
      const { data: existingBooking, error: fetchError } = await supabaseAdmin
        .from("bookings")
        .select("id, total_amount, downpayment_amount")
        .eq("id", bookingId)
        .single();

      if (fetchError || !existingBooking) {
        console.error("Booking not found:", bookingId);
        return errorResponse("Booking not found", 404);
      }

      // Allowlist: only these fields may be changed by an admin
      const ALLOWED_FIELDS = new Set([
        "status",
        "payment_status",
        "special_requests",
        "approved_at",
        "mode_of_payment",
      ]);

      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_FIELDS.has(key)) sanitized[key] = value;
      }

      // paid_amount is a virtual helper field — use it to derive payment_status only
      if (updates.paid_amount !== undefined) {
        const paidAmount = Number(updates.paid_amount);
        if (Number.isFinite(paidAmount) && paidAmount >= 0) {
          sanitized.payment_status =
            paidAmount >= existingBooking.total_amount ? "paid" : "partial";
        }
      }

      if (Object.keys(sanitized).length === 0) {
        return errorResponse("No valid update fields provided", 400);
      }

      // Update booking
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update(sanitized)
        .eq("id", bookingId);

      if (updateError) {
        console.error("Update booking error:", updateError);
        return internalErrorResponse();
      }

      return successResponse({ success: true, bookingId });
    }

    return methodNotAllowedResponse();
  } catch (error) {
    console.error("admin/bookings handler error:", error);
    return internalErrorResponse();
  }
}