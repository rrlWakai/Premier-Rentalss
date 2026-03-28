export type TimeSlot = "daytime" | "nighttime" | "overnight";

export type BookingCatalogEntry = {
  propertyId: string;
  name: string;
  description: string;
  maxGuests: number;
  maxCars: number;
  packages: Array<{
    tier: string;
    title: string;
    maxPax: number;
    rates: Array<{
      label: string;
      weekday: number;
      weekend: number;
      timeSlot: TimeSlot;
    }>;
  }>;
};

export const BOOKING_CATALOG: Record<string, BookingCatalogEntry> = {
  "premier-pool-house": {
    propertyId: "premier-pool-house",
    name: "Premier Pool House",
    description:
      "Private pool stay designed for celebrations, group staycations, and activity-filled city escapes.",
    maxGuests: 40,
    maxCars: 8,
    packages: [
      {
        tier: "staycation",
        title: "Staycation Rates",
        maxPax: 20,
        rates: [
          { label: "Day Basic", weekday: 12500, weekend: 16500, timeSlot: "daytime" },
          { label: "Day Premium", weekday: 14500, weekend: 18500, timeSlot: "daytime" },
          { label: "Night Basic", weekday: 14500, weekend: 18500, timeSlot: "nighttime" },
          { label: "Night Premium", weekday: 16500, weekend: 20500, timeSlot: "nighttime" },
          { label: "Platinum", weekday: 23500, weekend: 27500, timeSlot: "overnight" },
        ],
      },
      {
        tier: "family",
        title: "Family Rates",
        maxPax: 30,
        rates: [
          { label: "Day Time", weekday: 20500, weekend: 30500, timeSlot: "daytime" },
          { label: "Night Time", weekday: 25500, weekend: 35500, timeSlot: "nighttime" },
          { label: "Overnight", weekday: 35500, weekend: 45500, timeSlot: "overnight" },
        ],
      },
      {
        tier: "big_group",
        title: "Big Group Rates",
        maxPax: 40,
        rates: [
          { label: "Day Time", weekday: 25500, weekend: 35500, timeSlot: "daytime" },
          { label: "Night Time", weekday: 30500, weekend: 40500, timeSlot: "nighttime" },
          { label: "Overnight", weekday: 40500, weekend: 50500, timeSlot: "overnight" },
        ],
      },
    ],
  },
  "premier-patio": {
    propertyId: "premier-patio",
    name: "Premier Patio",
    description:
      "Urban patio stay with a relaxed and intimate setting for smaller gatherings and laid-back city escapes.",
    maxGuests: 20,
    maxCars: 4,
    packages: [
      {
        tier: "staycation",
        title: "Staycation Rates",
        maxPax: 12,
        rates: [
          { label: "Day Premium", weekday: 9500, weekend: 12500, timeSlot: "daytime" },
          { label: "Night Premium", weekday: 15500, weekend: 18500, timeSlot: "nighttime" },
          { label: "Overnight Platinum", weekday: 18500, weekend: 21500, timeSlot: "overnight" },
        ],
      },
      {
        tier: "family",
        title: "Family Rates",
        maxPax: 20,
        rates: [
          { label: "Day Premium", weekday: 12500, weekend: 16500, timeSlot: "daytime" },
          { label: "Night Premium", weekday: 18500, weekend: 21500, timeSlot: "nighttime" },
          { label: "Overnight Platinum", weekday: 23500, weekend: 27500, timeSlot: "overnight" },
        ],
      },
    ],
  },
};

export function labelToTimeSlot(label: string): TimeSlot {
  const normalized = label.toLowerCase();
  if (normalized.includes("overnight") || normalized.includes("platinum")) {
    return "overnight";
  }
  if (normalized.includes("night")) {
    return "nighttime";
  }
  return "daytime";
}

export function normalizeTimeSlot(input: string): TimeSlot | null {
  if (input === "daytime" || input === "nighttime" || input === "overnight") {
    return input;
  }
  return null;
}

export function getRateForSelection(args: {
  propertyId: string;
  rateTier: string;
  rateLabel: string;
}) {
  const property = BOOKING_CATALOG[args.propertyId];
  if (!property) return null;
  const pkg = property.packages.find((item) => item.tier === args.rateTier);
  if (!pkg) return null;
  const rate = pkg.rates.find((item) => item.label === args.rateLabel);
  if (!rate) return null;
  return { property, pkg, rate };
}

function toUtcDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function isWeekend(date: string) {
  const parsed = toUtcDate(date);
  const dayOfWeek = parsed.getUTCDay();

  return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
}

export function getBookingAmounts(args: {
  propertyId: string;
  rateTier: string;
  rateLabel: string;
  reservationDate: string;
}) {
  const selection = getRateForSelection({
    propertyId: args.propertyId,
    rateTier: args.rateTier,
    rateLabel: args.rateLabel,
  });

  if (!selection) return null;

  const totalAmount = isWeekend(args.reservationDate)
    ? selection.rate.weekend
    : selection.rate.weekday;
  const downpaymentAmount = totalAmount * 0.5;

  return {
    ...selection,
    totalAmount,
    downpaymentAmount,
  };
}
