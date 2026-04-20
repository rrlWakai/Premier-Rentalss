import { motion } from "framer-motion";
import type { ActivePromoDiscount } from "../lib/useActiveDiscounts";

interface Props {
  discount: ActivePromoDiscount;
  className?: string;
}

export default function DiscountBadge({ discount, className = "" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 shadow-[0_2px_8px_rgba(16,185,129,0.35)] ${className}`}
    >
      <span
        className="text-[10px] font-bold tracking-wide text-white uppercase leading-none"
        style={{ fontFamily: "Jost, sans-serif" }}
      >
        🔥 {discount.percentage}% OFF
      </span>
      {discount.name && (
        <>
          <span className="text-emerald-200 text-[9px] leading-none select-none">
            ·
          </span>
          <span
            className="text-[9px] text-emerald-100 leading-none max-w-[120px] truncate"
            style={{ fontFamily: "Jost, sans-serif" }}
            title={discount.name}
          >
            {discount.name}
          </span>
        </>
      )}
    </motion.div>
  );
}
