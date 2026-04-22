import { json } from "../_shared/response";
import { supabaseAdmin } from "../_shared/supabaseAdmin";

export const config = { runtime: "edge" };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  let body: { key?: unknown; email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const { key, email, password } = body;

  // Key check happens server-side — never compiled into the JS bundle
  const secret = process.env.ADMIN_SIGNUP_KEY;
  if (!secret || typeof key !== "string" || key !== secret) {
    return json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return json({ error: "A valid email is required" }, { status: 400, headers: CORS_HEADERS });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return json({ error: "Password must be at least 6 characters" }, { status: 400, headers: CORS_HEADERS });
  }

  // Create the user via service role — bypasses email confirmation requirement
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const msg = createError.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("duplicate") || msg.includes("exists")) {
      return json({ error: "An account with this email already exists" }, { status: 409, headers: CORS_HEADERS });
    }
    console.error("signup createUser error:", createError);
    return json({ error: "Failed to create account" }, { status: 500, headers: CORS_HEADERS });
  }

  const userId = created.user?.id;
  if (!userId) {
    return json({ error: "Account created but user ID missing" }, { status: 500, headers: CORS_HEADERS });
  }

  // Insert profile row — ignoreDuplicates prevents overwriting an existing admin role
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, role: "user" }, { onConflict: "id", ignoreDuplicates: true });

  if (profileError) {
    console.error("signup profile upsert error:", profileError);
    // Non-fatal: user exists, profile can be created later
  }

  return json({ success: true }, { status: 201, headers: CORS_HEADERS });
}
