"use client";

import { useState } from "react";
import type { TierRole, RequirementGroup } from "@/types/roles";
import { ChevronDown, ChevronUp, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui";
import { NominationModal } from "./nomination-modal";
import { BadgeAsset } from "@/types/discord-bot";
import { ClientBadge } from "@/actions/badges"; 
import Image from "next/image";

interface RoleCardProps {
  role: TierRole
  badges: ClientBadge[]
  onEdit: (role: TierRole) => void
  onDelete: (roleId: string) => void
}

export function RoleCard({ role, badges, onEdit, onDelete }: RoleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [nominationModalOpen, setNominationModalOpen] = useState(false);

  // Check if this is one of the core roles that can't be deleted
  const isCoreRole = ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"].includes(role.roleName);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "SCF Verified":
        return "text-emerald-400";
      case "SCF Pathfinder":
        return "text-blue-400";
      case "SCF Navigator":
        return "text-indigo-400";
      case "SCF Pilot":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  // Get badges required for this role
  const getBadgeIds = (requirementGroups?: RequirementGroup[]) => {
    if (!requirementGroups) return [];

    const badgeIds: string[] = [];
    requirementGroups.forEach((group) => {
      group.requirements.forEach((req) => {
        if (req.type === "BadgeCount" && req.badgeIds) {
          badgeIds.push(...req.badgeIds);
        }
      });
    });

    return badgeIds;
  };

  const badgeIds = getBadgeIds(role.requirementGroups);
  const roleBadges = badges.filter((badge) => badgeIds.includes (String(badge._id) ));

  // Format requirements for display
  const formatRequirements = () => {
    if (!role.requirementGroups || role.requirementGroups.length === 0) {
      return <p className="text-sm text-gray-400">No requirements defined.</p>;
    }

    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400 italic mb-2">
          {role.requirements === "ANY_GROUP"
            ? "User must satisfy ALL requirements in at least ONE group."
            : "User must satisfy ALL requirements in ALL groups."}
        </p>

        {role.requirementGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="bg-[#12141e]/40 p-2 rounded-md">
            <h5 className="text-sm font-medium text-white mb-1">
              {group.name || `Group ${groupIdx + 1}`}
              <span className="text-xs text-gray-400 ml-2">
                ({group.groupMode === "ALL" ? "All required" : "Any required"})
              </span>
            </h5>
            <ul className="list-disc pl-5 space-y-1">
              {group.requirements.map((req, reqIdx) => (
                <li key={reqIdx} className="text-xs text-gray-300">
                  {req.type === "Discord" && "Join Discord"}
                  {req.type === "SocialVerification" && "Verify social account (Twitter, Twitch, etc.)"}
                  {req.type === "StellarAccount" && "Verify Stellar address"}
                  {req.type === "BadgeCount" && `${req.minCount} badges from ${req.badgeCategory || "any category"}`}
                  {req.type === "ConcurrentRole" && `Have ${req.concurrentRoleName} role`}
                  {req.type === "ExistingRole" && `Already have ${req.existingRole} role`}
                  {req.type === "Nomination" &&
                    `Get nominated and receive ${req.nominationRequiredCount} upvotes from ${req.eligibleVoterRoles?.join(" or ")}`}
                  {req.type === "CommunityVote" &&
                    `Participate in ${req.participationRounds} Community Vote round${req.participationRounds !== 1 ? "s" : ""}`}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-[#1a1d29]/80 border border-gray-800/60 rounded-lg overflow-hidden">
      <div
        className={`p-4 flex justify-between items-center cursor-pointer ${expanded ? "border-b border-gray-800/60" : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getTierColor(role.tier).replace("text-", "bg-")}`} />
          <div>
            <h3 className="font-medium text-white/90">{role.roleName}</h3>
            <span className="text-xs bg-[#12141e]/40 text-gray-400 px-2 py-0.5 rounded-full">{role.tier}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(role);
            }}
            className="h-8 w-8 hover:bg-gray-700/50 hover:text-white"
          >
            <Edit className="h-4 w-4" />
          </Button>

          {!isCoreRole && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(role._id);
              }}
              className="h-8 w-8 hover:bg-gray-700/50 hover:text-white"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}

          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 text-sm text-gray-300">
          <p className="mb-4">{role.description}</p>

          <div className="mb-4">
            <h4 className="font-medium text-white mb-2">Requirements</h4>
            {formatRequirements()}
          </div>

          {roleBadges.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-white mb-2">Required Badges</h4>

              <div className="flex flex-wrap gap-2">
                {roleBadges.map((badge) => (
                  <div key={ String(badge._id) } className="flex items-center gap-1 bg-[#12141e]/40 px-2 py-1 rounded-md">
                    <Image
                      src={badge.image}
                      alt={badge.code}
                      height={120}
                      width={120}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs">{badge.code || "Badge"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {role.nominationEnabled && (
            <div className="mt-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setNominationModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Nominate User
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Nomination Modal */}
      {nominationModalOpen && <NominationModal role={role} onClose={() => setNominationModalOpen(false)} />}
    </div>
  );
}

