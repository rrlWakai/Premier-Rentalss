import { requireStaff } from "../_shared/adminAuth";
import { json } from "../_shared/response";
import { supabaseAdmin } from "../_shared/supabaseAdmin";

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request) {
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

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;

  if (request.method === "GET") {
    const { data: discounts, error } = await supabaseAdmin
      .from("discounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch discounts error:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json({ discounts: discounts ?? [] }, { status: 200 });
  }

  if (request.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { data: discount, error } = await supabaseAdmin
      .from("discounts")
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error("Create discount error:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json({ discount }, { status: 200 });
  }

  if (request.method === "PATCH") {
    let body: Record<string, unknown> & { id?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, ...updates } = body;
    if (!id || typeof id !== "string") {
      return json({ error: "id is required" }, { status: 400 });
    }

    const { data: discount, error } = await supabaseAdmin
      .from("discounts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update discount error:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json({ discount }, { status: 200 });
  }

  if (request.method === "DELETE") {
    let body: { id?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id } = body;
    if (!id || typeof id !== "string") {
      return json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("discounts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete discount error:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }

    return json({ success: true }, { status: 200 });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
