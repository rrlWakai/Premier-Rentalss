import { useState } from "react";
import { addMonths, subMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAvailability } from "../../lib/useAvailability";
import type { PropertySlug } from "../../types/availability";
import CalendarGrid from "./CalendarGrid";
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
    <section
      id="availability"
      className="py-16"
      style={{ backgroundColor: "#faf8f4" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="overflow-hidden"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2ddd4",
            borderRadius: "12px",
          }}
        >
          <div
            className="flex flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            style={{ borderColor: "#e2ddd4" }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-auto">
              <div
                className="rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.18em] w-full sm:w-auto"
                style={{
                  fontFamily: "Jost, sans-serif",
                  border: "1px solid #d4a853",
                  backgroundColor: "#faf8f4",
                  color: "#1a1612",
                }}
              >
                <select
                  value={selectedProperty}
                  onChange={(e) =>
                    setSelectedProperty(e.target.value as PropertySlug)
                  }
                  className="w-full bg-transparent outline-none"
                  style={{
                    fontFamily: "Jost, sans-serif",
                    color: "#1a1612",
                  }}
                >
                  {PROPERTIES.map((prop) => (
                    <option key={prop.slug} value={prop.slug}>
                      {prop.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]"
                style={{ fontFamily: "Jost, sans-serif", color: "#8a7f6e" }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: "6px",
                    height: "6px",
                    backgroundColor: live ? "#d4a853" : "#c0b9ae",
                    animation: live ? "pulse 2s infinite" : "none",
                  }}
                />
                {live ? "Live" : "Offline"}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
              <button
                onClick={prevMonth}
                style={{
                  width: "26px",
                  height: "26px",
                  border: "0.5px solid #e2ddd4",
                  borderRadius: "4px",
                  backgroundColor: "#ffffff",
                  color: "#1a1612",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <p
                className="text-[13px] uppercase tracking-[0.16em] truncate"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  color: "#1a1612",
                  textAlign: "center",
                }}
              >
                {format(currentDate, "MMMM yyyy")}
              </p>
              <button
                onClick={nextMonth}
                style={{
                  width: "26px",
                  height: "26px",
                  border: "0.5px solid #e2ddd4",
                  borderRadius: "4px",
                  backgroundColor: "#ffffff",
                  color: "#1a1612",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div
            className="px-4 py-2 sm:px-6"
            style={{ borderBottom: "1px solid #e2ddd4" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block rounded-full"
                style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor: live ? "#d4a853" : "#c0b9ae",
                  animation: live ? "pulse 2s infinite" : "none",
                }}
              />
              <span
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{
                  fontFamily: "Jost, sans-serif",
                  color: "#8a7f6e",
                }}
              >
                {live ? "Live" : "Offline"}
              </span>
            </div>
          </div>

          <CalendarGrid
            days={days}
            loading={loading}
            year={year}
            month={month}
          />

          <StatusLegend />
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.4;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
