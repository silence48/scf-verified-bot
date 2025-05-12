import { fetchRoleCounts } from "@/actions/roles";
import type { TierRole } from "@/types/roles";
import RoleStatsFilter from "./RoleStatsFilter";

export default async function RoleStatsSection({ roles }: { roles: TierRole[] }) {
  // Server-side data fetch
  const roleCounts = await fetchRoleCounts(roles);
  
  // Order roles properly, with primary tier roles first
  const getOrderedRoleTiers = () => {
    const entries = Object.entries(roleCounts);
    const primaryTiers = ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"];
    
    const primaryRoles = entries.filter(([name]) => primaryTiers.includes(name));
    const secondaryRoles = entries.filter(([name]) => !primaryTiers.includes(name) && name.startsWith("SCF "));
    
    primaryRoles.sort((a, b) => primaryTiers.indexOf(a[0]) - primaryTiers.indexOf(b[0]));
    secondaryRoles.sort((a, b) => a[0].localeCompare(b[0]));
    
    return { primaryRoles, secondaryRoles };
  };

  const { primaryRoles, secondaryRoles } = getOrderedRoleTiers();
  
  return (
    <div className="space-y-4">
      {/* Primary tier roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {primaryRoles.map(([tier, count]) => (
          <RoleStatsFilter key={tier} tier={tier} count={count} />
        ))}
      </div>
      
      {/* Secondary SCF roles */}
      {secondaryRoles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {secondaryRoles.map(([tier, count]) => (
            <RoleStatsFilter key={tier} tier={tier} count={count} />
          ))}
        </div>
      )}
    </div>
  );
}