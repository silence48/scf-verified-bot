// src/discord-bot/roles.ts
//'use server';
import { Guild, GuildMember, Role, DiscordAPIError } from "discord.js";
import { logger } from "./logger";
import {
  upsertRole,
  upsertMember,
  insertUserRole,
} from "./db";
import { BOT_READONLY_MODE } from "./constants";

export async function getRoleIdByName(
  guild: Guild,
  roleName: string
): Promise<string | null> {
  try {
    const role = guild.roles.cache.find((r) => r.name === roleName);
    return role ? role.id : null;
  } catch (err) {
    logger(`Error in getRoleIdByName: ${String(err)}`);
    console.error(err);
    return null;
  }
}

/** Ensures a user only has one SCF role at a time. */
export async function fixUserRoles(member: GuildMember): Promise<void> {
  try {
    const scfRoles = [
      "SCF Verified",
      "SCF Pathfinder",
      "SCF Navigator",
      "SCF Pilot",
    ];
    const currentRoles = member.roles.cache.filter((r) =>
      scfRoles.includes(r.name)
    );

    if (currentRoles.size > 1) {
      let highestRoleIndex = -1;
      let highestRole: Role | null = null;
      for (const role of currentRoles.values()) {
        const idx = scfRoles.indexOf(role.name);
        if (idx > highestRoleIndex) {
          highestRoleIndex = idx;
          highestRole = role;
        }
      }
      for (const role of currentRoles.values()) {
        if (scfRoles.indexOf(role.name) < highestRoleIndex && highestRole) {
          await member.roles.remove(
            role.id,
            `${member.user.tag} had extra role ${role.name}, only keeping ${highestRole.name}`
          );
        }
      }
    }
  } catch (err) {
    logger(`Error in fixUserRoles: ${String(err)}`);
    console.error(err);
  }
}

/** Fetch all roles from the guild, upsert them to DB. */
export async function syncRoles(guild: Guild): Promise<void> {
  try {
    const roles = await guild.roles.fetch();
    logger(`syncRoles: Fetched roles for guild ${guild.name}`);
    if (!BOT_READONLY_MODE) {
      for (const role of roles.values()) {
        await upsertRole(role.id, role.name, guild.id);
      }
    }
  } catch (err) {
    logger(`Error in syncRoles: ${String(err)}`);
    console.error(err);
  }
}

/** Fetch all members, upsert them, fix SCF roles if needed, etc. */
export async function syncMembers(guild: Guild): Promise<void> {
  try {
    const members = await guild.members.fetch();
    logger(
      `syncMembers: Fetched ${members.size} members for guild ${guild.name}`
    );

    const scfTierRoles = [
      "SCF Verified",
      "SCF Pathfinder",
      "SCF Navigator",
      "SCF Pilot",
    ];
    if (!BOT_READONLY_MODE) {
      for (const member of members.values()) {
        // If not read-only, fix user’s SCF roles if multiple

        const scfRoles = member.roles.cache.filter((r) =>
          scfTierRoles.includes(r.name)
        );
        if (scfRoles.size > 1) {
          await fixUserRoles(member);
        }


        // Upsert this member
        // If you want to store multiple guild IDs for each member, do so in a CSV
        const guildIds = guild.id;
        await upsertMember(
          member.id,
          member.user.username,
          member.user.discriminator,
          guildIds
        );

        // For each SCF role assigned, insert into user_roles if not present
        for (const role of member.roles.cache.values()) {
          if (role.name.startsWith("SCF")) {
            await insertUserRole(member.id, role.id, guild.id);
          }
        }
      }
    }
  } catch (err) {
    logger(`Error in syncMembers: ${String(err)}`);
    console.error(err);
  }
}

