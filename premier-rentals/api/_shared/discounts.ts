import { supabaseAdmin } from "./supabaseAdmin";
import { type ActiveDiscount, normalizeLabel } from "./pricing";

// Returns the single best-matching active discount for a given booking, or null.
// Best = highest percentage when multiple discounts qualify.
// Best-effort: returns null on any DB error so discounts never block a booking.
export async function getActiveDiscount(
  reservationDate: string,
  propertyId: string,
  rateLabel: string,
): Promise<ActiveDiscount | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("discounts")
      .select("id, name, percentage, applies_to, property_ids, rate_labels")
      .eq("active", true)
      .lte("start_date", reservationDate)
      .gte("end_date", reservationDate);

    if (error) {
      console.warn("[PRICING] discount lookup failed (non-blocking):", error.message);
      return null;
    }

    if (!data?.length) return null;

    const normalizedLabel = normalizeLabel(rateLabel);

    const matching = data.filter((d) => {
      if (d.applies_to === "all") return true;
      if (d.applies_to === "property") {
        return Array.isArray(d.property_ids) && d.property_ids.includes(propertyId);
      }
      if (d.applies_to === "rate") {
        return (
          Array.isArray(d.rate_labels) &&
          d.rate_labels.some((l: string) => normalizeLabel(l) === normalizedLabel)
        );
      }
      return false;
    });

    if (!matching.length) return null;

    matching.sort((a, b) => b.percentage - a.percentage);
    return matching[0] as ActiveDiscount;
  } catch (err) {
    console.warn("[PRICING] discount lookup threw unexpectedly (non-blocking):", err);
    return null;
  }
}
