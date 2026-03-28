import type { RateEntry } from "./propertyData";

export type PriceType = "weekday" | "weekend";

function parseReservationDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function isHolidayWeekendOverride(date: Date) {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  return (
    month === 12 ||
    (month === 1 && day <= 2)
  );
}

export function getPriceType(dateValue: string): PriceType {
  const parsed = parseReservationDate(dateValue);
  if (!parsed) return "weekday";

  if (isHolidayWeekendOverride(parsed)) {
    return "weekend";
  }

  const dayOfWeek = parsed.getUTCDay();
  return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0
    ? "weekend"
    : "weekday";
}

export function getRateAmount(rate: RateEntry | undefined, dateValue: string) {
  if (!rate) return 0;
  const priceType = getPriceType(dateValue);
  return rate[priceType] ?? 0;
}

export function getBookingPriceBreakdown(rate: RateEntry | undefined, dateValue: string) {
  const priceType = getPriceType(dateValue);
  const totalAmount = getRateAmount(rate, dateValue);
  const downpaymentAmount = totalAmount * 0.5;
  const remainingBalance = totalAmount - downpaymentAmount;

  return {
    priceType,
    totalAmount,
    downpaymentAmount,
    remainingBalance,
  };
}
