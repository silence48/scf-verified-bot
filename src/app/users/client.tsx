"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { LoadGuildData } from "@/types/discord-bot";
import { AlertCircle } from "lucide-react";
import { UserTable } from "./components/UserTable";

interface UsersClientProps {
  guildData: LoadGuildData;
}

export default function UsersClient({ guildData }: UsersClientProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Get expanded user from URL
  const expandedUser = searchParams.get("expandedUser");
  const searchQuery = searchParams.get("search");

  // Set initial filters based on search query
  useEffect(() => {
    if (searchQuery) {
      // Check if search query matches any role names
      const roleTiers = ["Verified", "Pathfinder", "Navigator", "Pilot"];
      const matchingTiers = roleTiers.filter((tier) => tier.toLowerCase().includes(searchQuery.toLowerCase()));

      if (matchingTiers.length > 0) {
        setActiveFilters(matchingTiers);
      }
    }
  }, [searchQuery]);

  // Handle filter toggle
  const handleFilterToggle = (role: string) => {
    setActiveFilters((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  return (
    <div className="dark container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-wide text-white/90">Manage Users</h1>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/20 p-3 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <UserTable
        members={guildData.members}
        userbadges={guildData.userbadges}
        uservotes={guildData.uservotes}
        threads={guildData.threads}
        activeFilters={activeFilters}
        onFilterToggleAction={handleFilterToggle}
        initialExpandedUser={expandedUser || undefined}
      />
    </div>
  );
}
