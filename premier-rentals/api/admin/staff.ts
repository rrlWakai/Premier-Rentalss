import { requireAdmin } from "../_shared/adminAuth";
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
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // All staff management is owner-only
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  // GET — list all staff users
  if (request.method === "GET") {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("listUsers error:", error);
      return json({ error: "Failed to fetch users" }, { status: 500 });
    }

    const staff = (data?.users ?? [])
      .filter((u) => u.app_metadata?.role === "staff")
      .map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

    return json({ staff });
  }

  // POST — create a new staff member
  if (request.method === "POST") {
    let body: { email?: unknown; password?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || typeof email !== "string") {
      return json({ error: "email is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return json(
        { error: "password is required and must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Check for existing user with same email
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const duplicate = existing?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (duplicate) {
      return json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: "staff" },
      });

    if (createError) {
      console.error("createUser error:", createError);
      return json({ error: "Failed to create staff user" }, { status: 500 });
    }

    return json(
      {
        user: {
          id: newUser.user?.id,
          email: newUser.user?.email,
          created_at: newUser.user?.created_at,
        },
      },
      { status: 201 },
    );
  }

  // DELETE — remove a staff member
  if (request.method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "id is required" }, { status: 400 });
    }

    // Safety: verify the target is a staff user, not an owner
    const { data: targetUser, error: fetchError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (fetchError || !targetUser?.user) {
      return json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.user.app_metadata?.role !== "staff") {
      return json(
        { error: "Cannot remove a non-staff user via this endpoint" },
        { status: 403 },
      );
    }

    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteError) {
      console.error("deleteUser error:", deleteError);
      return json({ error: "Failed to delete staff user" }, { status: 500 });
    }

    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
