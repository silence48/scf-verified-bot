"use client";

import type React from "react";

import { useState, useEffect, useRef, ReactNode, RefObject } from "react";
import type { LoadGuildData, MemberInfo, PrecomputedBadge } from "@/types/discord-bot";
import type { TierRole } from "@/types/roles";
import { loadGuildData } from "@/actions/guild";
import { getAllRoles } from "@/actions/roles";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleStats } from "./components/role-stats";
import { Button } from "@/components/ui";
import { DashboardRoleCard } from "./components/RoleCard";
import  GuildStats  from "./components/GuildStats";
import { MemberCard } from "./components/MemberCard";

function NoUsersFound(): ReactNode {
  return (
    <div className="rounded-lg border border-gray-800/60 bg-[#1a1d29]/80 p-6 text-center">
      <p className="text-gray-400">No users found matching your search criteria.</p>
    </div>
  );
};

// Reusable component for displaying scrollable member lists
interface MemberListProps {
  members: MemberInfo[];
  containerRef: RefObject<HTMLDivElement | null>;
  limit?: number;
  findBadge: (discordId: string) => PrecomputedBadge | undefined;
}

function MemberList({
  members,
  containerRef,
  limit,
  findBadge
}: MemberListProps): ReactNode {
  const displayMembers = limit ? members.slice(0, limit) : members;

  return (
    <div className="user-scroll-container" ref={containerRef}>
      <div className="flex flex-nowrap gap-4 pb-1 min-w-max">
        {displayMembers.map((member) => (
          <div key={member.discordId} className="w-[280px] min-w-[280px]">
            <MemberCard member={member} precomputedBadge={findBadge(member.discordId)} />
          </div>
        ))}
      </div>
    </div>
  );
}

