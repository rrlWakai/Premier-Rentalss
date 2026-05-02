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
  const startDay = getDay(startDate);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={{ padding: "12px 16px", fontSize: "14px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
          marginBottom: "8px",
        }}
      >
        {weekDays.map((day) => (
          <div
            key={day}
            style={{
              textAlign: "center",
              fontSize: "9px",
              fontFamily: "Jost, sans-serif",
              color: "#8a7f6e",
              fontWeight: "400",
              letterSpacing: "0.08em",
              paddingBottom: "4px",
            }}
          >
            {day}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
        }}
      >
        {Array.from({ length: startDay }, (_, i) => (
          <div key={`empty-${i}`} style={{ aspectRatio: "1" }} />
        ))}
        {days.map((day) => (
          <DayCell key={day.date} day={day} />
        ))}
      </div>

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 0",
          }}
        >
          <div
            style={{
              animation: "spin 1s linear infinite",
              width: "32px",
              height: "32px",
              border: "2px solid #d4a853",
              borderTop: "2px solid transparent",
              borderRadius: "50%",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
