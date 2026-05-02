export default function StatusLegend() {
  const statuses = [
    {
      status: "available",
      label: "Available",
      color: "bg-premier-gold-lt border-premier-gold",
    },
    {
      status: "pending",
      label: "Pending",
      color: "bg-premier-gold-lt/50 border-premier-gold/50",
    },
    {
      status: "unavailable",
      label: "Unavailable",
      color: "bg-premier-muted/10 border-premier-border",
    },
  ];

  return (
    <div className="px-4 py-4 border-t border-premier-border bg-premier-cream">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {statuses.map(({ status, label, color }) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-4 h-4 border rounded ${color}`} />
            <span
              className="text-sm text-premier-dark uppercase tracking-[0.16em]"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
