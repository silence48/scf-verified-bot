"use client";

import { useSearchParams } from "next/navigation";
import type { MemberInfo, PrecomputedBadge } from "@/types/discord-bot";
import { MemberCard } from "./MemberCard";
import ScrollContainer from "./ScrollContainer";


export default function UserList({ 
  members, 
  userBadges 
}: { 
  members: MemberInfo[];
  userBadges: PrecomputedBadge[];
}) {
  const searchParams = useSearchParams();
  
  // Get search text and user filters from URL
  const searchText = searchParams.get("search") || "";
  const userFilters = searchParams.get("userFilters")?.split(",") || [];
  
  // Filter members based on URL parameters
  const filteredMembers = members.filter(member => {
    // Apply role filters
    const passesRoleFilter = userFilters.length === 0 || 
      member.roles.some(role => userFilters.includes(role.shortname));
    
    // Apply text search
    const passesTextSearch = !searchText || 
      member.username.toLowerCase().includes(searchText.toLowerCase()) ||
      member.discordId.toLowerCase().includes(searchText.toLowerCase()) ||
      member.roles.some(role => role.name.toLowerCase().includes(searchText.toLowerCase()));
    
    return passesRoleFilter && passesTextSearch;
  });
  
  // Helper function to find badge for a member
  const findPrecomputedBadge = (discordId: string) => {
    return userBadges.find(badge => badge.discordId === discordId);
  };
  
  return (
    <ScrollContainer className="user-scroll-container">
      <div className="flex flex-nowrap gap-4 pb-1 min-w-max">
        {filteredMembers.map(member => (
          <div key={member.discordId} className="w-[280px] min-w-[280px]">
            <MemberCard 
              member={member} 
              precomputedBadge={findPrecomputedBadge(member.discordId)} 
            />
          </div>
        ))}
      </div>
    </ScrollContainer>
  );
}