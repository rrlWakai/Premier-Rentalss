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

export async function createBookingReservation(payload: CreateBookingPayload) {
  return postJson<{ booking_id: string; amount: number; locked_until: string }>(
    "/api/bookings/create",
    payload,
  );
}

export async function createPayMongoCheckout(bookingId: string) {
  return postJson<{ checkout_url: string }>("/api/payments/checkout", {
    booking_id: bookingId,
  });
}
