"use client";
import Image from "next/image";
import { X } from "lucide-react";

interface RoleStatsProps {
  activeFilters: string[];
  onFilterToggleAction: (role: string) => void;
  verifiedCount: number;
  pathfinderCount: number;
  navigatorCount: number;
  pilotCount: number;
}

export function RoleStats({ activeFilters, onFilterToggleAction, verifiedCount, pathfinderCount, navigatorCount, pilotCount }: RoleStatsProps) {
  const stats = [
    {
      name: "SCF Verified",
      count: verifiedCount,
      iconSrc: "/verified.png",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      countColor: "text-emerald-300",
    },
    {
      name: "SCF Pathfinder",
      count: pathfinderCount,
      iconSrc: "/pathfinder.png",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      countColor: "text-blue-300",
    },
    {
      name: "SCF Navigator",
      count: navigatorCount,
      iconSrc: "/navigator.png",
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/30",
      countColor: "text-indigo-300",
    },
    {
      name: "SCF Pilot",
      count: pilotCount,
      iconSrc: "/pilot.png",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
      countColor: "text-purple-300",
    },
  ];

  return (
    <div className="role-stats-grid">
      {stats.map((stat) => {
        const isActive = activeFilters.includes(stat.name);
        return (
          <div
            key={stat.name}
            onClick={() => onFilterToggleAction(stat.name)}
            className={isActive ? `role-stats-card ${stat.bgColor} ${stat.borderColor} ${stat.color}` : "role-stats-card role-stats-card-inactive"}
          >
            <div className="relative">
              <Image src={stat.iconSrc} alt={`${stat.name} icon`} width={32} height={32} />
              {isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterToggleAction(stat.name);
                  }}
                  className="role-stats-card-close"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div>
              <p className={isActive ? stat.color : "role-stats-name"}>{stat.name}</p>
              <p className={isActive ? stat.countColor : "role-stats-count"}>{stat.count}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
