import { BOOKING_CATALOG } from "./catalog";

export type PriceType = "weekday" | "weekend";

export type ActiveDiscount = {
  id: string;
  name: string;
  percentage: number;
  applies_to: "all" | "property" | "rate";
  property_ids: string[] | null;
  rate_labels: string[] | null;
};

export type PriceBreakdown = {
  priceType: PriceType;
  maxPax: number;
  maxAdditionalPax: number;
  guests: number;
  extraPax: number;
  basePrice: number;
  additionalPaxRate: number;
  extraCost: number;
  subtotal: number;
  discountLabel: string;
  discountPercentage: number;
  discountAmount: number;
  finalTotal: number;
  downpayment: number;
  remainingBalance: number;
};

// Thrown for any validation failure inside computeBookingPrice.
// Callers can instanceof-check to distinguish user errors (400) from bugs (500).
export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

// Normalize a rate label for comparison: trim whitespace, collapse internal
// spaces, lowercase. Prevents mismatches from trailing spaces or mixed case
// (e.g. "Day Premium " vs "day premium").
export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toUtcDate(date: string): Date {
  // Parse as UTC noon to stay safe across all time zones.
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

// Single canonical weekend check used by ALL pricing logic.
// Weekend = Friday, Saturday, Sunday + December 1 – January 2 (holiday override).
export function isWeekend(date: string): boolean {
  const parsed = toUtcDate(date);
  const month = parsed.getUTCMonth() + 1;
  const day = parsed.getUTCDate();

  if (month === 12 || (month === 1 && day <= 2)) {
    return true;
  }

  const dayOfWeek = parsed.getUTCDay();
  return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
}

// ─── Core pricing function ────────────────────────────────────────────────────

export function computeBookingPrice(input: {
  propertyId: string;
  rateTier: string;
  rateLabel: string;
  reservationDate: string;
  guests: number;
  appliedDiscount?: ActiveDiscount | null;
}): PriceBreakdown {
  const { propertyId, rateTier, rateLabel, reservationDate, guests, appliedDiscount } = input;

  console.log("[PRICING] computeBookingPrice input:", {
    propertyId,
    rateTier,
    rateLabel,
    reservationDate,
    guests,
  });

  // ── Catalog lookups ─────────────────────────────────────────────────────────
  const property = BOOKING_CATALOG[propertyId];
  if (!property) {
    console.warn("[PRICING] unknown property:", propertyId);
    throw new PricingError("Invalid property selection.");
  }

  const pkg = property.packages.find((p) => p.tier === rateTier);
  if (!pkg) {
    console.warn("[PRICING] unknown rate tier:", { propertyId, rateTier });
    throw new PricingError("Invalid rate package.");
  }

  // Normalize both sides so minor whitespace or casing differences don't
  // silently produce a null rate — they throw an explicit error instead.
  const normalizedInput = normalizeLabel(rateLabel);
  const rate = pkg.rates.find((r) => normalizeLabel(r.label) === normalizedInput);
  if (!rate) {
    console.error("[PRICING] rate not found:", { propertyId, rateTier, rateLabel, normalizedInput });
    throw new PricingError("Invalid rate selection.");
  }

  // ── Guest validation ────────────────────────────────────────────────────────
  if (!Number.isInteger(guests) || guests < 1) {
    throw new PricingError("Number of guests must be at least 1.");
  }

  const maxAdditionalPax = pkg.maxAdditionalPax;
  const maxGuests = pkg.maxPax + maxAdditionalPax;

  if (guests > maxGuests) {
    throw new PricingError(
      `Too many guests for this package (maximum ${maxGuests}).`,
    );
  }

  // ── Price computation ───────────────────────────────────────────────────────
  const priceType: PriceType = isWeekend(reservationDate) ? "weekend" : "weekday";
  const basePrice = priceType === "weekend" ? rate.weekend : rate.weekday;

  if (basePrice <= 0) {
    console.error("[PRICING] base price is zero or negative:", {
      rateLabel,
      priceType,
      basePrice,
    });
    throw new PricingError("Rate data is invalid — base price must be greater than zero.");
  }

  const maxPax = pkg.maxPax;
  const extraPax = Math.max(0, guests - maxPax);
  const additionalPaxRate =
    rate.timeSlot === "daytime" ? pkg.additionalPaxDay : pkg.additionalPaxNight;
  const extraCost = extraPax * additionalPaxRate;
  const subtotal = basePrice + extraCost;

  const discountPercentage = appliedDiscount?.percentage ?? 0;
  const discountAmount = appliedDiscount
    ? Math.round(subtotal * (discountPercentage / 100))
    : 0;
  const discountLabel = appliedDiscount?.name ?? "";
  const finalTotal = subtotal - discountAmount;

  if (finalTotal <= 0) {
    console.error("[PRICING] finalTotal is zero or negative:", {
      basePrice,
      extraCost,
      subtotal,
      discountAmount,
      finalTotal,
    });
    throw new PricingError("Computed total is invalid — please try again.");
  }

  const downpayment = finalTotal * 0.5;
  const remainingBalance = finalTotal - downpayment;

  const breakdown: PriceBreakdown = {
    priceType,
    maxPax,
    maxAdditionalPax,
    guests,
    extraPax,
    basePrice,
    additionalPaxRate,
    extraCost,
    subtotal,
    discountLabel,
    discountPercentage,
    discountAmount,
    finalTotal,
    downpayment,
    remainingBalance,
  };

  console.log("[PRICING] computeBookingPrice result:", {
    priceType,
    basePrice,
    extraPax,
    extraCost,
    subtotal,
    discountLabel,
    discountAmount,
    finalTotal,
    downpayment,
  });

  return breakdown;
}
