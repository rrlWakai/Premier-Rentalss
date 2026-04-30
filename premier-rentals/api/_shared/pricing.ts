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
  num_guests: number;
  num_cars: number;

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

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toUtcDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function isWeekend(date: string): boolean {
  const parsed = toUtcDate(date);
  const month = parsed.getUTCMonth() + 1;
  const day = parsed.getUTCDate();

  if (month === 12 || (month === 1 && day <= 2)) return true;

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
  num_cars: number; // ✅ ADDED
  appliedDiscount?: ActiveDiscount | null;
}): PriceBreakdown {
  const {
    propertyId,
    rateTier,
    rateLabel,
    reservationDate,
    guests,
    num_cars,
    appliedDiscount,
  } = input;

  console.log("[PRICING] computeBookingPrice input:", {
    propertyId,
    rateTier,
    rateLabel,
    reservationDate,
    guests,
    num_cars,
  });

  const property = BOOKING_CATALOG[propertyId];
  if (!property) throw new PricingError("Invalid property selection.");

  const pkg = property.packages.find((p) => p.tier === rateTier);
  if (!pkg) throw new PricingError("Invalid rate package.");

  const normalizedInput = normalizeLabel(rateLabel);
  const rate = pkg.rates.find((r) => normalizeLabel(r.label) === normalizedInput);
  if (!rate) throw new PricingError("Invalid rate selection.");

  if (!Number.isInteger(guests) || guests < 1) {
    throw new PricingError("Number of guests must be at least 1.");
  }

  const maxAdditionalPax = pkg.maxAdditionalPax;
  const maxGuests = pkg.maxPax + maxAdditionalPax;

  if (guests > maxGuests) {
    throw new PricingError(`Too many guests (maximum ${maxGuests}).`);
  }

  const priceType: PriceType = isWeekend(reservationDate) ? "weekend" : "weekday";
  const basePrice = priceType === "weekend" ? rate.weekend : rate.weekday;

  const maxPax = pkg.maxPax;
  const extraPax = Math.max(0, guests - maxPax);

  const additionalPaxRate =
    rate.timeSlot === "daytime"
      ? pkg.additionalPaxDay
      : pkg.additionalPaxNight;

  const extraCost = extraPax * additionalPaxRate;
  const subtotal = basePrice + extraCost;

  const discountPercentage = appliedDiscount?.percentage ?? 0;
  const discountAmount = appliedDiscount
    ? Math.round(subtotal * (discountPercentage / 100))
    : 0;

  const finalTotal = subtotal - discountAmount;

  if (finalTotal <= 0) {
    throw new PricingError("Computed total is invalid.");
  }

  const downpayment = finalTotal * 0.5;
  const remainingBalance = finalTotal - downpayment;

  const breakdown: PriceBreakdown = {
    priceType,
    maxPax,
    maxAdditionalPax,

    guests,
    num_guests: guests, // ✅ mirror safely
    num_cars,           // ✅ correct

    extraPax,
    basePrice,
    additionalPaxRate,
    extraCost,
    subtotal,

    discountLabel: appliedDiscount?.name ?? "",
    discountPercentage,
    discountAmount,

    finalTotal,
    downpayment,
    remainingBalance,
  };

  console.log("[PRICING] computeBookingPrice result:", breakdown);

  return breakdown;
}