// app/dash/MembersDashboardClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoleStats } from "@/components/RoleStats";
import { UserTable } from "@/components/UserTable";
import { Footer } from "@/components/footer";
import { refreshGuildFromDiscord } from "./actions";

interface MembersDashboardClientProps {
  guildId: string;
  roleStats: {
    verified: number;
    pathfinder: number;
    navigator: number;
    pilot: number;
  };
  members: Array<{
    discordId: string;
    name: string;
    avatar: string;
    memberSince: string;
    joinedDiscord: string;
    roles: Array<{ name: string; obtained: string }>;
    profileDescription: string;
    joinedStellarDevelopers?: string;
  }>;
}

/**
 * A client component receiving data from the server parent.
 * Manages ephemeral filters, calls server actions, etc.
 */
export default function MembersDashboardClient({
  guildId,
  roleStats,
  members,
}: MembersDashboardClientProps) {
  // local filter state:
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Next.js 13 client router to force a re-fetch of the server component
  const router = useRouter();

  // Filter toggling
  function onFilterToggle(role: string) {
    setActiveFilters((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  // Action to forcibly re-sync from Discord => DB, then refresh the page
  async function handleFullRefresh() {
    try {
      await refreshGuildFromDiscord(guildId);
      // after the server action completes, re-run the server component
      router.refresh(); 
    } catch (err) {
      console.error("Error refreshing from Discord:", err);
    }
  }

  return (
    <div className="container mx-auto px-4 pb-6">
      <div className="flex items-center justify-between my-4">
        <h2 className="text-2xl font-schabo tracking-wide mb-4">
          Members Overview
        </h2>
        <button
          onClick={handleFullRefresh}
          className="px-3 py-1 bg-blue-700 text-sm rounded"
        >
          Refresh from Discord
        </button>
      </div>

      {/* Role Stats (client side) */}
      <RoleStats
        activeFilters={activeFilters}
        onFilterToggleAction={onFilterToggle} // local ephemeral toggler
        verifiedCount={roleStats.verified}
        pathfinderCount={roleStats.pathfinder}
        navigatorCount={roleStats.navigator}
        pilotCount={roleStats.pilot}
      />

      {/* Members Table (client side) */}
      <UserTable
        activeFilters={activeFilters}
        onFilterToggleAction={onFilterToggle}
        members={members}
      />

      <Footer />
    </div>
  );
}
