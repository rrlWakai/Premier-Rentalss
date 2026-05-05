import { parseISO, isToday as dateIsToday } from "date-fns";
import type { CalendarDay } from "../../types/availability";

interface DayCellProps {
  day: CalendarDay;
}

export default function DayCell({ day }: DayCellProps) {
  const date = parseISO(day.date);
  const dayNumber = parseInt(day.date.split("-")[2]);
  const isCurrentDay = dateIsToday(date);
  const reserved = day.status !== "available"; // Pending and unavailable both show as RESERVED on client

  const numberColor = reserved ? "#d4a853" : "#1a1612";
  const numberColorToday = isCurrentDay ? "#d4a853" : numberColor;
  const dotColor = reserved ? "#d4a853" : "#8a8a7a";
  const borderStyle = isCurrentDay
    ? "1px solid #d4a85366"
    : "1px solid transparent";

  return (
    <div
      style={{
        aspectRatio: "1",
        border: borderStyle,
        borderRadius: "4px",
        backgroundColor: reserved ? "#f7f3e8" : "#ffffff",
        padding: "6px 4px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
      }}
    >
      <span
        style={{
          fontFamily: "Jost, sans-serif",
          fontSize: "13px",
          color: numberColorToday,
          fontWeight: "700",
          lineHeight: "1",
        }}
      >
        {dayNumber}
      </span>
      {reserved ? (
        <span
          style={{
            fontFamily: "Jost, sans-serif",
            fontSize: "8px",
            color: "#854d00",
            fontWeight: "700",
            letterSpacing: "0.08em",
            lineHeight: "1",
            textTransform: "uppercase",
            padding: "2px 6px",
            borderRadius: "999px",
            backgroundColor: "#fff2d3",
          }}
        >
          RESERVED
        </span>
      ) : (
        <span
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: dotColor,
          }}
        />
      )}
    </div>
  );
}
