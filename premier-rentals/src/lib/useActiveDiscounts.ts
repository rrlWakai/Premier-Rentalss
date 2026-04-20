import { useState, useEffect, useCallback } from "react";

export interface ActivePromoDiscount {
  name: string;
  percentage: number;
  applies_to: "all" | "property" | "rate";
  property_ids: string[] | null;
}

interface UseActiveDiscountsResult {
  discounts: ActivePromoDiscount[];
  loading: boolean;
  getBestDiscount: (propertySlug: string) => ActivePromoDiscount | null;
}

export function useActiveDiscounts(): UseActiveDiscountsResult {
  const [discounts, setDiscounts] = useState<ActivePromoDiscount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/discounts/active")
      .then((res) => (res.ok ? res.json() : { discounts: [] }))
      .then((data) => {
        if (!cancelled) setDiscounts(data.discounts ?? []);
      })
      .catch(() => {
        if (!cancelled) setDiscounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Returns the highest-percentage discount that applies to the given property slug.
  // Mirrors backend resolution: "all" scope matches any property;
  // "property" scope matches only if the slug is in property_ids.
  // "rate"-scoped discounts are intentionally excluded — they depend on the
  // rate label selected in the booking form, which is unknown at this stage.
  const getBestDiscount = useCallback(
    (propertySlug: string): ActivePromoDiscount | null => {
      const matching = discounts.filter((d) => {
        if (d.applies_to === "all") return true;
        if (d.applies_to === "property") {
          return (
            Array.isArray(d.property_ids) &&
            d.property_ids.includes(propertySlug)
          );
        }
        return false;
      });

      if (matching.length === 0) return null;

      // API already returns ordered by percentage DESC, but reduce is explicit
      // and safe regardless of ordering.
      return matching.reduce((best, d) =>
        d.percentage > best.percentage ? d : best,
      );
    },
    [discounts],
  );

  return { discounts, loading, getBestDiscount };
}
