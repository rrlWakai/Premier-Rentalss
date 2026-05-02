import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import type { CalendarDay } from "../../types/availability";

interface DayCellProps {
  day: CalendarDay;
}

const STATUS_STYLES = {
  available: {
    bg: "bg-premier-gold-lt hover:bg-premier-gold",
    text: "text-premier-dark",
    border: "border-premier-gold",
  },
  pending: {
    bg: "bg-premier-gold-lt/50 hover:bg-premier-gold-lt/70",
    text: "text-premier-dark/70",
    border: "border-premier-gold/50",
  },
  unavailable: {
    bg: "bg-premier-muted/10",
    text: "text-premier-muted",
    border: "border-premier-border",
  },
};

export default function DayCell({ day }: DayCellProps) {
  const date = parseISO(day.date);
  const dayNumber = format(date, "d");
  const styles = STATUS_STYLES[day.status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`
        aspect-square border rounded-lg flex items-center justify-center
        text-sm font-medium cursor-default transition-colors
        ${styles.bg} ${styles.text} ${styles.border}
      `}
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {dayNumber}
    </motion.div>
  );
}
