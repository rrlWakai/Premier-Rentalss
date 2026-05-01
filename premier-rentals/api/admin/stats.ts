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
    .select("id, status, payment_status, total_amount, full_name, booking_date, time_slot, created_at");

  if (bookingsError) {
    console.error("fetchStats error:", bookingsError);
    return json({ error: "Failed to fetch statistics" }, { status: 500 });
  }

  const totalRevenue =
    role === "admin"
      ? (bookings
          ?.filter((b) => b.status === "pending" || b.status === "confirmed")
          .reduce((sum, b) => sum + (b.total_amount || 0), 0) ?? 0)
      : 0;

  const totalBookings = bookings?.length ?? 0;
  const confirmedBookings = bookings?.filter((b) => b.status === "confirmed").length ?? 0;
  const pendingBookings = bookings?.filter((b) => b.status === "pending").length ?? 0;
  const recentBookings = (bookings ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const { count: inquiryCount, error: inquiryError } = await supabaseAdmin
    .from("inquiries")
    .select("*", { count: "exact", head: true });

  if (inquiryError) {
    console.error("fetchInquiryCount error:", inquiryError);
  }

  return json({
    totalBookings,
    confirmedBookings,
    totalRevenue,
    pendingBookings,
    recentBookings,
    totalInquiries: inquiryCount ?? 0,
  }, { status: 200 });
}
