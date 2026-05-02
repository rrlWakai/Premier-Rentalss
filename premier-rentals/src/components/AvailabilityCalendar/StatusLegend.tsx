export default function StatusLegend() {
  const statuses = [
    { color: "#d4a853", label: "Available" },
    { color: "#d4a853", label: "Pending" },
    { color: "#e5e2dc", label: "Unavailable" },
  ];

  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: "1px solid #e2ddd4",
        backgroundColor: "#faf8f4",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
      }}
    >
      {statuses.map((status, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: status.color,
            }}
          />
          <span
            style={{
              fontFamily: "Jost, sans-serif",
              fontSize: "10px",
              color: "#6a6050",
              textTransform: "capitalize",
            }}
          >
            {status.label}
          </span>
        </div>
      ))}
    </div>
  );
}
