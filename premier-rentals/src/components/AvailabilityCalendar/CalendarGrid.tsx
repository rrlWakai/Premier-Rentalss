import { AnimatePresence, motion } from "framer-motion";
import { startOfMonth, getDay } from "date-fns";
import DayCell from "./DayCell";
import type { CalendarDay } from "../../types/availability";

interface CalendarGridProps {
  days: CalendarDay[];
  loading: boolean;
  year: number;
  month: number;
}

export default function CalendarGrid({
  days,
  loading,
  year,
  month,
}: CalendarGridProps) {
  const startDate = startOfMonth(new Date(year, month - 1));
  const startDay = getDay(startDate); // 0 = Sunday

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-4 sm:p-6">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-premier-muted uppercase tracking-[0.16em]"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-7 gap-1"
        >
          {/* Empty cells for days before start of month */}
          {Array.from({ length: startDay }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {days.map((day) => (
            <DayCell key={day.date} day={day} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premier-gold"></div>
        </div>
      )}
    </div>
  );
}
