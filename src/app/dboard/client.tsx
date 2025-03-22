"use client";

import type React from "react";

import { useState, useEffect } from "react";
import type { MemberInfo, PrecomputedBadge } from "@/types/discord-bot";
import type { TierRole } from "@/types/roles";
import { loadGuildData } from "@/actions/guild";
import { getAllRoles } from "@/actions/roles";
import { Search, ExternalLink, UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleStats } from "./components/role-stats";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@/components/ui";
import Image from "next/image";

// Member card component - reusing the MemberInfo type from discord-bot/types
function MemberCard({
  member,
  precomputedBadge,
}: {
  member: MemberInfo;
  precomputedBadge?: PrecomputedBadge;
}) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/users?expandedUser=${member.discordId}`);
  };

  return (
    <div
      className="card-container transition-all h-full flex flex-col hover:translate-y-[-2px] hover:shadow-lg cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar>
          <AvatarImage src={member.avatar || undefined} alt={member.username} />
          <AvatarFallback>
            {
              (() => {
                try {
                  return member.username ? member.username.substring(0, 2).toUpperCase() : "??";
                } catch (error) {
                  console.error(`Error generating avatar fallback for user: ${member}`, error);
                  return "??";
                }
              })()
            }
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="card-title">{member.username}</h3>
          {precomputedBadge?.publicKey && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 truncate max-w-[120px]">
                {precomputedBadge.publicKey.substring(0, 8)}...
                {precomputedBadge.publicKey.substring(precomputedBadge.publicKey.length - 8)}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://stellar.expert/explorer/public/account/${precomputedBadge.publicKey}`, "_blank");
                }}
                className="text-blue-400 inline-flex cursor-pointer"
              >
                <ExternalLink size={12} />
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-3 flex-1">
        <h4 className="text-sm font-medium text-white mb-2">Roles</h4>

        {member.roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {member.roles.map((role, index) => (
              <span key={index} className={`text-xs px-2 py-0.5 rounded-full badge-bg-${role.shortname.toLowerCase()}`}>
                {role.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No roles</p>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium text-white mb-2">Badges</h4>

        {precomputedBadge && precomputedBadge.badges.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {precomputedBadge.badges.slice(0, 3).map((badge, index) => (
              <div key={index} className="w-6 h-6 rounded overflow-hidden" title={badge.code}>
                <Image
                  width={120}
                  height={120}
                  src={badge.image}
                  alt={badge.code}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {precomputedBadge.badges.length > 3 && (
              <div className="w-6 h-6 rounded bg-[#12141e]/40 flex items-center justify-center text-xs font-medium text-gray-400">
                +{precomputedBadge.badges.length - 3}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No badges</p>
        )}
      </div>
    </div>
  );
}

// TierRole card component

function DashboardRoleCard({ role }: { role: TierRole }) {
  return (
    <Link href="/manageroles" className="block no-underline text-inherit">
      <div className="card-container transition-all h-full flex flex-col hover:translate-y-[-2px] hover:shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className={`badge-dot badge-${role.tier.toLowerCase()}`} />
          <div>
            <h3 className="card-title">{role.roleName}</h3>
            <span className="text-xs bg-[#12141e]/40 text-gray-400 px-2 py-0.5 rounded-full">
              {role.tier}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm text-gray-300 mb-3">{role.description}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-white mb-2">Requirements</h4>

          {/* If there are no groups, display a simple message */}
          {!role.requirementGroups || role.requirementGroups.length === 0 ? (
            <p className="text-sm text-gray-400">No requirements defined.</p>
          ) : (
            <div>
              {/* Show how the groups are combined overall */}
              <p className="text-xs text-gray-400 italic mb-2">
                {role.requirements === "ANY_GROUP"
                  ? "User must satisfy ALL requirements in at least ONE group."
                  : "User must satisfy ALL requirements in ALL groups."}
              </p>

              {/* Display each group */}
              {role.requirementGroups.map((group, gIdx) => (
                <div key={gIdx} className="mb-2">
                  <p className="text-sm text-gray-200 font-medium mb-1">
                    {group.name || `Group ${gIdx + 1}`}
                    <span className="text-xs text-gray-400 ml-2">
                      (
                      {group.groupMode === "ALL"
                        ? "All"
                        : "Any"}{" "}
                      required)
                    </span>
                  </p>
                  <ul className="list-disc pl-5 text-sm text-gray-400 space-y-1">
                    {group.requirements.map((req, rIdx) => (
                      <li key={rIdx}>
                        {req.type === "Discord" && "Join Discord"}
                        {req.type === "SocialVerification" && "Verify social account"}
                        {req.type === "StellarAccount" && "Verify Stellar address"}
                        {req.type === "BadgeCount" &&
                          `${req.minCount} badges from ${
                            req.badgeCategory || "any category"
                          }`}
                        {req.type === "ConcurrentRole" &&
                          `Have ${req.concurrentRoleName} role`}
                        {req.type === "ExistingRole" &&
                          `Already have ${req.existingRole} role`}
                        {req.type === "Nomination" &&
                          `Get nominated and receive ${req.nominationRequiredCount} upvotes`}
                        {req.type === "CommunityVote" &&
                          `Participate in ${
                            req.participationRounds
                          } Community Vote round${
                            req.participationRounds !== 1 ? "s" : ""
                          }`}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Stats card component
function StatsCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-container h-full">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <div className="bg-[#12141e]/40 rounded-lg p-2 flex items-center justify-center">{icon}</div>
      </div>
    </div>
  );
}

// Main component
export default function DashboardClient(initialGuildData: LoadGuildData, initialRoles) {
  const [recentMembers, setRecentMembers] = useState<MemberInfo[]>([]);
  const [userBadges, setUserBadges] = useState<PrecomputedBadge[]>(initialGuildData.userbadges);
  const [roles, setRoles] = useState<TierRole[]>(initialRoles);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const router = useRouter();

  // Fetch guild data and roles on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get guild data
        const guildId = "897514728459468821"; // Same as used in users/page.tsx
        const guildData = await loadGuildData(guildId);
        console.log(`fetched ${guildData.members.length}`);
        // Get all roles
        const rolesData = await getAllRoles();

        setMembers(guildData.members);
        setUserBadges(guildData.userbadges);
        setRoles(rolesData);

        // Create a map of discordId to precomputedBadge for easier lookup
        const badgeMap = new Map(guildData.userbadges.map((badge) => [badge.discordId, badge]));
        // Get recent members (sort by memberSince)
        // Sort members by lastProcessed date from precomputedBadge first,
        // then by memberSince date if no badge exists or as secondary criteria
        const sortedMembers = [...guildData.members].sort((a, b) => {

          const aBadge = badgeMap.get(a.discordId);
          const bBadge = badgeMap.get(b.discordId);

          // Compare by lastProcessed first
          if (aBadge?.lastProcessed && bBadge?.lastProcessed) {
            return new Date(bBadge.lastProcessed).getTime() - new Date(aBadge.lastProcessed).getTime();
          } else if (aBadge?.lastProcessed) {
            return -1; // a has lastProcessed, b doesn't, so a comes first
          } else if (bBadge?.lastProcessed) {
            return 1; // b has lastProcessed, a doesn't, so b comes first
          }

          // Fall back to memberSince if no badges or as secondary sort criteria
          const aDate = a.memberSince ? new Date(String(a.memberSince)).getTime() : 0;
          const bDate = b.memberSince ? new Date(String(b.memberSince)).getTime() : 0;

          return bDate - aDate; // Members with memberSince come first, sorted in descending order
        });

        setRecentMembers(sortedMembers.slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle filter toggle
  const handleFilterToggle = (role: string) => {
    setActiveFilters((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  // Filter members and roles based on search text and active filters
  const filteredMembers = members.filter(
    (member) =>
      (activeFilters.length === 0 || member.roles.some((role) => activeFilters.includes(role.shortname))) &&
      (member.username.toLowerCase().includes(searchText.toLowerCase()) ||
        member.discordId.toLowerCase().includes(searchText.toLowerCase()) ||
        member.roles.some((role) => role.name.toLowerCase().includes(searchText.toLowerCase()))),
  );

  const filteredRoles = roles.filter(
    (role) =>
      (activeFilters.length === 0 || activeFilters.includes(role.tier)) &&
      (role.roleName.toLowerCase().includes(searchText.toLowerCase()) ||
        role.description.toLowerCase().includes(searchText.toLowerCase()) ||
        role.tier.toLowerCase().includes(searchText.toLowerCase())),
  );

  // Calculate stats
  const totalMembers = members.length;
  const totalRoles = roles.length;
  const totalBadges = userBadges.reduce((acc, userBadge) => acc + userBadge.badges.length, 0);
  // Calculate additional stats
  const uniquePublicKeys = new Set(userBadges.map(badge => badge.publicKey)).size;

  // Count badges that belong to members in our system
  const memberDiscordIds = new Set(members.map(member => member.discordId));
  const badgesForMembers = userBadges.reduce((count, userBadge) => {
    if (userBadge.discordId && memberDiscordIds.has(userBadge.discordId)) {
      return count + userBadge.badges.length;
    }
    return count;
  }, 0);
  
  // Calculate average badges per member with badges
  const membersWithBadges = userBadges.filter(badge => badge.discordId && memberDiscordIds.has(badge.discordId)).length;
  const averageBadgesPerMember = membersWithBadges > 0 
    ? Math.round((badgesForMembers / membersWithBadges) * 10) / 10
    : 0;

  // Handle view all users with search
  const handleViewAllUsers = () => {
    if (searchText) {
      router.push(`/users?search=${encodeURIComponent(searchText)}`);
    } else {
      router.push("/users");
    }
  };

  // Helper function to find the precomputed badge for a member
  const findPrecomputedBadge = (discordId: string): PrecomputedBadge | undefined => {
    return userBadges.find((badge) => badge.discordId === discordId);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="search-input-wrapper flex items-center">
        <Search className="search-input-icon" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search users, roles, badges..."
          className="search-input"
        />
      </div>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* TierRole Stats */}
          <RoleStats roles={roles} activeFilters={activeFilters} onFilterToggle={handleFilterToggle} />
{/* Stats */}
<div>
<div className="mb-4">
  <h2 className="section-title">Community Stats</h2>
</div>

{/* First row of stats */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
  <StatsCard title="Total Users" value={totalMembers} icon={<UserIcon className="text-blue-400 h-5 w-5" />} />
  <StatsCard
  title="Total Roles"
  value={totalRoles}
  icon={
    <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-indigo-400"
    >
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
    <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-purple-400"
    >
    <path d="M12 15l-2 5l9-9l-9-9l2 5l-9 9l9-9"></path>
    </svg>
  }
  />
</div>

{/* Second row of stats */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <StatsCard
  title="Unique Wallets"
  value={uniquePublicKeys}
  icon={
    <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-green-400"
    >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="2" y1="10" x2="22" y2="10"></line>
    </svg>
  }
  />
  <StatsCard
  title="Members with Badges"
  value={membersWithBadges}
  icon={
    <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-amber-400"
    >
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
    <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-cyan-400"
    >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  }
  />
</div>
</div>



          {/* Recent Users */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title">Recent Users</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewAllUsers}
                className="text-sm text-blue-400 hover:text-blue-300 border-blue-400/30 hover:border-blue-400/50"
              >
                View all
              </Button>
            </div>

            {/* Show filtered recent members if search/filter is active, otherwise show all recent members */}
            {searchText || activeFilters.length > 0 ? (
              filteredMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredMembers.slice(0, 4).map((member) => (
                    <MemberCard
                      key={member.discordId}
                      member={member}
                      precomputedBadge={findPrecomputedBadge(member.discordId)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-[#1a1d29]/80 border border-gray-800/60 rounded-lg p-6 text-center">
                  <p className="text-gray-400">No users found matching your search criteria.</p>
                </div>
              )
            ) : (
              recentMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recentMembers.map((member) => (
                    <MemberCard
                      key={member.discordId}
                      member={member}
                      precomputedBadge={findPrecomputedBadge(member.discordId)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-[#1a1d29]/80 border border-gray-800/60 rounded-lg p-6 text-center">
                  <p className="text-gray-400">No recent users found.</p>
                </div>
              )
            )}
          </div>

          {/* Roles */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title">Roles</h2>
              <Link href="/manageroles" className="text-sm text-blue-400 hover:text-blue-300 no-underline">
                View all
              </Link>
            </div>

            {filteredRoles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredRoles.slice(0, 4).map((role) => (
                  <DashboardRoleCard key={role._id} role={role} />
                ))}
              </div>
            ) : (
              <div className="bg-[#1a1d29]/80 border border-gray-800/60 rounded-lg p-6 text-center">
                <p className="text-gray-400">No roles found matching your search criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