type DashboardClientProps = {
  initialGuildData: LoadGuildData;
  initialRoles: TierRole[];
};
// Main component
export default function DashboardClient({ initialGuildData, initialRoles }: DashboardClientProps) {
  const [members, setMembers] = useState<MemberInfo[]>(initialGuildData.members);
  const [recentMembers, setRecentMembers] = useState<MemberInfo[]>([]);
  const [userBadges, setUserBadges] = useState<PrecomputedBadge[]>(initialGuildData.userbadges);
  const [roles, setRoles] = useState<TierRole[]>(initialRoles);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const router = useRouter();

  const userScrollContainerRef = useRef<HTMLDivElement>(null);
  const roleScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheelScroll = (event: WheelEvent) => {
      // Prevent default vertical scrolling
      event.preventDefault();

      // Translate vertical delta to horizontal scrolling
      const container = event.currentTarget as HTMLElement;
      container.scrollLeft += event.deltaY * 0.8;
    };

    // Get references to the scroll containers
    const userContainer = userScrollContainerRef.current;
    const roleContainer = roleScrollContainerRef.current;

    // Add event listeners directly to the containers
    if (userContainer) {
      userContainer.addEventListener("wheel", handleWheelScroll, { passive: false });
    }

    if (roleContainer) {
      roleContainer.addEventListener("wheel", handleWheelScroll, { passive: false });
    }

    return () => {
      // Clean up event listeners
      if (userContainer) {
        userContainer.removeEventListener("wheel", handleWheelScroll);
      }

      if (roleContainer) {
        roleContainer.removeEventListener("wheel", handleWheelScroll);
      }
    };
  }, []);
  // Fetch guild data and roles on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        let guildData;
        let rolesData;
        // Only load data if we do't have it already from props
        if (!initialGuildData || !initialRoles) {
          setIsLoading(true);

          // Get guild data
          const guildId = "897514728459468821"; // Same as used in users/page.tsx
          guildData = await loadGuildData(guildId);
          rolesData = await getAllRoles();

          setMembers(guildData.members);
          setUserBadges(guildData.userbadges);
          setRoles(rolesData);
        } else {
          guildData = initialGuildData;
          rolesData = initialRoles;
          setMembers(initialGuildData.members);
          setUserBadges(initialGuildData.userbadges);
          setRoles(initialRoles);
          setIsLoading(false);
        }
        console.log(`fetched ${guildData.members.length}`);
        // Get all roles
        //const rolesData = await getAllRoles();

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

          // First priority: lastProcessed date
          if (aBadge?.lastProcessed && bBadge?.lastProcessed) {
            return new Date(bBadge.lastProcessed).getTime() - new Date(aBadge.lastProcessed).getTime();
          } else if (aBadge?.lastProcessed) {
            return -1; // a has lastProcessed, b doesn't, so a comes first
          } else if (bBadge?.lastProcessed) {
            return 1; // b has lastProcessed, a doesn't, so b comes first
          }

          // Second priority: memberSince date
          if (a.memberSince && b.memberSince) {
            return new Date(String(b.memberSince)).getTime() - new Date(String(a.memberSince)).getTime();
          } else if (a.memberSince) {
            return -1; // a has memberSince, b doesn't, so a comes first
          } else if (b.memberSince) {
            return 1; // b has memberSince, a doesn't, so b comes first
          }

          // Third priority: joinedStellarDevelopers date
          if (a.joinedStellarDevelopers && b.joinedStellarDevelopers) {
            return new Date(String(b.joinedStellarDevelopers)).getTime() - new Date(String(a.joinedStellarDevelopers)).getTime();
          } else if (a.joinedStellarDevelopers) {
            return -1;
          } else if (b.joinedStellarDevelopers) {
            return 1;
          }

          return 0;
        });

        setRecentMembers(sortedMembers.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [initialGuildData, initialRoles]);

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

  const filteredRoles = roles.filter((role) => {
    // Only include roles that start with "SCF "
    if (!role.roleName.startsWith("SCF ")) {
      return false;
    }

    // Apply text search - FIXED SAFELY HANDLING UNDEFINED PROPERTIES
    const matchesSearch =
      role.roleName.toLowerCase().includes(searchText.toLowerCase()) ||
      (role.description ? role.description.toLowerCase().includes(searchText.toLowerCase()) : false) ||
      (role.tier ? role.tier.toLowerCase().includes(searchText.toLowerCase()) : false);

    // Apply role tier filters
    const matchesFilter = activeFilters.length === 0 || (role.tier && activeFilters.includes(role.tier));
    const retval = matchesSearch && matchesFilter;
    console.log(retval);

    return matchesSearch && matchesFilter;
  });

  const membersToDisplay = (searchText || activeFilters.length > 0)
    ? filteredMembers
    : recentMembers;

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

  // Sort roles to ensure SCF Verified, Pathfinder, Navigator, and Pilot appear first
  const getSortedRoles = (roles: TierRole[]) => {
    const preferredOrder = ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"];

    return [...roles].sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.roleName);
      const bIndex = preferredOrder.indexOf(b.roleName);

      // If both roles are in the preferred list
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex; // Sort by their order in the preferred list
      }

      // If only a is in the preferred list
      if (aIndex !== -1) return -1;

      // If only b is in the preferred list
      if (bIndex !== -1) return 1;

      // Otherwise sort alphabetically
      return a.roleName.localeCompare(b.roleName);
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="search-input-wrapper flex items-center">
        <Search className="search-input-icon" />
        <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search users, roles, badges..." className="search-input" />
      </div>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* TierRole Stats */}
          <RoleStats roles={filteredRoles} activeFilters={activeFilters} onFilterToggle={handleFilterToggle} />
          <GuildStats members={members} roles={roles} userBadges={userBadges} />
          {/* Recent Users */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-title">Recent Users</h2>
              <Button variant="outline" size="sm" onClick={handleViewAllUsers} className="border-blue-400/30 text-sm text-blue-400 hover:border-blue-400/50 hover:text-blue-300">
                View all
              </Button>
            </div>

            {/* Show filtered recent members if search/filter is active, otherwise show all recent members */}
            {membersToDisplay.length > 0
              ? <MemberList
                members={membersToDisplay}
                containerRef={userScrollContainerRef}
                findBadge={findPrecomputedBadge}
              />
              : <NoUsersFound />}
          </div>

          {/* Roles */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-title">Roles</h2>
              <Link href="/manageroles" className="text-sm text-blue-400 no-underline hover:text-blue-300">
                View all
              </Link>
            </div>

            {filteredRoles.length > 0 ? (
              <div className="role-scroll-container" ref={roleScrollContainerRef}>
                <div className="flex flex-nowrap gap-4 pb-1 min-w-max">
                  {getSortedRoles(filteredRoles).map((role) => (
                    <div key={role._id} className="w-[250px] flex-none">
                      <DashboardRoleCard role={role} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-800/60 bg-[#1a1d29]/80 p-6 text-center">
                <p className="text-gray-400">No roles found matching your search criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
