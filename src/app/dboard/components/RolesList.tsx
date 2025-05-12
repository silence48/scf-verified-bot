"use client";

import type { TierRole } from "@/types/roles";
import { DashboardRoleCard } from "./RoleCard";
import ScrollContainer from "./ScrollContainer";

export default function RolesList({ roles }: { roles: TierRole[] }) {
  // Sort roles to ensure SCF Verified, Pathfinder, Navigator, and Pilot appear first
  // This component DOES NOT filter based on search text or role filters
  const getSortedRoles = (roles: TierRole[]) => {
    const preferredOrder = ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"];

    return [...roles].sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.roleName);
      const bIndex = preferredOrder.indexOf(b.roleName);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.roleName.localeCompare(b.roleName);
    });
  };
  
  if (roles.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800/60 bg-[#1a1d29]/80 p-6 text-center">
        <p className="text-gray-400">No roles available.</p>
      </div>
    );
  }
  
  return (
    <ScrollContainer className="role-scroll-container">
      <div className="flex flex-nowrap gap-4 pb-1 min-w-max">
        {getSortedRoles(roles).map(role => (
          <div key={role._id} className="w-[250px] flex-none">
            <DashboardRoleCard role={role} />
          </div>
        ))}
      </div>
    </ScrollContainer>
  );
}