/** Update a user's SCF role, removing the old tier if needed. */
export async function updateUserRole(
  guild: Guild,
  userId: string,
  roleName: string
): Promise<boolean> {
  if (BOT_READONLY_MODE) {
    logger(
      `Bot is in read-only mode. Skipping role assignment for ${roleName}`
    );
    return false;
  }
  try {
    const member = await guild.members.fetch(userId);
    logger(
      `Assigning role [${roleName}] to user [${userId}] in guild [${guild.name}]`
    );

    let previousRoleName: string | undefined;
    if (roleName === "SCF Pathfinder") previousRoleName = "SCF Verified";
    if (roleName === "SCF Navigator") previousRoleName = "SCF Pathfinder";
    if (roleName === "SCF Pilot") previousRoleName = "SCF Navigator";

    const voterRoleName = "SCF Voter";
    const roleId = await getRoleIdByName(guild, roleName);
    const voterRoleId = await getRoleIdByName(guild, voterRoleName);
    const previousRoleId = previousRoleName
      ? await getRoleIdByName(guild, previousRoleName)
      : null;

    if (!roleId) {
      logger(`ERROR: Role ${roleName} not found in guild ${guild.name}`);
      return false;
    }

    // If user is moving up from SCF Pathfinder => SCF Navigator => also add SCF Voter
    if (previousRoleName === "SCF Pathfinder" && voterRoleId) {
      await member.roles.add(
        voterRoleId,
        `${member.user.tag} is now a SCF Voter`
      );
      logger(`Assigned SCF Voter to user ${member.user.tag}`);
    }

    // If user had no previous role
    if (!previousRoleId) {
      await member.roles.add(roleId, `${member.user.tag} earned ${roleName}`);
      return true;
    }

    // If user had SCF Verified, moving to SCF Pathfinder
    if (previousRoleName === "SCF Verified" && previousRoleId) {
      await member.roles.remove(
        previousRoleId,
        `${member.user.tag} advanced from Verified to ${roleName}`
      );
      await member.roles.add(
        roleId,
        `${member.user.tag} advanced from Verified to ${roleName}`
      );
      return true;
    }

    // Otherwise remove old SCF tier
    await member.roles.remove(
      previousRoleId,
      `${member.user.tag} advanced from ${previousRoleName} to ${roleName}`
    );
    await member.roles.add(
      roleId,
      `${member.user.tag} advanced to ${roleName}`
    );
    return true;
  } catch (error) {
    logger(`Error assigning or removing role: ${String(error)}`);
    console.error(error);
    return false;
  }
}

/** Full checks for "SCF Guest", SCF Project upgrade, or higher role conflicts. */
export async function grantRoleWithChecks(
  guild: Guild,
  userId: string,
  requestedRoleName: string
): Promise<{
  success: boolean;
  statusCode?: number;
  error?: string;
  finalRoleName?: string;
}> {
  try {
    const member = await guild.members.fetch(userId);

    if (requestedRoleName === "SCF Guest") {
      return {
        success: false,
        statusCode: 406,
        error: "User does not have a funded Stellar account",
      };
    }

    // If user has "SCF Project" role, upgrade "SCF Verified" -> "SCF Pathfinder"
    const hasProjectRole = member.roles.cache.some(
      (r) => r.name === "SCF Project"
    );
    let finalRoleName = requestedRoleName;
    if (hasProjectRole && requestedRoleName === "SCF Verified") {
      finalRoleName = "SCF Pathfinder";
      logger(
        `${member.user.username}#${member.user.discriminator} upgraded to SCF Pathfinder (SCF Project).`
      );
    }

    // Check if user already has a higher role
    let higherRoles = ["SCF Navigator", "SCF Pilot"];
    if (finalRoleName === "SCF Verified") {
      higherRoles = ["SCF Pathfinder", "SCF Navigator", "SCF Pilot"];
    }

    let higherRoleName = "";
    const hasHigherRole = member.roles.cache.some((r) => {
      if (higherRoles.includes(r.name)) {
        higherRoleName = r.name;
        return true;
      }
      return false;
    });
    if (hasHigherRole) {
      return {
        success: false,
        statusCode: 409,
        error: `Conflict: User already has a higher role (${higherRoleName}).`,
      };
    }

    // If user already has the finalRoleName
    const hasThisRole = member.roles.cache.some(
      (r) => r.name === finalRoleName
    );
    if (hasThisRole) {
      return {
        success: false,
        statusCode: 409,
        error: `Conflict: User already has ${finalRoleName} role.`,
      };
    }

    // Actually update the user role
    const success = await updateUserRole(guild, userId, finalRoleName);
    if (!success) {
      return {
        success: false,
        statusCode: 500,
        error: `Failed to grant role: ${finalRoleName}`,
      };
    }

    return { success: true, finalRoleName };
  } catch (error) {
    if (error instanceof Object && (error as DiscordAPIError).code === 10007) {
      return {
        success: false,
        statusCode: 404,
        error: "User not found in the guild.",
      };
    }
    logger(`Error in grantRoleWithChecks: ${String(error)}`);
    return { success: false, statusCode: 500, error: "Internal Server Error" };
  }
}
