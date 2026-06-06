export default function PageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f4ee]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c9a96e] border-t-transparent" />
        <p
          className="text-[10px] uppercase tracking-[0.25em] text-[#8a8a7a]"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          Loading…
        </p>
      </div>
    </div>
  );
}
