"use server";

// import { getBadgesForDiscordId } from "@/app/api/verifyPathfinder/utils";
import { getMongoDatabase } from "@/discord-bot/mongo-db";
import { SCFUser } from "@/discord-bot/types";
import { AppMetaDoc, BadgeAsset, MemberInfo, NominationRequirementVerification, NominationThread, NominationVote, NominationVoteResult, PrecomputedBadge } from "@/types/discord-bot";
import type {
  TierRole,
  RoleTier,
  RoleEligibilityResult,
  RoleActionResult,
  NominationEligibilityResult,
  RequirementGroupResult,
  RoleMode,
  GroupMode,
  VerificationType,
  RequirementGroup,
} from "@/types/roles";
import * as fs from "fs/promises";
import { Db } from "mongodb";

// Function to get counts for each role
export async function fetchRoleCounts(roles: TierRole[]) {
  try {
    const db = await getMongoDatabase();
    const userRolesColl = db.collection("user_roles");
    const results: Record<string, number> = {};

    for (const role of roles) {
      if (!role.tier) continue;

      // Use the role's _id to find matching user roles
      const count = await userRolesColl.countDocuments({ roleId: role._id });

      // Group by tier name
      if (!results[role.tier]) {
        results[role.tier] = 0;
      }
      results[role.tier] += count;
    }

    return results;
  } catch (err) {
    console.error("[fetchRoleCounts] Error:", err);
    return {};
  }
}

/** Checks if tier roles have been initialized; initializes them if not. */
export async function checkAndInitializeTierRoles() {
  const db = await getMongoDatabase();
  const metaColl = db.collection<AppMetaDoc>("app_meta");
  if (!globalThis.tierRolesInitialized) {
    const initialized = await metaColl.findOne({ _id: "tier_roles_initialized" });
    if (initialized) {
      console.log("[checkAndInitializeTierRoles] Already initialized, skipping.");
      globalThis.tierRolesInitialized = true;
      return;
    }
  }

  console.log("[checkAndInitializeTierRoles] No init doc found, initializing...");
  await initializeTierRoles();

  // updae the app meta to not overwrite them later.
  await metaColl.insertOne({ _id: "tier_roles_initialized", date: new Date() });
  globalThis.tierRolesInitialized = true;
  console.log("[checkAndInitializeTierRoles] Done initializing Tier Roles.");
}

