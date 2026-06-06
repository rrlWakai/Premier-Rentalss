import { parseISO, isToday as dateIsToday } from "date-fns";
import type { CalendarDay, SlotName, AvailabilityStatus } from "../../types/availability";

interface DayCellProps {
  day: CalendarDay;
}

const SLOT_LABELS: { key: SlotName; label: string }[] = [
  { key: "daytime",    label: "D" },
  { key: "nighttime",  label: "N" },
  { key: "overnight",  label: "O" },
];

const STATUS_COLORS: Record<AvailabilityStatus, string> = {
  available:   "#5a9e6f",
  pending:     "#d4a853",
  unavailable: "#b8ac9b",
};

export default function DayCell({ day }: DayCellProps) {
  const date = parseISO(day.date);
  const dayNumber = parseInt(day.date.split("-")[2]);
  const isCurrentDay = dateIsToday(date);
  const reserved = day.status !== "available";
  const numberColor = reserved ? "#dca827" : "#1a1612";
  const numberColorToday = isCurrentDay ? "#d4a853" : numberColor;
  const borderStyle = isCurrentDay
    ? "1px solid #d4a85366"
    : "1px solid transparent";

  return (
    <div
      style={{
        aspectRatio: "1",
        border: borderStyle,
        borderRadius: "4px",
        backgroundColor: reserved ? "#fbf8f2" : "#ffffff",
        padding: "6px 2px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "3px",
        }}
      >
        {SLOT_LABELS.map(({ key, label }) => {
          const slotStatus = day.slots?.[key] ?? "available";
          return (
            <span
              key={key}
              title={key}
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: "7px",
                fontWeight: "600",
                lineHeight: "1",
                color: STATUS_COLORS[slotStatus],
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
