import { createClient } from "@supabase/supabase-js";
import type {
  PaymentMode as RequestPaymentMode,
  PreferredPlan,
  PreferredTime,
  RateTier,
} from "./propertyData";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── TYPES ─────────────────────────────────────────────────────────────

export interface Retreat {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description?: string;

  price_day: number;
  price_night: number;
  price_overnight: number;

  max_guests: number;

  image_url: string;
  gallery_urls?: string[];

  tag: string;
  amenities?: string[];

  created_at: string;
}

export type BookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "confirmed"
  | "cancelled"
  | "completed";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded" | "failed";

export type BookingType = "day" | "night" | "overnight";

export interface Booking {
  id: string;
  retreat_id: string;
  retreat?: Retreat;

  full_name: string;
  email?: string;
  phone?: string;
  contact_number?: string;
  address: string;
  booking_type?: BookingType;

  // Supports both the legacy checkout flow and the request-style form flow.
  booking_date?: string;
  preferred_dates?: string;
  preferred_time?: PreferredTime;
  preferred_plan?: PreferredPlan;
  rate_tier?: RateTier;
  mode_of_payment?: RequestPaymentMode;

  guests?: number;
  num_guests?: number;
  num_cars?: number;

  // PAYMENT SYSTEM
  total_amount: number;
  downpayment_amount?: number;
  remaining_balance?: number;

  payment_status: PaymentStatus;
  payment_reference?: string;

  // 🔐 ADMIN FLOW
  status: BookingStatus;
  approved_at?: string;

  special_requests?: string;

  created_at: string;
}

export interface BlockedDate {
  id: string;
  retreat_id: string;
  date: string;
  reason?: string;
}

// ── RETREATS ──────────────────────────────────────────────────────────

export async function fetchRetreats(): Promise<Retreat[]> {
  const { data, error } = await supabase
    .from("retreats")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) console.error("fetchRetreats:", error);
  return data ?? [];
}

export async function fetchRetreatBySlug(slug: string): Promise<Retreat | null> {
  const { data, error } = await supabase
    .from("retreats")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) console.error("fetchRetreatBySlug:", error);
  return data ?? null;
}

// ── BOOKINGS ──────────────────────────────────────────────────────────

// ✅ CREATE BOOKING (with downpayment)
export async function createBooking(
  booking: Omit<Booking, "id" | "created_at" | "retreat" | "approved_at">
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        ...booking,
        status: "pending",
        payment_status: "unpaid",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("createBooking:", error);
    return null;
  }

  return data;
}

// ✅ FETCH BOOKINGS
export async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, retreat:retreats(*)")
    .order("created_at", { ascending: false });

  if (error) console.error("fetchBookings:", error);
  return data ?? [];
}

// ✅ ADMIN APPROVAL
export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<boolean> {
  const { error } = await supabase
    .from("bookings")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    console.error("updateBookingStatus:", error);
    return false;
  }

  return true;
}

// ✅ PAYMENT UPDATE (supports partial)
export async function updateBookingPayment(
  id: string,
  payment_status: PaymentStatus,
  payment_reference?: string,
  paidAmount?: number
): Promise<boolean> {
  const updates: any = {
    payment_status,
    payment_reference,
  };

  // 🔥 Handle partial payments
  if (paidAmount !== undefined) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("total_amount, downpayment_amount")
      .eq("id", id)
      .single();

    if (booking) {
      updates.remaining_balance =
        booking.total_amount - paidAmount;
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("updateBookingPayment:", error);
    return false;
  }

  return true;
}

// ── BLOCKED DATES (ANTI DOUBLE BOOKING) ───────────────────────────────

// ✅ FETCH BLOCKED DATES
export async function fetchBlockedDates(
  retreatId?: string
): Promise<BlockedDate[]> {
  let query = supabase.from("blocked_dates").select("*");

  if (retreatId) {
    query = query.eq("retreat_id", retreatId);
  }

  const { data, error } = await query;

  if (error) console.error("fetchBlockedDates:", error);
  return data ?? [];
}

// ✅ ADD BLOCKED DATE (AUTO AFTER BOOKING)
export async function addBlockedDate(
  retreatId: string,
  date: string,
  reason?: string
): Promise<boolean> {
  const { error } = await supabase.from("blocked_dates").insert([
    {
      retreat_id: retreatId,
      date,
      reason: reason ?? "Booked",
    },
  ]);

  if (error) {
    console.error("addBlockedDate:", error);
    return false;
  }

  return true;
}

// ✅ REMOVE BLOCKED DATE
export async function removeBlockedDate(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("blocked_dates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("removeBlockedDate:", error);
    return false;
  }

  return true;
}
export interface Testimonial {
  id: string
  name: string
  location?: string
  review: string
  rating: number
  created_at: string
  avatar_url?: string
}

// fetch testimonials
export async function fetchTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data as Testimonial[]
}
// ── ADMIN AUTH ───────────────────────────────────────────────────────

export async function adminSignIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function adminSignOut() {
  return supabase.auth.signOut();
}

export async function getAdminSession() {
  return supabase.auth.getSession();
}


export interface Inquiry {
  id: string
  full_name: string
  email: string
  phone?: string
  message?: string
  check_in?: string
  check_out?: string
  guests?: number
  created_at: string
}

// Submit a new inquiry
export async function submitInquiry(data: {
  full_name: string
  email: string
  phone?: string
  message?: string
  check_in?: string
  check_out?: string
  guests?: number
}): Promise<Inquiry | null> {
  const { data: result, error } = await supabase
    .from('inquiries')
    .insert([data])
    .select()
    .single()

  if (error) {
    console.error(error)
    return null
  }

  return result as Inquiry
}
