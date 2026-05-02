import { parseISO, isToday as dateIsToday } from "date-fns";
import type { CalendarDay } from "../../types/availability";

interface DayCellProps {
  day: CalendarDay;
}

export default function DayCell({ day }: DayCellProps) {
  const date = parseISO(day.date);
  const dayNumber = parseInt(day.date.split("-")[2]);
  const isCurrentDay = dateIsToday(date);
  const unavailable = day.status === "unavailable";
  const pending = day.status === "pending";

  const numberColor = unavailable ? "#d4a853" : "#1a1612";
  const numberColorToday = isCurrentDay ? "#d4a853" : numberColor;
  const dotColor = unavailable ? "#d4a853" : pending ? "#d4a853" : "#8a8a7a";
  const borderStyle = isCurrentDay
    ? "1px solid #d4a85366"
    : "1px solid transparent";

  return (
    <div
      style={{
        aspectRatio: "1",
        border: borderStyle,
        borderRadius: "4px",
        backgroundColor: "#ffffff",
        padding: "6px 4px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
      }}
    >
      <span
        style={{
          fontFamily: "Jost, sans-serif",
          fontSize: "13px",
          color: numberColorToday,
          fontWeight: "500",
          lineHeight: "1",
        }}
      >
        {dayNumber}
      </span>
      {unavailable && (
        <span
          style={{
            fontFamily: "Jost, sans-serif",
            fontSize: "7px",
            color: "#d4a853",
            fontWeight: "600",
            letterSpacing: "0.05em",
            lineHeight: "1",
          }}
        >
          RESERVED
        </span>
      )}
      {!unavailable && day.status !== "available" && (
        <span
          style={{
            display: "inline-block",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            backgroundColor: dotColor,
          }}
        />
      )}
    </div>
  );
}
