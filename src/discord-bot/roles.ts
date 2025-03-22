// src/discord-bot/roles.ts
//'use server';
import { Guild, GuildMember, Role, DiscordAPIError, Client } from "discord.js";
import { logger } from "./logger";
import { BOT_READONLY_MODE } from "./constants";

export async function getRoleIdByName(
  guild: Guild,
  roleName: string,
  client: Client
): Promise<string | null> {
  try {
    const role = guild.roles.cache.find((r) => r.name === roleName);
    return role ? role.id : null;
  } catch (err) {
    logger(`Error in getRoleIdByName: ${String(err)}`, client);
    console.error(err);
    return null;
  }
}

/** Ensures a user only has one SCF role at a time. */
export async function fixUserRoles(member: GuildMember, client: Client): Promise<void> {
  try {
    logger(`fixUserRoles: Checking roles for ${member.user.tag}`, client);
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
          if (!BOT_READONLY_MODE) {
           await member.roles.remove(
            role.id,
              `${member.user.tag} had extra role ${role.name}, only keeping ${highestRole.name}`
            );
            logger(`Removed role ${role.name} from ${member.user.tag} because they already had ${highestRole.name}`, client);
          }
        }
      }
    }
  } catch (err) {
    logger(`Error in fixUserRoles: ${String(err)}`, client);
    console.error(err);
  }
}

/** Fetch all roles from the guild, upsert them to DB. */
/*
export async function syncRoles(client: Client, guild: Guild): Promise<void> {
  try {
    const roles = await guild.roles.fetch();
    logger(`[syncRoles] Fetched ${roles.size} roles for guild ${guild.name}`, client);

    // Bulk upsert them in one shot:
    await bulkUpsertGuildRoles(guild, roles, client);

  } catch (err) {
    logger(`Error in syncRoles: ${String(err)}`, client);
    console.error(err);
  }
}
*/
/** Fetch all members, upsert them, fix SCF roles if needed, etc. */
export async function syncMembers(client: Client, guild: Guild): Promise<void> {
  try {
    const members = await guild.members.fetch();
    logger(
      `syncMembers: Fetched ${members.size} members for guild ${guild.name}`,
      client
    );

    const scfTierRoles = [
      "SCF Verified",
      "SCF Pathfinder",
      "SCF Navigator",
      "SCF Pilot",
    ];
      for (const member of members.values()) {
        const scfRoles = member.roles.cache.filter((r) =>
          scfTierRoles.includes(r.name)
        );
        if (scfRoles.size > 1) {
          await fixUserRoles(member, client);
        }

        // Upsert this member
        // If you want to store multiple guild IDs for each member, do so in a CSV
        /*
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
            await upsertUserRole({userId: member.id, roleId: role.id, guildId: guild.id});
          }
        }
          */
      }
    }
   catch (err) {
    logger(`Error in syncMembers: ${String(err)}`, client);
    console.error(err);
  }
}

/** Update a user's SCF role, removing the old tier if needed. */
export async function updateUserRole(
  guild: Guild,
  userId: string,
  roleName: string,
  client: Client
): Promise<boolean> {
  try {
    const member = await guild.members.fetch(userId);
    logger(
      `Assigning role [${roleName}] to user [${userId}] in guild [${guild.name}]`,
      client
    );

    let previousRoleName: string | undefined;
    if (roleName === "SCF Pathfinder") previousRoleName = "SCF Verified";
    if (roleName === "SCF Navigator") previousRoleName = "SCF Pathfinder";
    if (roleName === "SCF Pilot") previousRoleName = "SCF Navigator";

    const roleId = await getRoleIdByName(guild, roleName, client);

    const previousRoleId = previousRoleName
      ? await getRoleIdByName(guild, previousRoleName, client)
      : null;

    if (!roleId) {
      logger(`ERROR: Role ${roleName} not found in guild ${guild.name}`, client);
      return false;
    }

    // If user had no previous role
    if (!previousRoleId) {
      if (!BOT_READONLY_MODE) {
      await member.roles.add(roleId, `${member.user.tag} earned ${roleName}`);
      return true;
      } else {
        logger(`[updateUserRole] BOT_READONLY_MODE is true, not adding role ${roleName} to ${member.user.tag}`, client);
        return true;
      }
    }

    // If user had SCF Verified, moving to SCF Pathfinder
    if (previousRoleName === "SCF Verified" && previousRoleId) {
      if (!BOT_READONLY_MODE) {
      await member.roles.remove(
        previousRoleId,
        `${member.user.tag} advanced from Verified to ${roleName}`
      );
      await member.roles.add(
        roleId,
        `${member.user.tag} advanced from Verified to ${roleName}`
      );
      return true;
    } else{
      logger(`[updateUserRole] BOT_READONLY_MODE is true, not removing role ${previousRoleName} from ${member.user.tag}`, client);
      logger(`[updateUserRole] BOT_READONLY_MODE is true, not adding role ${roleName} to ${member.user.tag}`, client);
      return true;
    }
    }

    // Otherwise remove old SCF tier
    if (!BOT_READONLY_MODE) {
    await member.roles.remove(
      previousRoleId,
      `${member.user.tag} advanced from ${previousRoleName} to ${roleName}`
    );
    await member.roles.add(
      roleId,
      `${member.user.tag} advanced to ${roleName}`
    );
    return true;
  } else {
    logger(`[updateUserRole] BOT_READONLY_MODE is true, not removing role ${previousRoleName} from ${member.user.tag}`, client);
    logger(`[updateUserRole] BOT_READONLY_MODE is true, not adding role ${roleName} to ${member.user.tag}`, client);
    return true;
  }
  } catch (error) {
    logger(`Error assigning or removing role: ${String(error)}`, client);
    console.error(error);
    return false;
  }
}

/** Full checks for "SCF Guest", SCF Project upgrade, or higher role conflicts. */
export async function grantRoleWithChecks(
  guild: Guild,
  userId: string,
  requestedRoleName: string,
  client: Client
): Promise<{
  success: boolean;
  statusCode: number;
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
        `${member.user.username}#${member.user.discriminator} upgraded to SCF Pathfinder (SCF Project).`, 
        client
      );
    }
    const hasExistingRole: boolean = member.roles.cache.some((r) => r.name === finalRoleName);
    if (hasExistingRole) {
      return {
        success: false,
        statusCode: 409,
        error: `Conflict: User already has ${finalRoleName} role.`,
      };
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
    
    const success = await updateUserRole(guild, userId, finalRoleName, client);
    if (!success) {
      return {
        success: false,
        statusCode: 500,
        error: `Failed to grant role: ${finalRoleName}`,
      };
    }

    return { success: true, statusCode: 200, finalRoleName: finalRoleName };
  } catch (error) {
    if (error instanceof Object && (error as DiscordAPIError).code === 10007) {
      return {
        success: false,
        statusCode: 404,
        error: "User not found in the guild.",
      };
    }
    logger(`Error in grantRoleWithChecks: ${String(error)}`, client);
    return { success: false, statusCode: 500, error: `Internal Server Error: Error in grantRoleWithChecks: ${String(error)}` };
  }
}
