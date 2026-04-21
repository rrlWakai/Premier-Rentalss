import { json } from "../_shared/response";
import { supabaseAdmin } from "../_shared/supabaseAdmin";

export const config = { runtime: "edge" };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Step 1: Read Bearer token from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // Step 2: Verify the token using the service-role client (validates any JWT)
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 3: Check profiles table — role must be 'admin'
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    return json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  // Step 4: Parse and validate request body
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email } = body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return json({ error: "A valid email is required" }, { status: 400 });
  }

  // Step 5: Send invite via Supabase Admin API (service role only — never exposed to browser)
  const { data, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  redirectTo: "https://premier-rentalss-7x33.vercel.app/auth/callback",
});

  if (inviteError) {
    console.error("inviteUserByEmail:", inviteError);
    return json(
      { error: inviteError.message || "Failed to send invite" },
      { status: 500 },
    );
  }

  return json({ success: true, userId: data.user?.id });
}
