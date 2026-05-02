export default function StatusLegend() {
  return (
    <div className="px-4 py-4 border-t border-premier-border bg-premier-cream">
      <div className="flex items-center justify-center gap-2">
        <div className="w-3 h-3 rounded-sm bg-premier-gold border border-premier-gold" />
        <span
          className="text-sm text-premier-dark uppercase tracking-[0.16em]"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          Reserved dates only
        </span>
      </div>
    </div>
  );
}
