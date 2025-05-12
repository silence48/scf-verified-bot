import { TierRole } from "@/types/roles";
import Link from "next/link";

// TierRole card component
export function DashboardRoleCard({ role }: { role: TierRole }) {
    
  return (
    <Link href="/manageroles" className="block text-inherit no-underline">
      <div className="card-container flex h-full flex-col transition-all hover:translate-y-[-2px] hover:shadow-lg">
        <div className="mb-3 flex items-center gap-3">
          <div className={`badge-dot badge-${role.tier?.toLowerCase() || "default"}`} />
          <div>
            <h3 className="card-title">{role.roleName}</h3>
            <span className="rounded-full bg-[#12141e]/40 px-2 py-0.5 text-xs text-gray-400">{role.tier}</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="mb-3 text-sm text-gray-300">{role.description}</p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-white">Requirements</h4>

          {/* If there are no groups, display a simple message */}
          {!role.requirementGroups || role.requirementGroups.length === 0 ? (
            <p className="text-sm text-gray-400">No requirements defined.</p>
          ) : (
            <div>
              {/* Show how the groups are combined overall */}
              <p className="mb-2 text-xs text-gray-400 italic">
                {role.requirements === "ANY_GROUP" ? "User must satisfy ALL requirements in at least ONE group." : "User must satisfy ALL requirements in ALL groups."}
              </p>

              {/* Display each group */}
              {role.requirementGroups.map((group, gIdx) => (
                <div key={gIdx} className="mb-2">
                  <p className="mb-1 text-sm font-medium text-gray-200">
                    {group.name || `Group ${gIdx + 1}`}
                    <span className="ml-2 text-xs text-gray-400">({group.groupMode === "ALL" ? "All" : "Any"} required)</span>
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-400">
                    {group.requirements.map((req, rIdx) => (
                      <li key={rIdx}>
                        {req.type === "Discord" && "Join Discord"}
                        {req.type === "SocialVerification" && "Verify social account"}
                        {req.type === "StellarAccount" && "Verify Stellar address"}
                        {req.type === "BadgeCount" && `${req.minCount} badges from ${req.badgeCategory || "any category"}`}
                        {req.type === "ConcurrentRole" && `Have ${req.concurrentRoleName} role`}
                        {req.type === "ExistingRole" && `Already have ${req.existingRole} role`}
                        {req.type === "Nomination" && `Get nominated and receive ${req.nominationRequiredCount} upvotes`}
                        {req.type === "CommunityVote" && `Participate in ${req.participationRounds} Community Vote round${req.participationRounds !== 1 ? "s" : ""}`}
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
