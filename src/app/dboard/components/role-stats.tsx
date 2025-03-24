"use client";

import { useEffect, useState } from "react";
import type { TierRole } from "@/types/roles";
import { fetchRoleCounts } from "@/actions/roles";

interface RoleStatsProps {
  roles: TierRole[];
  activeFilters: string[];
  onFilterToggle: (role: string) => void;
}

export function RoleStats({ roles, activeFilters, onFilterToggle }: RoleStatsProps) {
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCounts() {
      setLoading(true);
      const counts = await fetchRoleCounts(roles);
      setRoleCounts(counts);
      setLoading(false);
    }

    loadCounts();
  }, [roles]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Verified":
        return "border-emerald-400 bg-emerald-400/10";
      case "Pathfinder":
        return "border-blue-400 bg-blue-400/10";
      case "Navigator":
        return "border-indigo-400 bg-indigo-400/10";
      case "Pilot":
        return "border-purple-400 bg-purple-400/10";
      default:
        return "border-gray-400 bg-gray-400/10";
    }
  };

  const getTierTextColor = (tier: string) => {
    switch (tier) {
      case "Verified":
        return "text-emerald-400";
      case "Pathfinder":
        return "text-blue-400";
      case "Navigator":
        return "text-indigo-400";
      case "Pilot":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  const getTierIconColor = (tier: string) => {
    switch (tier) {
      case "Verified":
        return "text-emerald-400/25";
      case "Pathfinder":
        return "text-blue-400/25";
      case "Navigator":
        return "text-indigo-400/25";
      case "Pilot":
        return "text-purple-400/25";
      default:
        return "text-gray-400/25";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-800/60 bg-[#1a1d29]/80 p-4 text-center">
        <div className="my-2 flex animate-pulse justify-center space-x-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 w-52 rounded-lg bg-gray-800/50"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar grid grid-cols-1 gap-4 overflow-x-auto pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Object.entries(roleCounts).map(([tier, count]) => {
        const isActive = activeFilters.includes(tier);

        return (
          <div
            key={tier}
            onClick={() => onFilterToggle(tier)}
            className={`relative flex h-24 items-center rounded-xl p-4 shadow-sm transition-all duration-200 ${
              isActive ? `${getTierColor(tier)} -translate-y-0.5 transform border-2 shadow-lg` : "border border-gray-800/60 bg-[#1a1d29]/80 hover:border-gray-700 hover:bg-[#1e2235]/80"
            } min-w-[200px] cursor-pointer`}
          >
            {/* Background icon for visual interest */}
            <div className="pointer-events-none absolute right-3 bottom-1 opacity-30">
              <svg className={`h-12 w-12 ${getTierIconColor(tier)}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1v3m0 16v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M1 12h3m16 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
              </svg>
            </div>

            <div className="z-10 flex-1">
              <div className={`text-sm font-medium ${isActive ? getTierTextColor(tier) : "text-gray-300"} mb-1`}>{tier}</div>
              <div className={`text-2xl font-bold ${isActive ? getTierTextColor(tier) : "text-white"}`}>{count.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{count === 1 ? "member" : "members"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
