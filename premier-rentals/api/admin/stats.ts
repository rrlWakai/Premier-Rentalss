import { requireAdmin, requireStaff } from "../_shared/adminAuth";
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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const role = auth.role;

  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("status, payment_status, total_amount, num_guests");

  if (bookingsError) {
    console.error("fetchStats error:", bookingsError);
    return json({ error: "Failed to fetch statistics" }, { status: 500 });
  }

  const totalRevenue =
    role === "admin"
      ? (bookings
          ?.filter((b) => b.payment_status === "paid")
          .reduce((sum, b) => sum + (b.total_amount || 0), 0) ?? 0)
      : 0;

  const confirmed = bookings?.filter((b) => b.status === "confirmed").length ?? 0;
  const pending = bookings?.filter((b) => b.status === "pending").length ?? 0;
  const totalGuests =
    bookings?.reduce((sum, b) => sum + (b.num_guests || 0), 0) ?? 0;

  const { count: inquiryCount, error: inquiryError } = await supabaseAdmin
    .from("inquiries")
    .select("*", { count: "exact", head: true });

  if (inquiryError) {
    console.error("fetchInquiryCount error:", inquiryError);
  }

  return json({
    stats: {
      totalRevenue,
      confirmed,
      pending,
      totalGuests,
      totalInquiries: inquiryCount ?? 0,
    },
  });
}
