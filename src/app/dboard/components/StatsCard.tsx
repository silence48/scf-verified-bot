export function StatsCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="relative flex h-20 items-center rounded-xl border border-gray-800/60 bg-[#1a1d29]/80 p-4 shadow-sm transition-all duration-200 hover:border-gray-700 hover:bg-[#1e2235]/80">
      <div className="pointer-events-none absolute right-3 bottom-1 opacity-20">
        {icon}
      </div>
      
      <div className="z-10 flex-1">
        <div className="mb-1 text-sm font-medium text-gray-300">{title}</div>
        <div className="text-xl font-bold text-white">{value.toLocaleString()}</div>
      </div>
    </div>
  );
}