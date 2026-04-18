import { requireStaff } from "../_shared/adminAuth";
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
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const role = auth.role;

  if (request.method === "GET") {
    const { data: inquiries, error } = await supabaseAdmin
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchInquiries error:", error);
      return json({ error: "Failed to fetch inquiries" }, { status: 500 });
    }

    return json({ inquiries: inquiries ?? [] });
  }

  if (request.method === "DELETE") {
    if (role !== "admin") {
      return json(
        { error: "Forbidden: Only owners can delete inquiries" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("inquiries").delete().eq("id", id);

    if (error) {
      console.error("deleteInquiry error:", error);
      return json({ error: "Failed to delete inquiry" }, { status: 500 });
    }

    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
