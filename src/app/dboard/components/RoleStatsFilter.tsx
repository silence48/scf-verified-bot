"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function RoleStatsFilter({ 
  tier, 
  count 
}: { 
  tier: string; 
  count: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get active user filters from URL
  const activeUserFilters = searchParams.get("userFilters")?.split(",") || [];
  const isActive = activeUserFilters.includes(tier);
  
  // Handle filter toggle - only affects user filtering
  const handleFilterToggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    const newFilters = isActive
      ? activeUserFilters.filter(r => r !== tier)
      : [...activeUserFilters, tier];
    
    if (newFilters.length > 0) {
      params.set("userFilters", newFilters.join(","));
    } else {
      params.delete("userFilters");
    }
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  // Helper functions for styling based on tier
  const getTierColor = (tier: string) => {
    if (tier === "SCF Verified") return "border-emerald-400 bg-emerald-400/10";
    if (tier === "SCF Pathfinder") return "border-blue-400 bg-blue-400/10";
    if (tier === "SCF Navigator") return "border-indigo-400 bg-indigo-400/10";
    if (tier === "SCF Pilot") return "border-purple-400 bg-purple-400/10";
    return "border-gray-400 bg-gray-400/10";
  };
  
  const getTierTextColor = (tier: string) => {
    if (tier === "SCF Verified") return "text-emerald-400";
    if (tier === "SCF Pathfinder") return "text-blue-400";
    if (tier === "SCF Navigator") return "text-indigo-400";
    if (tier === "SCF Pilot") return "text-purple-400";
    return "text-gray-400";
  };
  
  const getTierIconColor = (tier: string) => {
    if (tier === "SCF Verified") return "text-emerald-400/25";
    if (tier === "SCF Pathfinder") return "text-blue-400/25";
    if (tier === "SCF Navigator") return "text-indigo-400/25";
    if (tier === "SCF Pilot") return "text-purple-400/25";
    return "text-gray-400/25";
  };
  
  return (
    <div
      onClick={handleFilterToggle}
      className={`
        relative flex h-20 items-center rounded-xl p-4 shadow-sm transition-all duration-200 
        ${isActive 
          ? `${getTierColor(tier)} -translate-y-0.5 transform border-2 shadow-lg` 
          : "border border-gray-800/60 bg-[#1a1d29]/80 hover:border-gray-700 hover:bg-[#1e2235]/80"
        } cursor-pointer
      `}
    >
      {/* Background icon */}
      <div className="pointer-events-none absolute right-3 bottom-1 opacity-30">
        <svg className={`h-10 w-10 ${getTierIconColor(tier)}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1v3m0 16v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M1 12h3m16 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
        </svg>
      </div>

      <div className="z-10 flex-1">
        <div className={`text-sm font-medium ${isActive ? getTierTextColor(tier) : "text-gray-300"} mb-1`}>
          {tier}
        </div>
        <div className={`text-xl font-bold ${isActive ? getTierTextColor(tier) : "text-white"}`}>
          {count.toLocaleString()}
        </div>
        <div className="text-xs text-gray-400">
          {count === 1 ? "member" : "members"}
        </div>
      </div>
    </div>
  );
}