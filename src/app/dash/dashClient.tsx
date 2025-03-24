// app/dash/MembersDashboardClient.tsx
"use client";

import { useState } from "react";
import { RoleStats } from "@/components/RoleStats";
import { UserTable } from "@/components/UserTable";
import { Footer } from "@/components/footer";
import { MemberInfo } from "@/discord-bot/types";
import { RoleFilter, Sidebar } from "@/components/SideBar";

interface MembersDashboardClientProps {
  guildId: string;
  roleStats: {
    verified: number;
    pathfinder: number;
    navigator: number;
    pilot: number;
  };
  members: MemberInfo[];
  roleFilters: RoleFilter[];
}

/**
 * A client component receiving data from the server parent.
 * Manages ephemeral filters, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MembersDashboardClient({ guildId, roleStats, members, roleFilters }: MembersDashboardClientProps) {
  console.log("in member dash client");

  // local filter state:
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  // Clear all filters
  function clearFilters() {
    setActiveFilters([]);
  }

  function onFilterToggle(role: string) {
    setActiveFilters((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  return (
    <div className="container mx-auto px-4 pb-6">
      <div className="my-4 flex items-center justify-between">
        <h2 className="mb-4 font-schabo text-2xl tracking-wide">Members Overview</h2>
        {/* Removed the "Refresh from Discord" server action button */}
        <button onClick={clearFilters} className="rounded bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300">
          Clear Filters
        </button>
      </div>
      <Sidebar roleFilters={roleFilters} activeFilters={activeFilters} onFilterToggle={onFilterToggle} />
      {/* Role Stats (client side) */}
      <RoleStats
        activeFilters={activeFilters}
        onFilterToggleAction={onFilterToggle}
        verifiedCount={roleStats.verified}
        pathfinderCount={roleStats.pathfinder}
        navigatorCount={roleStats.navigator}
        pilotCount={roleStats.pilot}
      />

      <UserTable activeFilters={activeFilters} onFilterToggleAction={onFilterToggle} members={members} />

      <Footer />
    </div>
  );
}
