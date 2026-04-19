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
    maxAdditionalPax: number;
    additionalPaxDay: number;
    additionalPaxNight: number;
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
        maxAdditionalPax: 5,
        additionalPaxDay: 500,
        additionalPaxNight: 1000,
        rates: [
          { label: "Day Basic",     weekday: 12500, weekend: 16500, timeSlot: "daytime" },
          { label: "Day Premium",   weekday: 14500, weekend: 18500, timeSlot: "daytime" },
          { label: "Night Basic",   weekday: 14500, weekend: 18500, timeSlot: "nighttime" },
          { label: "Night Premium", weekday: 16500, weekend: 20500, timeSlot: "nighttime" },
          { label: "Platinum",      weekday: 23500, weekend: 27500, timeSlot: "overnight" },
        ],
      },
      {
        tier: "family",
        title: "Family Rates",
        maxPax: 30,
        maxAdditionalPax: 5,
        additionalPaxDay: 500,
        additionalPaxNight: 1000,
        rates: [
          { label: "Day Time",  weekday: 20500, weekend: 30500, timeSlot: "daytime" },
          { label: "Night Time",weekday: 25500, weekend: 35500, timeSlot: "nighttime" },
          { label: "Overnight", weekday: 35500, weekend: 45500, timeSlot: "overnight" },
        ],
      },
      {
        tier: "big_group",
        title: "Big Group Rates",
        maxPax: 40,
        maxAdditionalPax: 10,
        additionalPaxDay: 500,
        additionalPaxNight: 1000,
        rates: [
          { label: "Day Time",  weekday: 25500, weekend: 35500, timeSlot: "daytime" },
          { label: "Night Time",weekday: 30500, weekend: 40500, timeSlot: "nighttime" },
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
        maxAdditionalPax: 3,
        additionalPaxDay: 500,
        additionalPaxNight: 1000,
        rates: [
          { label: "Day Premium",       weekday:  9500, weekend: 12500, timeSlot: "daytime" },
          { label: "Night Premium",     weekday: 15500, weekend: 18500, timeSlot: "nighttime" },
          { label: "Overnight Platinum",weekday: 18500, weekend: 21500, timeSlot: "overnight" },
        ],
      },
      {
        tier: "family",
        title: "Family Rates",
        maxPax: 20,
        maxAdditionalPax: 3,
        additionalPaxDay: 500,
        additionalPaxNight: 1000,
        rates: [
          { label: "Day Premium",       weekday: 12500, weekend: 16500, timeSlot: "daytime" },
          { label: "Night Premium",     weekday: 18500, weekend: 21500, timeSlot: "nighttime" },
          { label: "Overnight Platinum",weekday: 23500, weekend: 27500, timeSlot: "overnight" },
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
