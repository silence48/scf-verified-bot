"use client";

import type { TierRole } from "@/types/roles";

interface RoleStatsProps {
  roles: TierRole[]
  activeFilters: string[]
  onFilterToggle: (role: string) => void
}

export function RoleStats({ roles, activeFilters, onFilterToggle }: RoleStatsProps) {
  // Count roles by tier
  const roleCounts = roles.reduce((acc: Record<string, number>, role) => {
    if (!acc[role.tier]) {
      acc[role.tier] = 0;
    }
    acc[role.tier]++;
    return acc;
  }, {});

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

  return (
    <div className="role-stats-grid">
      {Object.entries(roleCounts).map(([tier, count]) => (
        <div
          key={tier}
          className={`role-stats-card relative ${
            activeFilters.includes(tier) ? getTierColor(tier) : "role-stats-card-inactive"
          } ${activeFilters.includes(tier) ? "border-2" : "border"}`}
          onClick={() => onFilterToggle(tier)}
        >
          {activeFilters.includes(tier) && (
            <button
              className="role-stats-card-close"
              onClick={(e) => {
                e.stopPropagation();
                onFilterToggle(tier);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
          <div className="flex-1">
            <div className="role-stats-name">{tier}</div>
            <div className={`role-stats-count ${getTierTextColor(tier)}`}>{count}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

