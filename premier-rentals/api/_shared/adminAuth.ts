import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Verifies the request has a valid Bearer token for an admin user.
 * Returns { user } on success, or a ready-to-return Response on failure.
 */
export async function requireAdmin(
  request: Request,
): Promise<{ user: User } | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (user.app_metadata?.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Forbidden: admin role required" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  return { user };
}
