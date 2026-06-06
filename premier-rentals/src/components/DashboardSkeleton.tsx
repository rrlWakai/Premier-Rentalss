export default function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#1a1a1a]">
      <aside className="hidden w-64 flex-col gap-6 border-r border-white/10 bg-[#111] p-6 lg:flex">
        <div className="h-4 w-24 rounded bg-white/10" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-full rounded bg-white/6" />
          ))}
        </div>
      </aside>
      <main className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded bg-white/10" />
          <div className="h-8 w-24 rounded bg-white/8" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/6" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-white/6" />
        <div className="h-48 rounded-xl bg-white/6" />
      </main>
    </div>
  );
}
