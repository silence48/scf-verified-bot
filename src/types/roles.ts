// originally types in root folder:

// Role tier type
export type RoleTier = "SCF Verified" | "SCF Pathfinder" | "SCF Navigator" | "SCF Pilot";
export type scfRoles = "SCF Verified" | "SCF Pathfinder" | "SCF Navigator" | "SCF Pilot" | "SCF Project" | "SCF Category Delegate";

// Verification type
export type VerificationType = "Discord" | "SocialVerification" | "StellarAccount" | "BadgeCount" | "Nomination" | "CommunityVote" | "ExistingRole" | "ConcurrentRole";

export type RoleMode = "ANY_GROUP" | "ALL_GROUPS";
export type GroupMode = "ANY" | "ALL";

export interface RequirementGroup {
  id: string;
  name: string;
  groupMode: GroupMode;
  requirements: RoleRequirement[];
}
// Role requirement type
export interface RoleRequirement {
  id: string;
  type: VerificationType;
  mintime?: number;
  badgeCategory?: string;
  badgeIds?: string[];
  minCount?: number;
  provider?: string;
  concurrentRoleName?: string;
  existingRole?: string;
  nominationRequiredCount?: number;
  eligibleVoterRoles?: string[];
  participationRounds?: number;
  requirementgrouptype?: string;
}
/*
 "guild": "897514728459468821",
    "icon": null,
    "unicodeEmoji": null,
    "id": "1082358910805090367",
    "name": "SCF Project",
    "color": 1146986,
    "hoist": false,
    "rawPosition": 34,
    "permissions": "0",
    "managed": false,
    "mentionable": false,
    "flags": 0,
    "tags": null,
    "createdTimestamp": 1678124873592
    */

export interface DiscordGuildRole {
  guild: string,
  icon: string | null,
  unicodeEmoji: string | null,
  id: string,
  name: string,
  color: number,
  hoist: boolean,
  rawPosition: number,
  permissions: string,
  managed: boolean,
  mentionable: boolean,
  flags: number,
  tags: Record<string, unknown> | null,
  createdTimestamp: number
};
export interface BaseRole {
  _id: string; // roleId
  roleName: string;
  role: DiscordGuildRole;
  guildId: string;
  createdAt: Date;
  updatedAt: Date;
  removedAt: Date | null;
}

// Role type
export interface TierRole extends BaseRole {
  _id: string;
  description: string;
  tier: RoleTier;
  requirements: RoleMode;
  requirementGroups?: RequirementGroup[];
  nominationEnabled: boolean;
  votesRequired?: number;
  eligibleNominators?: string[];
}

// Role eligibility types
export interface RoleEligibilityResult {
  eligible: boolean;
  requirementsMet: RequirementGroupResult[];
  message?: string;
}

export interface RequirementGroupResult {
  groupId: string;
  met: boolean;
  requirements: RequirementResult[];
}

export interface RequirementResult {
  id: string;
  met: boolean;
  reason?: string | string[] | { [category: string]: number };
}

// Role management types
export interface RoleActionResult {
  success: boolean;
  message?: string;
  threadId?: string;
}

export interface NominationEligibilityResult {
  eligible: boolean;
  reason?: string;
}