export async function initializeTierRoles(): Promise<void> {
  const db = await getMongoDatabase();
  const existingRoles = await db.collection<TierRole>("guild_roles").find().toArray();
  console.log(`[initializeTierRoles] - ${Date.now()} - found ${existingRoles.length} roles.`);
  const now = new Date();
  // Example definitions for the four tier roles
  const tierRoles: TierRole[] = [
    {
      _id: "1116373909504274534",
      roleName: "SCF Verified",
      guildId: "897514728459468821",
      createdAt: new Date("2025-03-13T20:54:07.625+00:00"),
      updatedAt: now,
      removedAt: null,
      description: "Entry-level role requiring Discord join, social verification, Stellar address, etc.",
      tier: "SCF Verified",
      requirements: "ANY_GROUP",
      requirementGroups: [
        {
          id: "verified-group-1",
          name: "Basic Requirements",
          groupMode: "ALL",
          requirements: [
            { id: "vg1-req-1", type: "Discord" },
            { id: "vg1-req-2", type: "SocialVerification" },
            { id: "vg1-req-3", type: "StellarAccount" },
          ],
        },
        {
          id: "verified-group-2",
          name: "ExistingUser",
          groupMode: "ANY",
          requirements: [{ id: "vg2-req-1", type: "ConcurrentRole", concurrentRoleName: "SCF Verified" }],
        },
      ],
      nominationEnabled: false,
    },
    {
      _id: "1082357854926807111",
      roleName: "SCF Pathfinder",
      guildId: "897514728459468821",
      createdAt: new Date("2025-03-13T20:54:07.625+00:00"),
      updatedAt: now,
      removedAt: null,
      description: "Requires Soroban/Stellar expertise, project roles, or certain badges.",
      tier: "SCF Pathfinder",
      requirements: "ANY_GROUP",
      requirementGroups: [
        {
          id: "path-group-1",
          name: "Existing or Concurrent Role Path",
          groupMode: "ANY",
          requirements: [
            { id: "pg1-req-1", type: "ConcurrentRole", concurrentRoleName: "SCF Pathfinder" },
            { id: "pg1-req-2", type: "ConcurrentRole", concurrentRoleName: "SCF Project" },
          ],
        },
        {
          id: "path-group-2",
          name: "Badge Count Path",
          groupMode: "ALL",
          requirements: [
            { id: "pg2-req-1", type: "ExistingRole", existingRole: "SCF Verified" },
            { id: "pg2-req-2", type: "BadgeCount", badgeCategory: "SSQ", minCount: 5 },
          ],
        },
      ],
      nominationEnabled: false,
    },
    {
      _id: "1082353855041392731",
      roleName: "SCF Navigator",
      guildId: "897514728459468821",
      createdAt: new Date("2025-03-13T20:54:07.625+00:00"),
      updatedAt: now,
      removedAt: null,
      description: "Requires community vote, nomination; used as mid-level advanced role.",
      tier: "SCF Navigator",
      requirements: "ANY_GROUP",
      requirementGroups: [
        {
          id: "navigator-group-1",
          name: "Navigator Requirements",
          groupMode: "ALL",
          requirements: [
            { id: "ng1-req-1", type: "ExistingRole", existingRole: "SCF Pathfinder" },
            { id: "ng1-req-2", type: "CommunityVote", participationRounds: 2 },
            { id: "ng1-req-3", type: "Nomination", eligibleVoterRoles: ["SCF Navigator", "SCF Pilot"], nominationRequiredCount: 5 },
          ],
        },
        {
          id: "navigator-group-2",
          name: "Existing or Concurrent Role Path",
          groupMode: "ANY",
          requirements: [{ id: "ng2-req-1", type: "ConcurrentRole", concurrentRoleName: "SCF Navigator" }],
        },
      ],
      nominationEnabled: true,
      votesRequired: 8,
      eligibleNominators: ["SCF Navigator", "SCF Pilot"],
    },
    {
      _id: "1082331251899379762",
      roleName: "SCF Pilot",
      guildId: "897514728459468821",
      createdAt: new Date("2025-03-13T20:54:07.625+00:00"),
      updatedAt: now,
      removedAt: null,
      description: "Top Tier role requiring multiple SCF rounds, active involvement, nomination, and upvotes.",
      tier: "SCF Pilot",
      requirements: "ANY_GROUP",
      requirementGroups: [
        {
          id: "pilot-group-1",
          name: "Pilot Requirements",
          groupMode: "ALL",
          requirements: [
            { id: "pg1-req-1", type: "ExistingRole", existingRole: "SCF Navigator" },
            { id: "pg1-req-2", type: "CommunityVote", participationRounds: 3 },
            { id: "pg1-req-3", type: "Nomination", eligibleVoterRoles: ["SCF Pilot"], nominationRequiredCount: 5 },
          ],
        },
        {
          id: "pilot-group-2",
          name: "Existing or Concurrent Role Path",
          groupMode: "ANY",
          requirements: [{ id: "pg2-req-1", type: "ConcurrentRole", concurrentRoleName: "SCF Pilot" }],
        },
      ],
      nominationEnabled: true,
      votesRequired: 5,
      eligibleNominators: ["SCF Pilot"],
    },
  ];

  // Upsert each role, preserving createdAt & removedAt from DB if they exist
  for (const role of tierRoles) {
    const existingRole = existingRoles.find((r) => r._id === role._id);
    if (existingRole) {
      role.createdAt = existingRole.createdAt;
      role.removedAt = existingRole.removedAt;
    }
    role.updatedAt = now;
    await upsertTierRole(role);
  }

  // Look up the roles after insertion to verify
  const updatedRoles = await db
    .collection<TierRole>("guild_roles")
    .find({
      _id: { $in: tierRoles.map((role) => role._id) },
    })
    .toArray();

  console.log("Updated roles in database:");
  updatedRoles.forEach((role) => {
    console.log(`Role: ${role.roleName} (${role.tier})`);
  });

  // Log to a file
  await printFile(updatedRoles);
}

/**
 * Writes the given data to a file named outputlog.log
 * @param data The data to write to the file
 */
export async function printFile(data: unknown): Promise<void> {
  try {
    const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);

    await fs.writeFile("outputlog.log", content, "utf8");
    console.log("Successfully wrote to outputlog.log");
  } catch (error) {
    console.error("Error writing to file:", error);
  }
}

