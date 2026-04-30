import { supabaseAdmin } from "./api/_shared/supabaseAdmin.ts";

async function run() {
  const { data, error } = await supabaseAdmin.from("bookings").select("id, status, property_id, booking_date, total_amount").order("created_at", { ascending: false });
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
