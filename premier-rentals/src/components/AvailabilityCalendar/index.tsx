import { useState } from "react";
import { addMonths, subMonths, format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  CalendarDays,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAvailability } from "../../lib/useAvailability";
import type { PropertySlug } from "../../types/availability";
import CalendarGrid from "./CalendarGrid";
import LiveIndicator from "./LiveIndicator";
import StatusLegend from "./StatusLegend";

const PROPERTIES: { slug: PropertySlug; name: string }[] = [
  { slug: "premier-patio", name: "Premier Patio" },
  { slug: "premier-pool-house", name: "Premier Pool House" },
];

export default function AvailabilityCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProperty, setSelectedProperty] =
    useState<PropertySlug>("premier-patio");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-based

  const { days, live, loading } = useAvailability(
    selectedProperty,
    year,
    month,
  );

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <section id="availability" className="py-16 bg-premier-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <CalendarDays size={20} color="#d4a853" />
            <h2
              className="text-3xl sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Check Availability
            </h2>
          </div>
          <p
            className="text-lg text-premier-muted max-w-2xl mx-auto"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            View real-time availability for our premier properties. Select a
            property and date to check availability.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-premier-border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-premier-border px-4 py-4 sm:px-6">
            <motion.button
              onClick={prevMonth}
              className="p-2 hover:bg-premier-gold-lt rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
            >
              <ChevronLeft size={16} color="#8a7f6e" />
            </motion.button>

            <div className="flex flex-col items-center gap-2">
              <h3
                className="text-xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {format(currentDate, "MMMM yyyy")}
              </h3>
              <div className="flex items-center gap-2">
                <Building2 size={14} color="#d4a853" />
                <select
                  value={selectedProperty}
                  onChange={(e) =>
                    setSelectedProperty(e.target.value as PropertySlug)
                  }
                  className="rounded-full border border-premier-border bg-premier-gold-lt px-3 py-1 text-sm uppercase tracking-[0.16em] text-premier-dark outline-none focus:border-premier-gold"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  {PROPERTIES.map((prop) => (
                    <option key={prop.slug} value={prop.slug}>
                      {prop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <motion.button
              onClick={nextMonth}
              className="p-2 hover:bg-premier-gold-lt rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
            >
              <ChevronRight size={16} color="#8a7f6e" />
            </motion.button>
          </div>

          {/* Status bar */}
          <div className="px-4 py-2 border-b border-premier-border bg-premier-cream">
            <LiveIndicator live={live} />
          </div>

          {/* Calendar */}
          <CalendarGrid
            days={days}
            loading={loading}
            year={year}
            month={month}
          />

          {/* Legend */}
          <StatusLegend />
        </div>
      </div>
    </section>
  );
}
