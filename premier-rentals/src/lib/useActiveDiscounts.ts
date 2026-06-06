import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

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
  const { data: discounts = [], isLoading: loading } = useQuery({
    queryKey: ["active-discounts"],
    queryFn: async () => {
      const res = await fetch("/api/discounts/active");
      if (!res.ok) return [];
      const data = await res.json();
      return (data.discounts ?? []) as ActivePromoDiscount[];
    },
    staleTime: 5 * 60 * 1000,
  });

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

      return matching.reduce((best, d) =>
        d.percentage > best.percentage ? d : best,
      );
    },
    [discounts],
  );

  return { discounts, loading, getBestDiscount };
}
