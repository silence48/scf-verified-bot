/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import type { TierRole, RoleTier, VerificationType, RoleRequirement, RequirementGroup, RoleMode, GroupMode } from "@/types/roles";
import { X, Plus, Trash, Info } from "lucide-react";
import { Button } from "@/components/ui";
import { BadgeSelector } from "./badge-selector";
import { BadgeAsset } from "@/types/discord-bot";
import { ClientBadge } from "@/actions/badges";

interface RoleFormProps {
  role?: TierRole;
  badges: ClientBadge[];
  onSave: (role: TierRole) => void;
  onCancel: () => void;
}

// Tier descriptions
const TIER_DESCRIPTIONS: Record<RoleTier, string> = {
  "SCF Verified": "Basic entry level requiring Discord join, social account verification, and Stellar address verification",
  "SCF Pathfinder": "Requires Soroban/Stellar expertise through project roles or specific badge requirements",
  "SCF Navigator": "Requires participation in Community Vote, nomination by Navigator/Pilot, and upvotes",
  "SCF Pilot": "Requires participation in multiple SCF rounds, active community involvement, nomination by Pilot, and upvotes",
};

export function RoleForm({ role, badges, onSave, onCancel }: RoleFormProps) {
  const [roleName, setRoleName] = useState(role?.roleName || "");
  const [description, setDescription] = useState(role?.description || "");
  const [tier, setTier] = useState<RoleTier>(role?.tier || "SCF Verified");
  const [requirementsMode, setRequirementsMode] = useState<RoleMode>(role?.requirements || "ALL_GROUPS");

  // Requirements state - now with groups for EITHER/OR logic
  const [requirementGroups, setRequirementGroups] = useState<RequirementGroup[]>(
    role?.requirementGroups?.map((group) => ({
      ...group,
      id: group.id || `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      groupMode: group.groupMode || "ALL",
      requirements: group.requirements.map((req) => ({
        ...req,
        id: req.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        badgeCategory: req.badgeCategory || "",
        concurrentRoleName: req.concurrentRoleName || "",
        nominationRequiredCount: req.nominationRequiredCount || 5,
        eligibleVoterRoles: req.eligibleVoterRoles || [],
        participationRounds: req.participationRounds || 1,
        existingRole: req.existingRole || "",
      })),
    })) || [
      {
        id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: "Default Requirements",
        groupMode: "ALL",
        requirements: [],
      },
    ],
  );

  const [nominationEnabled, setNominationEnabled] = useState<boolean>(role?.nominationEnabled || tier === "SCF Navigator" || tier === "SCF Pilot");

  const [votesRequired, setVotesRequired] = useState<number>(role?.votesRequired || 5);

  const [eligibleNominators, setEligibleNominators] = useState<string[]>(role?.eligibleNominators || []);

  // Track which requirement group has its dropdown open
  const [activeRequirementDropdown, setActiveRequirementDropdown] = useState<string | null>(null);

  // Close dropdowns when clicking outside
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setActiveRequirementDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update nomination enabled when tier changes
  useEffect(() => {
    if (tier === "SCF Navigator" || tier === "SCF Pilot") {
      setNominationEnabled(true);
    }
  }, [tier]);

  // Add a new requirement group
  const addRequirementGroup = () => {
    setRequirementGroups([
      ...requirementGroups,
      {
        id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Requirement Group ${requirementGroups.length + 1}`,
        groupMode: "ALL",
        requirements: [],
      },
    ]);
  };

  // Remove a requirement group
  const removeRequirementGroup = (groupId: string) => {
    setRequirementGroups(requirementGroups.filter((group) => group.id !== groupId));
  };

  // Update a requirement group name
  const updateRequirementGroupName = (groupId: string, name: string) => {
    setRequirementGroups(requirementGroups.map((group) => (group.id === groupId ? { ...group, name } : group)));
  };

  // Update a requirement group mode
  const updateRequirementGroupMode = (groupId: string, groupMode: GroupMode) => {
    setRequirementGroups(requirementGroups.map((group) => (group.id === groupId ? { ...group, groupMode } : group)));
  };

  // Toggle requirement dropdown
  const toggleRequirementDropdown = (groupId: string) => {
    setActiveRequirementDropdown(activeRequirementDropdown === groupId ? null : groupId);
  };

  // Add a new requirement to a group
  const addRequirement = (groupId: string, type: VerificationType) => {
    const newRequirement: RoleRequirement = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
    };

    switch (type) {
      case "BadgeCount":
        newRequirement.badgeIds = [];
        newRequirement.minCount = 1;
        newRequirement.badgeCategory = "";
        break;
      case "ConcurrentRole":
        newRequirement.concurrentRoleName = "";
        break;
      case "Nomination":
        newRequirement.nominationRequiredCount = 5;
        newRequirement.eligibleVoterRoles = [];
        break;
      case "CommunityVote":
        newRequirement.participationRounds = 1;
        break;
      case "ExistingRole":
        newRequirement.existingRole = "";
        break;
    }

    setRequirementGroups(requirementGroups.map((group) => (group.id === groupId ? { ...group, requirements: [...group.requirements, newRequirement] } : group)));

    setActiveRequirementDropdown(null);
  };

  // Remove a requirement
  const removeRequirement = (groupId: string, reqId: string) => {
    setRequirementGroups(requirementGroups.map((group) => (group.id === groupId ? { ...group, requirements: group.requirements.filter((req) => req.id !== reqId) } : group)));
  };

  // Update a requirement
  const updateRequirement = (groupId: string, reqId: string, updates: Partial<RoleRequirement>) => {
    setRequirementGroups(
      requirementGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              requirements: group.requirements.map((req) => (req.id === reqId ? { ...req, ...updates } : req)),
            }
          : group,
      ),
    );
  };

  const handleSave = () => {
    // Create a new role object with the updated values
    const newRole: TierRole = {
      _id: role?._id || `role-${Date.now()}`,
      roleName,
      description,
      tier,
      requirements: requirementsMode,
      requirementGroups,
      nominationEnabled,
      votesRequired,
      eligibleNominators,
      guildId: role?.guildId || "897514728459468821",
      createdAt: role?.createdAt || new Date(),
      updatedAt: new Date(),
      removedAt: null,
    };

    onSave(newRole);
  };

  // Check if this is one of the core roles that can't be deleted
  const isCoreRole = role && ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"].includes(role.roleName);

  return (
    <div ref={formRef} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-800/60 bg-[#1a1d29]/80 p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-wide text-white/90">{role ? "Edit Role" : "Create New Role"}</h2>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 hover:bg-gray-700/50 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Role Name</label>
          <input
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="w-full rounded-md border border-gray-700/50 bg-[#0c0e14]/80 px-3 py-2 text-white focus:border-gray-600 focus:outline-none"
            placeholder="Enter role name"
            disabled={isCoreRole}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px] w-full rounded-md border border-gray-700/50 bg-[#0c0e14]/80 px-3 py-2 text-white focus:border-gray-600 focus:outline-none"
            placeholder="Enter role description"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Role Tier</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as RoleTier)}
            className="w-full rounded-md border border-gray-700/50 bg-[#0c0e14]/80 px-3 py-2 text-white focus:border-gray-600 focus:outline-none"
            disabled={isCoreRole}
          >
            <option value="SCF Verified">SCF Verified</option>
            <option value="SCF Pathfinder">SCF Pathfinder</option>
            <option value="SCF Navigator">SCF Navigator</option>
            <option value="SCF Pilot">SCF Pilot</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">
            <strong>Tier Description:</strong>
            <br />
            {TIER_DESCRIPTIONS[tier]}
          </p>
        </div>

        {/* Requirements Mode */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Requirements Mode</label>
          <select
            value={requirementsMode}
            onChange={(e) => setRequirementsMode(e.target.value as RoleMode)}
            className="w-full rounded-md border border-gray-700/50 bg-[#0c0e14]/80 px-3 py-2 text-white focus:border-gray-600 focus:outline-none"
          >
            <option value="ANY_GROUP">ANY_GROUP - User must satisfy at least one requirement group</option>
            <option value="ALL_GROUPS">ALL_GROUPS - User must satisfy all requirement groups</option>
          </select>
        </div>

        {/* Requirements Section with Groups */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">Requirements</label>
            <Button variant="outline" size="sm" onClick={addRequirementGroup} className="flex items-center gap-1 border-gray-700/50 bg-[#0c0e14]/80 hover:bg-[#1e2235]/80 hover:text-white">
              <Plus className="h-3 w-3" /> Add Requirement Group
            </Button>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-gray-400">
              {requirementsMode === "ANY_GROUP" ? "User must satisfy ALL requirements in at least ONE group." : "User must satisfy ALL requirements in ALL groups."}
            </p>
          </div>

          {requirementGroups.length === 0 ? (
            <p className="rounded-md bg-[#0c0e14]/80 p-3 text-sm text-gray-400">No requirement groups added. Click &ldquo;Add Requirement Group&ldquo; to add requirements for this role.</p>
          ) : (
            <div className="space-y-6">
              {requirementGroups.map((group, groupIndex) => (
                <div key={group.id} className="rounded-md border border-gray-800/40 bg-[#0c0e14]/80 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) => updateRequirementGroupName(group.id, e.target.value)}
                        className="w-full rounded-md border border-gray-700/50 bg-[#12141e]/40 px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                        placeholder="Group name"
                      />
                    </div>

                    <div className="ml-2 flex items-center gap-2">
                      <select
                        value={group.groupMode}
                        onChange={(e) => updateRequirementGroupMode(group.id, e.target.value as GroupMode)}
                        className="rounded-md border border-gray-700/50 bg-[#12141e]/40 px-2 py-1 text-sm text-white focus:border-gray-600 focus:outline-none"
                      >
                        <option value="ALL">ALL - All requirements must be met</option>
                        <option value="ANY">ANY - Any requirement can be met</option>
                      </select>

                      {requirementGroups.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeRequirementGroup(group.id)} className="h-8 w-8 hover:bg-gray-700/50 hover:text-white">
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {group.requirements.length === 0 ? (
                      <p className="rounded-md bg-[#12141e]/40 p-2 text-sm text-gray-400">No requirements in this group. Add requirements below.</p>
                    ) : (
                      group.requirements.map((req, reqIndex) => (
                        <div key={req.id} className="rounded-md border border-gray-700/40 bg-[#12141e]/40 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <h4 className="font-medium text-white">{req.type} Requirement</h4>
                            <Button variant="ghost" size="icon" onClick={() => removeRequirement(group.id, req.id)} className="h-6 w-6 hover:bg-gray-700/50 hover:text-white">
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>

                          {req.type === "Discord" && <p className="text-sm text-gray-400">User must join Discord</p>}

                          {req.type === "SocialVerification" && (
                            <p className="text-sm text-gray-400">User must verify a social account (For now this only verifies discord so it&apos;s the same as discord it will need updated.)</p>
                          )}

                          {req.type === "StellarAccount" && <p className="text-sm text-gray-400">User must verify a funded Stellar address</p>}

                          {req.type === "ExistingRole" && (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-400">Required Role</label>
                              <select
                                value={req.existingRole}
                                onChange={(e) => updateRequirement(group.id, req.id, { existingRole: e.target.value })}
                                className="h-8 w-full rounded-md border border-gray-700/50 bg-[#12141e]/40 px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                              >
                                <option value="">Select a role</option>
                                <option value="SCF Verified">SCF Verified</option>
                                <option value="SCF Pathfinder">SCF Pathfinder</option>
                                <option value="SCF Navigator">SCF Navigator</option>
                                <option value="SCF Pilot">SCF Pilot</option>
                              </select>
                            </div>
                          )}

                          {req.type === "BadgeCount" && (
                            <div className="space-y-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-400">Badge Category</label>
                                <input
                                  type="text"
                                  value={req.badgeCategory}
                                  onChange={(e) => updateRequirement(group.id, req.id, { badgeCategory: e.target.value })}
                                  className="h-8 w-full rounded-md border border-gray-700/50 bg-[#12141e]/40 px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                                  placeholder="e.g., Stellar Quest, SDF"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-400">Minimum Badge Count</label>
                                <input
                                  type="number"
                                  value={req.minCount}
                                  onChange={(e) => updateRequirement(group.id, req.id, { minCount: Number(e.target.value) })}
                                  min={1}
                                  className="h-8 w-full rounded-md border border-gray-700/50 bg-[#12141e]/40 px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-400">Required Badges</label>
                                <BadgeSelector badges={badges} selectedBadgeIds={req.badgeIds || []} setSelectedBadgeIds={(ids) => updateRequirement(group.id, req.id, { badgeIds: ids })} />
                              </div>
                            </div>
                          )}

                          {req.type === "ConcurrentRole" && (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-400">Project Role Name</label>
                              <input
                                type="text"
                                value={req.concurrentRoleName}
                                onChange={(e) => updateRequirement(group.id, req.id, { concurrentRoleName: e.target.value })}
                                className="h-8 w-full rounded-md border border-gray-700/50 bg-[#12141e]/40 px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                                placeholder="e.g., SCF Project"
                              />
                            </div>
                          )}

                          {req.type === "Nomination" && (
                            <div className="space-y-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-400">Required Votes</label>
                                <input
                                  type="number"
                                  value={req.nominationRequiredCount}
                                  onChange={(e) =>
                                    updateRequirement(group.id, req.id, {
                                      nominationRequiredCount: Number(e.target.value),
                                    })
                                  }
                                  min={1}
                                  className="h-8 w-full rounded-md border border-gray-700/50 bg-[#12141e]/40 px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-400">Eligible Voter Roles</label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {["SCF Navigator", "SCF Pilot"].map((roleName) => (
                                    <label key={roleName} className="flex cursor-pointer items-center gap-1 rounded-md bg-[#12141e]/40 px-2 py-1">
                                      <input
                                        type="checkbox"
                                        checked={(req.eligibleVoterRoles || []).includes(roleName)}
                                        onChange={(e) => {
                                          const current = req.eligibleVoterRoles || [];
                                          const updated = e.target.checked ? [...current, roleName] : current.filter((r) => r !== roleName);
                                          updateRequirement(group.id, req.id, { eligibleVoterRoles: updated });
                                        }}
                                        className="ui-checkbox"
                                      />
                                      <span className="text-xs text-gray-300">{roleName}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {req.type === "CommunityVote" && (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-400">Required Participation Rounds</label>
                              <input
                                type="number"
                                value={req.participationRounds}
                                onChange={(e) => updateRequirement(group.id, req.id, { participationRounds: Number(e.target.value) })}
                                min={1}
                                className="h-8 w-full rounded-md border border-gray-700/50 bg-[#12141e]/40 px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Requirement Button - Simple dropdown implementation */}
                  <div className="relative mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRequirementDropdown(group.id)}
                      className="flex items-center gap-1 border-gray-700/50 bg-[#0c0e14]/80 hover:bg-[#1e2235]/80 hover:text-white"
                    >
                      <Plus className="h-3 w-3" /> Add Requirement
                    </Button>

                    {activeRequirementDropdown === group.id && (
                      <div className="absolute left-0 z-10 mt-1 rounded-md border border-gray-800/60 bg-[#1a1d29] shadow-lg">
                        <div className="cursor-pointer px-3 py-2 text-white hover:bg-[#1e2235]/80" onClick={() => addRequirement(group.id, "Discord")}>
                          Discord
                        </div>
                        <div className="cursor-pointer px-3 py-2 text-white hover:bg-[#1e2235]/80" onClick={() => addRequirement(group.id, "SocialVerification")}>
                          Social Verification
                        </div>
                        <div className="cursor-pointer px-3 py-2 text-white hover:bg-[#1e2235]/80" onClick={() => addRequirement(group.id, "StellarAccount")}>
                          Stellar Account
                        </div>
                        <div className="cursor-pointer px-3 py-2 text-white hover:bg-[#1e2235]/80" onClick={() => addRequirement(group.id, "BadgeCount")}>
                          Badge Count
                        </div>
                        <div className="cursor-pointer px-3 py-2 text-white hover:bg-[#1e2235]/80" onClick={() => addRequirement(group.id, "ConcurrentRole")}>
                          Project Role
                        </div>
                        <div className="cursor-pointer px-3 py-2 text-white hover:bg-[#1e2235]/80" onClick={() => addRequirement(group.id, "ExistingRole")}>
                          Existing Role
                        </div>
                        <div className="cursor-pointer px-3 py-2 text-white hover:bg-[#1e2235]/80" onClick={() => addRequirement(group.id, "Nomination")}>
                          Nomination
                        </div>
                        <div className="cursor-pointer px-3 py-2 text-white hover:bg-[#1e2235]/80" onClick={() => addRequirement(group.id, "CommunityVote")}>
                          Community Vote
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={nominationEnabled}
              onChange={(e) => setNominationEnabled(e.target.checked)}
              disabled={tier === "SCF Navigator" || tier === "SCF Pilot"}
              className="ui-checkbox"
            />
            <span className="text-gray-300">Enable Nomination Process</span>
          </label>
          <p className="mt-1 ml-6 text-xs text-gray-400">
            {tier === "SCF Navigator" || tier === "SCF Pilot" ? "Nomination is required for Navigator and Pilot roles" : "Users can nominate others for this role"}
          </p>
        </div>

        {nominationEnabled && (
          <div className="space-y-3 rounded-md border border-gray-800/40 bg-[#0c0e14]/80 p-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Votes Required</label>
              <input
                type="number"
                value={votesRequired}
                onChange={(e) => setVotesRequired(Number(e.target.value))}
                min={1}
                className="w-full rounded-md border border-gray-700/50 bg-[#12141e]/40 px-3 py-2 text-white focus:border-gray-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Eligible Nominators</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"].map((roleName) => (
                  <label key={roleName} className="flex cursor-pointer items-center gap-1 rounded-md bg-[#12141e]/40 px-2 py-1">
                    <input
                      type="checkbox"
                      checked={eligibleNominators.includes(roleName)}
                      onChange={(e) => {
                        setEligibleNominators(e.target.checked ? [...eligibleNominators, roleName] : eligibleNominators.filter((r) => r !== roleName));
                      }}
                      className="ui-checkbox"
                    />
                    <span className="text-xs text-gray-300">{roleName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} className="border-gray-700/50 bg-[#0c0e14]/80 hover:bg-[#1e2235]/80 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!roleName || requirementGroups.every((group) => group.requirements.length === 0)}
            className={`${!roleName || requirementGroups.every((group) => group.requirements.length === 0) ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {role ? "Update Role" : "Create Role"}
          </Button>
        </div>
      </div>
    </div>
  );
}
