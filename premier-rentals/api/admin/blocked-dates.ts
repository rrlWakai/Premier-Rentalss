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
 * Admin Blocked Dates API - Handles GET (fetch), POST (add), and DELETE (remove) operations
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

    // GET - Fetch blocked dates (filtered by retreat_id if provided)
    if (request.method === "GET") {
      const url = new URL(request.url);
      const retreatId = url.searchParams.get("retreat_id");

      let query = supabaseAdmin.from("blocked_dates").select("*");

      if (retreatId) {
        query = query.eq("retreat_id", retreatId);
      }

      const { data: blockedDates, error } = await query.order("date", {
        ascending: true,
      });

      if (error) {
        console.error("Fetch blocked dates error:", error);
        return internalErrorResponse();
      }

      return successResponse({ blockedDates: blockedDates || [] });
    }

    // POST - Add new blocked date
    if (request.method === "POST") {
      const body = await request.json();
      const { retreatId, date, reason } = body;

      if (!retreatId || !date) {
        return errorResponse("Missing required fields: retreatId, date", 400);
      }

      // Validate retreat exists
      const { data: retreat, error: retreatError } = await supabaseAdmin
        .from("retreats")
        .select("id")
        .eq("id", retreatId)
        .single();

      if (retreatError || !retreat) {
        console.error("Retreat not found:", retreatId);
        return errorResponse("Retreat not found", 404);
      }

      // Check for duplicate blocked date
      const { data: existingBlock } = await supabaseAdmin
        .from("blocked_dates")
        .select("id")
        .eq("retreat_id", retreatId)
        .eq("date", date)
        .single();

      if (existingBlock) {
        return errorResponse("This date is already blocked", 409);
      }

      // Insert new blocked date
      const { data: blockedDate, error: insertError } = await supabaseAdmin
        .from("blocked_dates")
        .insert([
          {
            retreat_id: retreatId,
            date,
            reason: reason || "Blocked by admin",
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Insert blocked date error:", insertError);
        return internalErrorResponse();
      }

      return successResponse(blockedDate, 201);
    }

    // DELETE - Remove blocked date
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return errorResponse("Missing required field: id", 400);
      }

      // Verify blocked date exists
      const { data: existingBlock, error: fetchError } = await supabaseAdmin
        .from("blocked_dates")
        .select("id")
        .eq("id", id)
        .single();

      if (fetchError || !existingBlock) {
        console.error("Blocked date not found:", id);
        return errorResponse("Blocked date not found", 404);
      }

      // Delete blocked date
      const { error: deleteError } = await supabaseAdmin
        .from("blocked_dates")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Delete blocked date error:", deleteError);
        return internalErrorResponse();
      }

      return successResponse({ success: true });
    }

    return methodNotAllowedResponse();
  } catch (error) {
    console.error("admin/blocked-dates handler error:", error);
    return internalErrorResponse();
  }
}