import { supabaseAdmin } from "../_shared/supabaseAdmin";

export const config = {
  runtime: "edge",
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only allow authenticated admin requests
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.app_metadata?.role !== 'admin') {
      return json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    if (request.method === "GET") {
      const { data: inquiries, error } = await supabaseAdmin
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetchInquiries error:", error);
        return json({ error: "Failed to fetch inquiries" }, { status: 500 });
      }

      return json({ inquiries: inquiries || [] });
    }

    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return json({ error: "id is required" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("inquiries")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("deleteInquiry error:", error);
        return json({ error: "Failed to delete inquiry" }, { status: 500 });
      }

      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("admin/inquiries failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}