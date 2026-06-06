const SLOT_ITEMS = [
  { label: "D",  full: "Daytime" },
  { label: "N",  full: "Nighttime" },
  { label: "O",  full: "Overnight" },
] as const;

const STATUS_ITEMS = [
  { color: "#5a9e6f", label: "Available" },
  { color: "#d4a853", label: "Pending" },
  { color: "#b8ac9b", label: "Unavailable" },
] as const;

export default function StatusLegend() {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: "1px solid #e2ddd4",
        backgroundColor: "#faf8f4",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {/* Slot key */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        {SLOT_ITEMS.map(({ label, full }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: "9px",
                fontWeight: "600",
                color: "#4a4030",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: "9px",
                color: "#8a7f6e",
              }}
            >
              {full}
            </span>
          </div>
        ))}
      </div>
      {/* Status colors */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        {STATUS_ITEMS.map(({ color, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: color,
              }}
            />
            <span
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: "9px",
                color: "#6a6050",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
