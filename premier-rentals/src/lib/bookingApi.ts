type CreateBookingPayload = {
  property_id: string;
  booking_date: string;
  // time_slot sent as 'day'|'night'|'overnight' — normalized to
  // 'daytime'|'nighttime'|'overnight' in api/payments/checkout.ts
  time_slot: "day" | "night" | "overnight";
  guests: number;
  cars: number;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  rate_tier: string;
  rate_label: string;
  mode_of_payment: string;
  special_requests?: string;
};

type JsonError = {
  error?: string;
};

export type BookingStatusResponse = {
  booking_id: string;
  status: string;
  payment_status: string;
  locked_until: string | null;
  total_amount: number;
  downpayment_amount: number;
  property_id: string | null;
  booking_date: string | null;
  time_slot: string | null;
  guest_name: string | null;
};

export type PendingBookingState = {
  bookingId: string;
  propertyId: string;
  propertyName: string;
  guestName: string;
  lockedUntil: string;
  createdAt: string;
};

const PENDING_BOOKING_STORAGE_KEY = "premier-rentals.pending-booking";

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as T & JsonError;
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export async function initializeCheckout(payload: CreateBookingPayload) {
  return postJson<{ checkout_url: string }>(
    "/api/payments/checkout",
    payload
  );
}
export async function createPayMongoCheckout(bookingId: string) {
  return postJson<{ checkout_url: string }>("/api/payments/resume-checkout", {
    booking_id: bookingId,
  });
}

export async function fetchBookingStatus(bookingId: string) {
  const encodedBookingId = encodeURIComponent(bookingId);
  const response = await fetch(`/api/bookings/status?booking_id=${encodedBookingId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = (await response.json().catch(() => ({}))) as
    | {
        status?: string;
        booking?: {
          id?: string;
          status?: string;
          payment_status?: string;
          full_name?: string;
          booking_date?: string;
          time_slot?: string;
        };
        error?: string;
      }
    | undefined;

  if (response.status === 202 || data?.status === "pending") {
    return {
      booking_id: bookingId,
      status: "pending",
      payment_status: "unpaid",
      locked_until: null,
      total_amount: 0,
      downpayment_amount: 0,
      property_id: null,
      booking_date: null,
      time_slot: null,
      guest_name: null,
    } satisfies BookingStatusResponse;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  if (data?.status === "confirmed" && data.booking) {
    return {
      booking_id: data.booking.id ?? bookingId,
      status: data.booking.status ?? "confirmed",
      payment_status: data.booking.payment_status ?? "paid",
      locked_until: null,
      total_amount: 0,
      downpayment_amount: 0,
      property_id: null,
      booking_date: data.booking.booking_date ?? null,
      time_slot: data.booking.time_slot ?? null,
      guest_name: data.booking.full_name ?? null,
    } satisfies BookingStatusResponse;
  }

  throw new Error("Invalid booking status response");
}

export function savePendingBooking(state: PendingBookingState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    PENDING_BOOKING_STORAGE_KEY,
    JSON.stringify(state),
  );
}

export function getPendingBooking() {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(PENDING_BOOKING_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingBookingState;
  } catch {
    window.sessionStorage.removeItem(PENDING_BOOKING_STORAGE_KEY);
    return null;
  }
}

export function clearPendingBooking() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_BOOKING_STORAGE_KEY);
}
