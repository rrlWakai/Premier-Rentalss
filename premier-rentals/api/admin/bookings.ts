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

      // If paid_amount provided, calculate remaining_balance server-side
      if (updates.paid_amount !== undefined) {
        const paidAmount = Number(updates.paid_amount);
        if (Number.isFinite(paidAmount) && paidAmount >= 0) {
          updates.remaining_balance = existingBooking.total_amount - paidAmount;
        }
        delete updates.paid_amount; // Remove from updates - was just for calculation
      }

      // Update booking
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update(updates)
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