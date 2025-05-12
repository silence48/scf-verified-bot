import type { LoadGuildData } from "@/types/discord-bot";
import UserList from "./UserList";
import ViewAllButton from "./ViewAllButton";

export function NoUsersFound() {
    return (
      <div className="rounded-lg border border-gray-800/60 bg-[#1a1d29]/80 p-6 text-center">
        <p className="text-gray-400">No users found matching your search criteria.</p>
      </div>
    );
  }

export default function RecentUsersSection({ guildData }: { guildData: LoadGuildData }) {
  const { members, userbadges } = guildData;
  
  // Create a badge map for efficient lookups
  const badgeMap = new Map(userbadges.map(badge => [badge.discordId, badge]));
  
  // Sort members by activity (same logic as in your original code)
  const sortedMembers = [...members].sort((a, b) => {
    const aBadge = badgeMap.get(a.discordId);
    const bBadge = badgeMap.get(b.discordId);

    // Last processed date first
    if (aBadge?.lastProcessed && bBadge?.lastProcessed) {
      return new Date(bBadge.lastProcessed).getTime() - new Date(aBadge.lastProcessed).getTime();
    } else if (aBadge?.lastProcessed) {
      return -1;
    } else if (bBadge?.lastProcessed) {
      return 1;
    }

    // Then member since date
    if (a.memberSince && b.memberSince) {
      return new Date(String(b.memberSince)).getTime() - new Date(String(a.memberSince)).getTime();
    } else if (a.memberSince) {
      return -1;
    } else if (b.memberSince) {
      return 1;
    }

    // Then joined date
    if (a.joinedStellarDevelopers && b.joinedStellarDevelopers) {
      return new Date(String(b.joinedStellarDevelopers)).getTime() - new Date(String(a.joinedStellarDevelopers)).getTime();
    } else if (a.joinedStellarDevelopers) {
      return -1;
    } else if (b.joinedStellarDevelopers) {
      return 1;
    }

    return 0;
  });
  
  const recentMembers = sortedMembers.slice(0, 10);
  
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">Recent Users</h2>
        <ViewAllButton />
      </div>

      {recentMembers.length > 0 ? (
        <UserList 
          members={recentMembers} 
          userBadges={userbadges} 
        />
      ) : (
        <NoUsersFound />
      )}
    </div>
  );
}