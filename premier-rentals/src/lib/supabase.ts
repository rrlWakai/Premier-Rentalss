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
  _booking?: Omit<Booking, "id" | "created_at" | "retreat" | "approved_at">
): Promise<Booking | null> {
  throw new Error("Direct client-side booking creation is disabled. Use /api/bookings/create.");
}

// ✅ FETCH BOOKINGS (via Edge Functions with admin auth)
export async function fetchBookings(): Promise<Booking[]> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      console.error("fetchBookings: No authenticated session");
      return [];
    }

    const response = await fetch('/api/admin/bookings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`fetchBookings error (${response.status}):`, errorData);
      return [];
    }

    const data = await response.json();
    const bookings = data.bookings || [];

    // Fetch retreats separately and attach to bookings
    const retreats = await fetchRetreats();
    const retreatMap = new Map(retreats.map((r) => [r.id, r]));

    return bookings.map((b: Booking) => ({
      ...b,
      retreat: retreatMap.get(b.retreat_id),
    }));
  } catch (error) {
    console.error("fetchBookings error:", error);
    return [];
  }
}

// ✅ UPDATE BOOKING STATUS (via Edge Function with admin auth)
export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<boolean> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      console.error("updateBookingStatus: No authenticated session");
      return false;
    }

    const response = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: id,
        updates: {
          status,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`updateBookingStatus error (${response.status}):`, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("updateBookingStatus error:", error);
    return false;
  }
}

// ✅ UPDATE BOOKING PAYMENT (via Edge Function with admin auth)
export async function updateBookingPayment(
  id: string,
  payment_status: PaymentStatus,
  payment_reference?: string,
  paidAmount?: number
): Promise<boolean> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      console.error("updateBookingPayment: No authenticated session");
      return false;
    }

    const updates: any = {
      payment_status,
      payment_reference,
    };

    // ✅ Send paid_amount to API for server-side calculation
    if (paidAmount !== undefined) {
      updates.paid_amount = paidAmount;
    }

    const response = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: id,
        updates,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`updateBookingPayment error (${response.status}):`, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("updateBookingPayment error:", error);
    return false;
  }
}

// ── BLOCKED DATES (ANTI DOUBLE BOOKING) ───────────────────────────────

// ✅ FETCH BLOCKED DATES (via Edge Function with admin auth)
export async function fetchBlockedDates(
  retreatId?: string
): Promise<BlockedDate[]> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      console.error("fetchBlockedDates: No authenticated session");
      return [];
    }

    const url = retreatId
      ? `/api/admin/blocked-dates?retreat_id=${retreatId}`
      : '/api/admin/blocked-dates';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`fetchBlockedDates error (${response.status}):`, errorData);
      return [];
    }

    const data = await response.json();
    return data.blockedDates || [];
  } catch (error) {
    console.error("fetchBlockedDates error:", error);
    return [];
  }
}

// ✅ ADD BLOCKED DATE (via Edge Function with admin auth)
export async function addBlockedDate(
  retreatId: string,
  date: string,
  reason?: string
): Promise<boolean> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      console.error("addBlockedDate: No authenticated session");
      return false;
    }

    const response = await fetch('/api/admin/blocked-dates', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        retreatId,
        date,
        reason,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`addBlockedDate error (${response.status}):`, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("addBlockedDate error:", error);
    return false;
  }
}

// ✅ REMOVE BLOCKED DATE (via Edge Function with admin auth)
export async function removeBlockedDate(id: string): Promise<boolean> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      console.error("removeBlockedDate: No authenticated session");
      return false;
    }

    const response = await fetch(`/api/admin/blocked-dates?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`removeBlockedDate error (${response.status}):`, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("removeBlockedDate error:", error);
    return false;
  }
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
