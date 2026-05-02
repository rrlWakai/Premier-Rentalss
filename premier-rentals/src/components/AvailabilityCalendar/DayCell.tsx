import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import type { CalendarDay } from "../../types/availability";

interface DayCellProps {
  day: CalendarDay;
}

export default function DayCell({ day }: DayCellProps) {
  const date = parseISO(day.date);
  const dayNumber = format(date, "d");
  const reserved = day.status !== "available";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`
        aspect-square border rounded-lg flex flex-col items-center justify-center
        text-sm font-medium transition-all duration-150
        ${reserved ? "bg-premier-gold text-white border-premier-gold" : "bg-white text-premier-muted border-premier-border"}
      `}
      style={{ fontFamily: "var(--font-ui)" }}
    >
      <span>{dayNumber}</span>
      {reserved && (
        <span className="mt-1 text-[10px] uppercase tracking-[0.2em]">
          Reserved
        </span>
      )}
    </motion.div>
  );
}
