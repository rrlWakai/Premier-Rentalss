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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    // Get booking statistics
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select("status, payment_status, total_amount, num_guests");

    if (bookingsError) {
      console.error("fetchStats error:", bookingsError);
      return json({ error: "Failed to fetch statistics" }, { status: 500 });
    }

    const totalRevenue = bookings
      ?.filter(b => b.payment_status === 'paid')
      ?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

    const confirmed = bookings?.filter(b => b.status === 'confirmed').length || 0;
    const pending = bookings?.filter(b => b.status === 'pending').length || 0;
    const totalGuests = bookings?.reduce((sum, b) => sum + (b.num_guests || 0), 0) || 0;

    // Get inquiry count
    const { count: inquiryCount, error: inquiryError } = await supabaseAdmin
      .from("inquiries")
      .select("*", { count: 'exact', head: true });

    if (inquiryError) {
      console.error("fetchInquiryCount error:", inquiryError);
    }

    return json({
      stats: {
        totalRevenue,
        confirmed,
        pending,
        totalGuests,
        totalInquiries: inquiryCount || 0
      }
    });
  } catch (error) {
    console.error("admin/stats failed", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}