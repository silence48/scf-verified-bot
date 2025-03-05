import Image from "next/image";
import { X } from "lucide-react";
import "@/css/rolestats.css";

interface RoleStatsProps {
  activeFilters: string[];
  onFilterToggle: (role: string) => void;
}

export function RoleStats({ activeFilters, onFilterToggle }: RoleStatsProps) {
  const stats = [
    {
      name: "Verified",
      roleId: "1234567890",
      count: 600,
      iconSrc: "/verified.png",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      countColor: "text-emerald-300",
    },
    {
      name: "Pathfinder",
      roleId: "1234567891",
      count: 24,
      iconSrc: "/pathfinder.png",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      countColor: "text-blue-300",
    },
    {
      name: "Navigator",
      roleId: "1234567892",
      count: 18,
      iconSrc: "/navigator.png",
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/30",
      countColor: "text-indigo-300",
    },
    {
      name: "Pilot",
      roleId: "1234567893",
      count: 32,
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
            onClick={() => onFilterToggle(stat.name)}
            className={
              isActive
                ? `role-stats-card ${stat.bgColor} ${stat.borderColor} ${stat.color}`
                : `role-stats-card role-stats-card-inactive`
            }
          >
            <div className="relative">
              <Image
                src={stat.iconSrc}
                alt={`${stat.name} icon`}
                width={32}
                height={32}
              />
              {isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterToggle(stat.name);
                  }}
                  className="role-stats-card-close"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div>
              <p className={isActive ? stat.color : "role-stats-name"}>
                {stat.name}
              </p>
              <p className={isActive ? stat.countColor : "role-stats-count"}>
                {stat.count}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