/**
 * Upserts an individual TierRole in the database without overwriting the existing base fields.
 */
export async function upsertTierRole(role: TierRole): Promise<void> {
  const db = await getMongoDatabase();
  const validationResult = await validateTierRoleData(role);
  if (!validationResult.valid) {
    throw new Error(`Invalid role data: ${validationResult.errors.join(", ")}`);
  }
  await db.collection<TierRole>("guild_roles").updateOne(
    { _id: role._id },
    {
      $set: {
        // TierRole-specific fields we want to ensure are present
        roleName: role.roleName,
        description: role.description,
        tier: role.tier,
        requirements: role.requirements,
        requirementGroups: role.requirementGroups,
        nominationEnabled: role.nominationEnabled,
        votesRequired: role.votesRequired,
        eligibleNominators: role.eligibleNominators,
        removedAt: role.removedAt,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        // Insert only if this doc is new
        guildId: role.guildId,
        createdAt: role.createdAt || new Date(),
      },
    },
    { upsert: true },
  );
}

export async function getAllRoles(): Promise<TierRole[]> {
  const db = await getMongoDatabase();
  const existingRoles = await db.collection<TierRole>("guild_roles").find().toArray();
  return existingRoles;
}

// Mock function to create a new role
export async function createRole(role: TierRole): Promise<TierRole> {
  // Validate the role before creating it
  const validationResult = await validateTierRoleData(role);
  if (!validationResult.valid) {
    throw new Error(`Invalid role data: ${validationResult.errors.join(", ")}`);
  }

  // Return the role with a new ID
  return {
    ...role,
    _id: `role-${Date.now()}`, // this should create the role on discord then add the requirements or whatever in the databse.
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Validates a TierRole data structure to ensure it meets all requirements
 * @param role The TierRole object to validate
 * @returns Object with validation result and any error messages
 */
export async function validateTierRoleData(role: TierRole): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Basic required fields
  if (!role.roleName) errors.push("roleName is required");
  if (!role.guildId) errors.push("guildId is required");
  if (!role.description) errors.push("description is required");

  // Validate tier
  /*
  const validTiers: RoleTier[] = ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"];
  if (!role.tier || !validTiers.includes(role.tier)) {
    errors.push(`tier must be one of: ${validTiers.join(", ")}`);
  }
  */

  // Validate RoleMode
  const validRoleModes: RoleMode[] = ["ANY_GROUP", "ALL_GROUPS"];
  if (!role.requirements || !validRoleModes.includes(role.requirements)) {
    errors.push(`requirements must be one of: ${validRoleModes.join(", ")}`);
  }

  // If nominationEnabled is true, validate related fields
  if (role.nominationEnabled === true) {
    if (role.votesRequired === undefined || role.votesRequired <= 0) {
      errors.push("votesRequired must be defined and positive when nominationEnabled is true");
    }
    if (!role.eligibleNominators || role.eligibleNominators.length === 0) {
      errors.push("eligibleNominators must be defined and not empty when nominationEnabled is true");
    }
  }

  // Validate requirementGroups
  if (!role.requirementGroups || role.requirementGroups.length === 0) {
    errors.push("requirementGroups must be defined and not empty");
  } else {
    // Validate each requirement group
    role.requirementGroups.forEach((group, groupIndex) => {
      if (!group.id) errors.push(`requirementGroups[${groupIndex}].id is required`);
      if (!group.name) errors.push(`requirementGroups[${groupIndex}].name is required`);

      const validGroupModes: GroupMode[] = ["ANY", "ALL"];
      if (!group.groupMode || !validGroupModes.includes(group.groupMode)) {
        errors.push(`requirementGroups[${groupIndex}].groupMode must be one of: ${validGroupModes.join(", ")}`);
      }

      if (!group.requirements || group.requirements.length === 0) {
        errors.push(`requirementGroups[${groupIndex}].requirements must be defined and not empty`);
      } else {
        // Validate each requirement in the group
        group.requirements.forEach((req, reqIndex) => {
          if (!req.id) errors.push(`requirementGroups[${groupIndex}].requirements[${reqIndex}].id is required`);

          const validVerificationTypes: VerificationType[] = ["Discord", "SocialVerification", "StellarAccount", "BadgeCount", "ConcurrentRole", "Nomination", "CommunityVote", "ExistingRole"];

          if (!req.type || !validVerificationTypes.includes(req.type)) {
            errors.push(`requirementGroups[${groupIndex}].requirements[${reqIndex}].type must be one of: ${validVerificationTypes.join(", ")}`);
          } else {
            // Validate type-specific fields
            switch (req.type) {
              case "BadgeCount":
                if (!req.badgeCategory) errors.push(`requirementGroups[${groupIndex}].requirements[${reqIndex}].badgeCategory is required for BadgeCount type`);
                if (typeof req.minCount !== "number" || req.minCount <= 0)
                  errors.push(`requirementGroups[${groupIndex}].requirements[${reqIndex}].minCount must be a positive number for BadgeCount type`);
                break;
              case "ConcurrentRole":
                if (!req.concurrentRoleName) errors.push(`requirementGroups[${groupIndex}].requirements[${reqIndex}].concurrentRoleName is required for ConcurrentRole type`);
                break;
              case "ExistingRole":
                if (!req.existingRole) errors.push(`requirementGroups[${groupIndex}].requirements[${reqIndex}].existingRole is required for ExistingRole type`);
                break;
              case "Nomination":
                if (!req.eligibleVoterRoles || req.eligibleVoterRoles.length === 0)
                  errors.push(`requirementGroups[${groupIndex}].requirements[${reqIndex}].eligibleVoterRoles must be defined and not empty for Nomination type`);
                if (typeof req.nominationRequiredCount !== "number" || req.nominationRequiredCount <= 0)
                  errors.push(`requirementGroups[${groupIndex}].requirements[${reqIndex}].nominationRequiredCount must be a positive number for Nomination type`);
                break;
              case "CommunityVote":
                if (typeof req.participationRounds !== "number" || req.participationRounds <= 0)
                  errors.push(`requirementGroups[${groupIndex}].requirements[${reqIndex}].participationRounds must be a positive number for CommunityVote type`);
                break;
            }
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Mock function to update an existing role
export async function updateRole(role: TierRole): Promise<TierRole> {
  const db = await getMongoDatabase();
  const validationResult = await validateTierRoleData(role);
  if (!validationResult.valid) {
    throw new Error(`Invalid role data: ${validationResult.errors.join(", ")}`);
  }
  const result = await db.collection<TierRole>("guild_roles").findOneAndUpdate(
    { _id: role._id },
    {
      $set: {
        // TierRole-specific fields we want to ensure are present
        roleName: role.roleName,
        description: role.description,
        tier: role.tier,
        requirements: role.requirements,
        requirementGroups: role.requirementGroups,
        nominationEnabled: role.nominationEnabled,
        votesRequired: role.votesRequired,
        eligibleNominators: role.eligibleNominators,
        removedAt: role.removedAt,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        // Insert only if this doc is new
        guildId: role.guildId,
        createdAt: role.createdAt || new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!result) {
    throw new Error(`Failed to update role: ${role._id}`);
  }

  return result;
}

// Mock function to delete a role
export async function deleteRole(roleId: string): Promise<void> {
  // In a real implementation, this would delete from a database
  console.log("Deleting role:", roleId);
  console.log("this feature is not implemented sorry");
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return nothing
  return;
}
/**
 * Helper: Checks if user has an account with at least a badge. (precomputedBadge with publicKey).
 */
export async function checkStellarQuestForDiscordId(userId: string, db: Db): Promise<boolean> {
  const precomputed = await db.collection<PrecomputedBadge>("precomputed_badges").findOne({ discordId: userId });
  return !!precomputed?.publicKey;
}

/**
 * Helper: Checks if the user linked their social account (simply returns true here).
 */
export async function checkSocialVerificationRequirement(member: MemberInfo, provider: string): Promise<{ met: boolean; provider: string }> {
  // For now, if they have a discordId, return true
  return { met: !!member.discordId, provider: provider };
}

/**
 * Helper: Checks if user has a Stellar account (precomputedBadge with publicKey).
 */
export async function getBadgeForPubKey(publicKey: string, db: Db): Promise<null | PrecomputedBadge> {
  const precomputed = await db.collection<PrecomputedBadge>("precomputed_badges").findOne({ publicKey: publicKey });
  if (!precomputed) return null;
  return precomputed;
}

/**
 * Helper: Checks if the user’s badge count meets a minimum.
 */
/**
 * Extracts category from a badge code by splitting at the first number
 */
export async function extractCategoryFromCode(code: string): Promise<string> {
  // Find the index of the first digit in the code
  const firstDigitIndex = code.search(/\d/);
  if (firstDigitIndex === -1) return code; // No digits found, return the whole code
  return code.substring(0, firstDigitIndex);
}

/**
 * Gets the category for a badge from either category_broad or by parsing the code
 */
export async function getBadgeCategory(badge: { category_broad?: string; code?: string }): Promise<string> {
  // First try to use the explicit category if available
  if (badge.category_broad && badge.category_broad.trim() !== "") {
    return badge.category_broad;
  }

  // Fall back to extracting from code if available
  if (badge.code) {
    return await extractCategoryFromCode(badge.code);
  }

  // If neither is available
  return "unknown";
}

/**
 * Extract unique categories from a collection of badges
 */
export async function getUniqueBadgeCategories(db: Db): Promise<string[]> {
  // Get all badges from the badges collection
  const badges = await db.collection<BadgeAsset>("badges").find({}).toArray();

  // Get unique categories using Set
  const categories = new Set<string>();

  // Use for...of loop for proper async handling
  for (const badge of badges) {
    const category = await getBadgeCategory(badge);
    categories.add(category);
  }

  return Array.from(categories).sort();
}

/**
 * Helper: Checks if the user's badge count meets a minimum for a specific category.
 */
export async function checkBadgeCountRequirement(userId: string, minCount: number, db: Db): Promise<{ met: boolean; categoryCounts: { [category: string]: number } }> {
  const precomputed = await db.collection<PrecomputedBadge>("precomputed_badges").findOne({ discordId: userId });

  if (!precomputed?.badges?.length) {
    return { met: false, categoryCounts: {} };
  }

  // Create an object to store category counts
  const categoryCounts: { [category: string]: number } = {};

  // Count badges by category
  // Use a for...of loop instead of forEach to handle async operations
  for (const badge of precomputed.badges) {
    const category = await getBadgeCategory(badge);
    if (!categoryCounts[category]) {
      categoryCounts[category] = 0;
    }
    categoryCounts[category]++;
  }
  const result = {
    // this met boolean is whether all the precomputed.badges.length is greater than the mincount.
    met: precomputed.badges.length >= minCount,
    categoryCounts: categoryCounts, // categorycounts looks like: {SSQ: 5, XYZ: 3}
  };
  return result;

  /* 
  // Count badges that match the requested category
  const categoryBadgeCount = precomputed.badges.filter(badge => {
    // Get the badge's category
    const category = getBadgeCategory(badge);
    return category.toLowerCase() === badgeCategory.toLowerCase();
  }).length;
  
  return categoryBadgeCount >= minCount;*/
}

/**
 * Helper: Check if user has a Stellar account
 */
export async function checkStellarAccountRequirement(member: MemberInfo, db: Db): Promise<boolean> {
  const scf_user = await db.collection<SCFUser>("SCF_Users").findOne({ discordId: member.discordId });
  if (scf_user) {
    return !!scf_user.publicKey;
  }
  return false;
}

/**
 * Helper: Simple Discord requirement
 */
export async function checkDiscordRequirement(member: MemberInfo): Promise<boolean> {
  return !!member.discordId;
}

/**
 * Helper: checks for nomination requirements and votes.
 */
export async function checkNominationRequirement(role: TierRole, userId: string): Promise<NominationRequirementVerification> {
  // Connect to DB
  const db = await getMongoDatabase();

  // Query all nomination threads where this user was a nominee for this role
  const nominationThreads = await db
    .collection<NominationThread>("nomination_threads")
    .find({
      nomineeId: userId,
      roleId: role._id,
    })
    .toArray();

  // If no nomination threads exist, return not met
  if (nominationThreads.length === 0) {
    return {
      met: false,
      roleName: role.roleName,
      winningThread: "",
      nominatorId: "",
      voteResults: [],
    };
  }

  // Get all nomination votes for these threads
  const nominationVotes = await db
    .collection<NominationVote>("nomination_votes")
    .find({
      threadId: { $in: nominationThreads.map((thread) => thread._id) },
    })
    .toArray();

  // Process each thread to build vote results
  const voteResults: NominationVoteResult[] = nominationThreads.map((thread) => {
    const threadVotes = nominationVotes.filter((vote) => vote.threadId === thread._id);

    // Find the last vote timestamp
    const lastVote = threadVotes.length > 0 ? new Date(Math.max(...threadVotes.map((v) => v.voteTimestamp.getTime()))) : thread.createdAt;

    return {
      met: threadVotes.length >= (role.votesRequired || 0),
      threadId: thread._id,
      voteCount: threadVotes.length,
      lastVote: lastVote,
      nominationDate: thread.createdAt,
      votes: threadVotes,
    };
  });

  // Find threads that meet the vote requirement
  const successfulThreads = voteResults.filter((result) => result.met);

  // If no thread has enough votes, return not met
  if (successfulThreads.length === 0) {
    return {
      met: false,
      roleName: role.roleName,
      winningThread: "",
      nominatorId: "",
      voteResults: voteResults,
    };
  }

  // Find the winning thread (the one with the most votes)
  const winningResult = successfulThreads.reduce((prev, current) => (prev.voteCount > current.voteCount ? prev : current));

  // Find the original thread to get the nominator
  const winningThread = nominationThreads.find((thread) => thread._id === winningResult.threadId);

  return {
    met: true,
    roleName: role.roleName,
    winningThread: winningResult.threadId,
    nominatorId: winningThread?.nominatorId || "",
    voteResults: voteResults,
  };
}
/**
 * Checks if a user meets the requirements for an existing role
 */
export async function checkExistingRoleRequirement(userId: string, existingRole: string, db: Db): Promise<boolean> {
  // Get the member to check their roles
  const member = await db.collection<MemberInfo>("members").findOne({ discordId: userId });
  if (!member?.roles) return false;

  // Check if they have the required role
  return member.roles.some((role) => role.name === existingRole);
}

/**
 * Checks if a user meets community vote requirements
 */
export async function checkCommunityVoteRequirement(member: MemberInfo, participationRounds: number, db: Db): Promise<boolean> {
  console.log(`pretending to check vote requirement for ${member} ${participationRounds}, ${db}`);
  // We need a way to fetch this data from an api and put it in the database for now just return true.
  return true;
}

//checks if a member has some role.
export async function checkConcurrentRoleRequirement(member: MemberInfo, concurrentRole: string): Promise<{ met: boolean; reason: string }> {
  // Get the member to check their roles
  const role = member.roles.find((r) => r.name === concurrentRole);
  const met = role === undefined ? false : true;
  return { met: met, reason: met ? `User has concurrent role ${concurrentRole}` : `User does not have concurrent role ${concurrentRole}` };
}
/**
 * Evaluates all requirements in a group based on group mode (ALL or ANY)
 */
export async function evaluateRequirementGroup(group: RequirementGroup, member: MemberInfo, role: TierRole, db: Db): Promise<RequirementGroupResult> {
  const reqResults = [];
  let metCount = 0;

  for (const req of group.requirements) {
    let met = false;
    let reason: string | undefined | { [category: string]: number };

    try {
      switch (req.type) {
        case "Discord":
          met = await checkDiscordRequirement(member);
          reason = `User joined discord on ${member.joinedStellarDevelopers}`;
          break;
        case "SocialVerification":
          const socialResult = await checkSocialVerificationRequirement(member, req.provider || "discord");
          met = socialResult.met;
          reason = met ? `user has linked their ${socialResult.provider}` : `user has not linked their ${socialResult.provider}`;
          break;
        case "StellarAccount":
          met = await checkStellarAccountRequirement(member, db);
          break;
        case "BadgeCount":
          const badges = await checkBadgeCountRequirement(member.discordId, req.minCount || 5, db);
          met = badges.met;
          reason = badges.categoryCounts;
          console.log(`[evaluateRequirementGroup] - ${Date.now()} - User ${member.discordId} badge count check: ${met ? "met" : "not met"}`);
          break;
        case "ConcurrentRole":
          if (!req.concurrentRoleName) throw new Error("ConcurrentRole requirement missing concurrentRoleName");
          const cRoleResult = await checkConcurrentRoleRequirement(member, req.concurrentRoleName);
          met = cRoleResult.met;
          reason = cRoleResult.reason;
          break;
        case "ExistingRole":
          // in theory this one should actually be checking if they perviously earned some role but effectively this is the same thing.
          // The difference is this one would usually be removed when they earn the next one while concurrent stays. 
          // (they can have both at once.) however since we already check to make sure they only have one tier role in the other function it is fine.
          if (!req.existingRole) throw new Error("ExistingRole requirement missing existingRole");
          const eRoleResult = await checkConcurrentRoleRequirement(member, req.existingRole);
          met = eRoleResult.met;
          reason = eRoleResult.reason;
          break;
        case "CommunityVote":
          if (!req.participationRounds) throw new Error("CommunityVote requirement missing participationRounds");
          met = await checkCommunityVoteRequirement(member, req.participationRounds, db);
          break;
        case "Nomination":
          const voteResult = await checkNominationRequirement(role, member.discordId);
          met = voteResult.met;
          const totalNominations = voteResult.voteResults.length;
          const totalVotes = voteResult.voteResults.reduce((sum, result) => sum + result.voteCount, 0);
          const winningNomination = voteResult.voteResults.find((result) => result.threadId === voteResult.winningThread);

          reason = met
            ? `User has ${totalNominations} nomination(s) with a total of ${totalVotes} votes. ` +
              `The winning nomination received ${winningNomination?.voteCount || 0} votes ` +
              `and was created by ${voteResult.nominatorId} on ${winningNomination?.nominationDate.toLocaleDateString()}.`
            : `User has ${totalNominations} nomination(s) with a total of ${totalVotes} votes, ` + `but none meet the required ${role.votesRequired || 0} votes threshold.`;
          console.log(`[evaluateRequirementGroup] - ${Date.now()} - User ${member.discordId} nomination check: ${reason}`);
          break;
        default:
          met = false;
          reason = `Unknown requirement type: ${req.type}`;
      }
    } catch (error) {
      met = false;
      reason = `Error checking requirement: ${error instanceof Error ? error.message : String(error)}`;
    }

    if (met) metCount++;

    reqResults.push({
      id: req.id || "",
      met,
      reason: met ? undefined : reason || `Requirement ${req.type} not met`,
    });
  }

  // Determine if the group is met based on its mode
  const groupMet = group.groupMode === "ALL" ? metCount === group.requirements.length : metCount > 0;
  console.log(`[evaluateRequirementGroup] - ${Date.now()} - User ${member.discordId} group ${group.name} check: ${groupMet ? "met" : "not met"}`);
  console.log(`[evaluateRequirementGroup] - ${Date.now()} - requirementresults ${JSON.stringify(reqResults)}`);
  return {
    groupId: group.id,
    met: groupMet,
    requirements: reqResults,
  };
}

/**
 * Gets the highest role a user is eligible for
 * @param userId Discord ID of the user
 * @returns The highest role the user is eligible for, or null if not eligible for any role
 */
export async function getHighestEligibleRole(userId: string): Promise<{ role: TierRole | null; eligibility: RoleEligibilityResult }> {
  const db = await getMongoDatabase();

  // Get member data
  const member = await db.collection<MemberInfo>("members").findOne({ discordId: userId });
  if (!member) {
    return {
      role: null,
      eligibility: {
        eligible: false,
        requirementsMet: [],
        message: "User not found",
      },
    };
  }

  // Get all roles from the database and sort them by tier hierarchy
  // This assumes the tiers are ordered: Verified -> Pathfinder -> Navigator -> Pilot
  const tierOrder: { [key in RoleTier]: number } = {
    "SCF Verified": 1,
    "SCF Pathfinder": 2,
    "SCF Navigator": 3,
    "SCF Pilot": 4,
  };

  //const precomputedBadges = await getBadgesForDiscordId(userId);

  const roles = await db
    .collection<TierRole>("guild_roles")
    .find({ requirements: { $exists: true } })
    .toArray();

  // Sort roles from highest tier to lowest
  const sortedRoles = roles.sort((a, b) => {
    const tierA = tierOrder[a.tier as RoleTier] || 0;
    const tierB = tierOrder[b.tier as RoleTier] || 0;
    return tierB - tierA; // Descending order to check highest first
  });

  const currentRole = member.roles.find((role) => role.name === sortedRoles[0].roleName);
  console.log(`the current user ${member.username} currentRole is ${currentRole}`);

  // each memberInfo document has an array of "roles" which is basically showing when they earned previous roles already. 
  // For this reason we need to only check for the next role than the user has not already earned.
  const existingroles = member.roles;
  // Filter out roles the user already has
  const filteredRoles = sortedRoles.filter((role) => !existingroles.some((r) => r.name === role.roleName));

  // Check each role in order from highest to lowest
  for (const role of filteredRoles) {
    const eligibility = await checkRoleEligibility(role, member);
    if (eligibility.eligible) {
      return { role, eligibility };
    }
  }

  // User is not eligible for any role
  return {
    role: null,
    eligibility: {
      eligible: false,
      requirementsMet: [],
      message: "User is not eligible for any role",
    },
  };
}

/**
 * Checks if a user is eligible for a specific role
 */
export async function checkRoleEligibility(
  //roleId: string,
  //userId: string
  role: TierRole,
  member: MemberInfo,
): Promise<RoleEligibilityResult> {
  const db = await getMongoDatabase();

  // Evaluate each requirement group
  const groupResults: RequirementGroupResult[] = [];
  if (!role.requirementGroups) {
    throw new Error(`Role ${role.roleName} does not have any requirement groups, admin must grant role`);
  }
  for (const group of role.requirementGroups) {
    const groupResult = await evaluateRequirementGroup(group, member, role, db);
    groupResults.push(groupResult);
  }

  // Determine eligibility based on role's requirement mode
  let eligible = false;
  if (role.requirements === "ALL_GROUPS") {
    eligible = groupResults.every((group) => group.met);
  } else if (role.requirements === "ANY_GROUP") {
    eligible = groupResults.some((group) => group.met);
  }

  return {
    eligible,
    requirementsMet: groupResults,
    message: eligible ? `User is eligible for role ${role.roleName}` : `User does not meet the requirements for role ${role.roleName}`,
  };
}

// Update the grantRole function to handle role requirements and overrides
export async function grantRole(roleId: string, userId: string, override = false): Promise<RoleActionResult> {
  // In a real implementation, this would grant the role in the database
  console.log("Granting role:", roleId, "to user:", userId, "override:", override);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // If override is true, grant the role regardless of requirements
  if (override) {
    return {
      success: true,
      message: "Role granted successfully (overridden)",
    };
  }

  // Check if the user meets the requirements
  // This would be a more complex check in a real implementation
  const roles = await getAllRoles();
  const role = roles.find((r) => r._id === roleId);

  if (!role) {
    return {
      success: false,
      message: "Role not found",
    };
  }

  // Check if the user meets the requirements
  // In a real implementation, this would check against the user's badges, roles, etc.
  // For now, we'll just simulate a check based on the role tier

  // For demonstration purposes, let's say users can only get roles in order:
  // Verified -> Pathfinder -> Navigator -> Pilot
  const tierOrder: RoleTier[] = ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const roleIndex = tierOrder.indexOf(role.tier as RoleTier);

  // Randomly determine if the user meets the requirements
  const meetsRequirements = Math.random() > 0.3; // 70% chance of success

  if (meetsRequirements) {
    return {
      success: true,
      message: `Role ${role.roleName} granted successfully`,
    };
  } else {
    return {
      success: false,
      message: "User does not meet the requirements for this role",
    };
  }
}

// Mock function to nominate a user for a role
export async function nominateForRole(roleId: string, userId: string): Promise<NominationEligibilityResult> {
  // In a real implementation, this would check the user's badges and other requirements
  console.log("Checking eligibility for role:", roleId, "user:", userId);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // For demo purposes, return eligible for some users and not for others
  const isEligible = userId.length > 10;

  return {
    eligible: isEligible,
    reason: isEligible ? undefined : "User does not have the required badges",
  };
}

// Mock function to create a voting thread in Discord
export async function createVotingThread(roleId: string, userId: string, reason: string): Promise<RoleActionResult> {
  // In a real implementation, this would create a thread in Discord
  console.log("Creating voting thread for role:", roleId, "user:", userId, "reason:", reason);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return success
  return {
    success: true,
    threadId: `thread-${Date.now()}`,
  };
}

// Mock function to revoke a role from a user
export async function revokeRole(roleId: string, userId: string): Promise<RoleActionResult> {
  // In a real implementation, this would revoke the role in the database
  console.log("Revoking role:", roleId, "from user:", userId);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return success
  return {
    success: true,
    message: "Role revoked successfully",
  };
}
