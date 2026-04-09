import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdmin";

export type AdminRole = "admin" | "staff";

/**
 * Verifies the request has a valid Bearer token for an OWNER (admin role).
 * Returns { user, role } on success, or a ready-to-return Response on failure.
 */
export async function requireAdmin(
  request: Request,
): Promise<{ user: User; role: AdminRole } | Response> {
  const result = await verifyToken(request);
  if (result instanceof Response) return result;

  if (result.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Forbidden: owner role required" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  return result;
}

/**
 * Verifies the request has a valid Bearer token for either OWNER or STAFF.
 * Returns { user, role } on success, or a ready-to-return Response on failure.
 */
export async function requireStaff(
  request: Request,
): Promise<{ user: User; role: AdminRole } | Response> {
  const result = await verifyToken(request);
  if (result instanceof Response) return result;

  if (result.role !== "admin" && result.role !== "staff") {
    return new Response(
      JSON.stringify({ error: "Forbidden: admin or staff role required" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  return result;
}

/**
 * Internal: validates Bearer token and returns { user, role }.
 */
async function verifyToken(
  request: Request,
): Promise<{ user: User; role: AdminRole } | Response> {
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

  const role = user.app_metadata?.role as AdminRole | undefined;

  if (role !== "admin" && role !== "staff") {
    return new Response(
      JSON.stringify({ error: "Forbidden: insufficient role" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  return { user, role };
}
