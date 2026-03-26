// PayMongo Integration
// Docs: https://developers.paymongo.com

const PAYMONGO_PUBLIC_KEY = import.meta.env.VITE_PAYMONGO_PUBLIC_KEY ?? ''
const PAYMONGO_BASE = 'https://api.paymongo.com/v1'

function authHeader() {
  return 'Basic ' + btoa(PAYMONGO_PUBLIC_KEY + ':')
}

export interface PaymentIntent {
  id: string
  attributes: {
    amount: number
    currency: string
    status: string
    client_key: string
    payment_method_allowed: string[]
  }
}

export interface PaymentMethod {
  id: string
  type: string
}

// Create a PaymentIntent
export async function createPaymentIntent(
  amountInPHP: number,
  description: string
): Promise<PaymentIntent | null> {
  try {
    const res = await fetch(`${PAYMONGO_BASE}/payment_intents`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amountInPHP * 100), // convert to centavos
            currency: 'PHP',
            description,
            payment_method_allowed: ['card', 'gcash', 'paymaya', 'grab_pay'],
            capture_type: 'automatic',
          },
        },
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      console.error('PayMongo error:', json)
      return null
    }
    return json.data as PaymentIntent
  } catch (err) {
    console.error('createPaymentIntent error:', err)
    return null
  }
}

// Create a PaymentMethod (card)
export async function createCardPaymentMethod(card: {
  number: string
  exp_month: number
  exp_year: number
  cvc: string
  name: string
  email: string
  phone: string
}): Promise<PaymentMethod | null> {
  try {
    const res = await fetch(`${PAYMONGO_BASE}/payment_methods`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            type: 'card',
            details: {
              card_number: card.number.replace(/\s/g, ''),
              exp_month: card.exp_month,
              exp_year: card.exp_year,
              cvc: card.cvc,
            },
            billing: {
              name: card.name,
              email: card.email,
              phone: card.phone,
            },
          },
        },
      }),
    })
    const json = await res.json()
    if (!res.ok) { console.error('PayMongo PM error:', json); return null }
    return json.data as PaymentMethod
  } catch (err) {
    console.error('createCardPaymentMethod error:', err)
    return null
  }
}

// Attach PaymentMethod to PaymentIntent
export async function attachPaymentIntent(
  intentId: string,
  clientKey: string,
  paymentMethodId: string
): Promise<{ status: string; next_action?: { redirect?: { url: string } } } | null> {
  try {
    const res = await fetch(`${PAYMONGO_BASE}/payment_intents/${intentId}/attach`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
            return_url: window.location.origin + '/booking/success',
          },
        },
      }),
    })
    const json = await res.json()
    if (!res.ok) { console.error('Attach error:', json); return null }
    return json.data.attributes
  } catch (err) {
    console.error('attachPaymentIntent error:', err)
    return null
  }
}

// Create a GCash/Maya Source (redirect-based)
export async function createEWalletSource(
  amountInPHP: number,
  type: 'gcash' | 'paymaya' | 'grab_pay',
  bookingRef: string,
  email: string,
  name: string,
  phone: string
): Promise<{ id: string; redirect: { checkout_url: string } } | null> {
  try {
    const res = await fetch(`${PAYMONGO_BASE}/sources`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amountInPHP * 100),
            currency: 'PHP',
            type,
            redirect: {
              success: `${window.location.origin}/booking/success?ref=${bookingRef}`,
              failed: `${window.location.origin}/booking/failed?ref=${bookingRef}`,
            },
            billing: { name, email, phone },
          },
        },
      }),
    })
    const json = await res.json()
    if (!res.ok) { console.error('Source error:', json); return null }
    return json.data
  } catch (err) {
    console.error('createEWalletSource error:', err)
    return null
  }
}

export function formatPHP(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(amount)
}
