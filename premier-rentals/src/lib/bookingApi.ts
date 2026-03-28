type CreateBookingPayload = {
  property_id: string;
  date: string;
  time_slot: "daytime" | "nighttime" | "overnight";
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
  guest_name: string;
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

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & JsonError;
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export async function createBookingReservation(payload: CreateBookingPayload) {
  return postJson<{
    booking_id: string;
    amount: number;
    downpayment_amount: number;
    locked_until: string;
  }>(
    "/api/bookings/create",
    payload,
  );
}

export async function createPayMongoCheckout(bookingId: string) {
  return postJson<{ checkout_url: string }>("/api/payments/checkout", {
    booking_id: bookingId,
  });
}

export async function fetchBookingStatus(bookingId: string) {
  const encodedBookingId = encodeURIComponent(bookingId);
  return getJson<BookingStatusResponse>(
    `/api/bookings/status?booking_id=${encodedBookingId}`,
  );
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
