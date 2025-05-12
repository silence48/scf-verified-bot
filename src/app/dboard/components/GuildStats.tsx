import { UserIcon } from "lucide-react";
import { StatsCard } from "./StatsCard";
import type { LoadGuildData } from "@/types/discord-bot";
import type { TierRole } from "@/types/roles";

interface GuildStatsProps {
  guildData: LoadGuildData;
  roles: TierRole[];
}

export default function GuildStats({ guildData, roles }: GuildStatsProps) {
  const { members, userbadges } = guildData;
  
  // Calculate stats
  const totalMembers = members.length;
  const totalRoles = roles.length;
  const totalBadges = userbadges.reduce((acc, userBadge) => acc + userBadge.badges.length, 0);
  
  // Calculate additional stats
  const uniquePublicKeys = new Set(userbadges.map((badge) => badge.publicKey)).size;

  // Count badges that belong to members in our system
  const memberDiscordIds = new Set(members.map((member) => member.discordId));
  const badgesForMembers = userbadges.reduce((count, userBadge) => {
    if (userBadge.discordId && memberDiscordIds.has(userBadge.discordId)) {
      return count + userBadge.badges.length;
    }
    return count;
  }, 0);

  // Calculate average badges per member with badges
  const membersWithBadges = userbadges.filter((badge) => 
    badge.discordId && memberDiscordIds.has(badge.discordId)
  ).length;
  
  const averageBadgesPerMember = membersWithBadges > 0 
    ? Math.round((badgesForMembers / membersWithBadges) * 10) / 10 
    : 0;

  return (
    <div>
      <div className="mb-4">
        <h2 className="section-title">Community Stats</h2>
      </div>

      {/* First row of stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard 
          title="Total Users" 
          value={totalMembers} 
          icon={<UserIcon className="h-5 w-5 text-blue-400" />} 
        />
        <StatsCard
          title="Total Roles"
          value={totalRoles}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          }
        />
        <StatsCard
          title="Total Badges"
          value={totalBadges}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
              <path d="M12 15l-2 5l9-9l-9-9l2 5l-9 9l9-9"></path>
            </svg>
          }
        />
      </div>

      {/* Second row of stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Unique Wallets"
          value={uniquePublicKeys}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          }
        />
        <StatsCard
          title="Members with Badges"
          value={membersWithBadges}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-2-3.5"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              <circle cx="19" cy="15" r="2"></circle>
            </svg>
          }
        />
        <StatsCard
          title="Avg. Badges per User"
          value={averageBadgesPerMember}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          }
        />
      </div>
    </div>
  );
}