const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || "";
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || "";
const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1";

/**
 * Check if PayMongo is properly configured
 * Returns false if required keys are missing
 */
export function isPayMongoConfigured(): boolean {
  return !!(PAYMONGO_SECRET_KEY && PAYMONGO_WEBHOOK_SECRET);
}

function getPayMongoAuthHeader() {
  if (!PAYMONGO_SECRET_KEY) {
    throw new Error(
      "PayMongo integration not configured. Set PAYMONGO_SECRET_KEY in Edge Function secrets."
    );
  }
  return `Basic ${btoa(`${PAYMONGO_SECRET_KEY}:`)}`;
}

export async function createCheckoutSession(payload: {
  amount: number;
  propertyName: string;
  description: string;
  bookingId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  successUrl: string;
  cancelUrl: string;
}) {
  // Ensure PayMongo is configured before attempting to create session
  if (!isPayMongoConfigured()) {
    throw new Error(
      "PayMongo integration not configured. Contact support or configure PAYMONGO_SECRET_KEY."
    );
  }

  const response = await fetch(`${PAYMONGO_BASE_URL}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: getPayMongoAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            {
              amount: Math.round(payload.amount * 100),
              currency: "PHP",
              name: payload.propertyName,
              description: payload.description,
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "card"],
          success_url: payload.successUrl,
          cancel_url: payload.cancelUrl,
          description: payload.description,
          metadata: {
            booking_id: payload.bookingId,
          },
          billing: {
            name: payload.guestName,
            email: payload.guestEmail,
            phone: payload.guestPhone,
          },
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
        },
      },
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.errors?.[0]?.detail || "Failed to create PayMongo checkout session.");
  }
  return json.data;
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPayMongoWebhookSignature(rawBody: string, header: string | null) {
  if (!PAYMONGO_WEBHOOK_SECRET || !header) {
    console.warn("PayMongo webhook verification skipped: missing secret key");
    return false;
  }

  const entries = header.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = Number(entries.t);
  const providedSignature = entries.te || entries.li;

  if (!timestamp || !providedSignature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > 300) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = await hmacSha256Hex(PAYMONGO_WEBHOOK_SECRET, signedPayload);

  return timingSafeEqualHex(expectedSignature, providedSignature);
}
