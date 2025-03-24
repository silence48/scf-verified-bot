// app/dash/actions.ts
"use server";
import "server-only";
import { Client, Guild } from "discord.js";

import { getClient } from "@/discord-bot/client";
// import { syncRoles, syncMembers } from "@/discord-bot/roles";
import { syncMembersFromDiscord, getRoleCounts, bulkUpsertGuildRoles } from "@/discord-bot/mongo-db";
import { MemberInfo } from "@/discord-bot/types";
// import { getCachedGuildData } from "@/discord-bot/cache";
import { logger } from "@/discord-bot/logger";
// import { parseTomlFiles } from "@/lib/tomlParser";
// import { migrateMongoDatabasetoMongo } from "@/discord-bot/migrate-mongo";
import { getAllPrecomputedBadges } from "@/lib/BadgeWatcher";

export type RoleFilter = {
  id: string;
  name: string;
  color: string; // For example, hex color code string
};

/**
 * Retrieves the roles from Discord for the given guild.
 * Excludes the @everyone role.
 */
export async function getGuildRolesFromDiscord(guild: Guild, client: Client): Promise<RoleFilter[]> {
  const roles = await guild.roles.fetch();
  const roleFilters: RoleFilter[] = [];

  roles?.each((role) => {
    if (role.name === "@everyone") return; // Exclude @everyone role
    // Sort roles so SCF roles appear first
    // This ordering is only for display in the roleFilters array
    if (role.name.startsWith("SCF")) {
      roleFilters.unshift({
        id: role.id,
        name: role.name,
        color: role.hexColor,
      });
      return;
    }
    roleFilters.push({
      id: role.id,
      name: role.name,
      color: role.hexColor,
    });
  });
  logger(`Fetched ${roleFilters.length} roles for guild ${guild.name}`, client);
  return roleFilters;
}

/** Force a refresh from Discord => DB for this guild. */
/*
export async function refreshGuildFromDiscord(guildId: string): Promise<void> {
  console.log(`[refreshGuildFromDiscord] getting discord client.`)
  const client = await getClient();
  console.log('[refreshGuildFromDiscord] client returned');
  let guild: Guild | undefined = await client.guilds.cache.get(guildId);
  console.log(`in refreshGuildFromDiscord with guild ${guild?.name}`)
  
  if (!guild) {
    guild = await client.guilds.fetch(guildId);
  }

  // Force the sync (reads from Discord, upserts into DB)
  console.log(`[refreshGuildFromDiscord] syncRoles starting`);
  console.time('syncRoles');
  await syncRoles(client, guild);
  console.timeEnd('syncRoles');
  console.log(`[refreshGuildFromDiscord] syncRoles done`)
  console.log(`[refreshGuildFromDiscord] syncMembers starting`);
  console.time('syncMembers');
  await syncMembers(client, guild);
  console.timeEnd('syncMembers');
  console.log(`[refreshGuildFromDiscord] syncMembers done`)
}
*/
/** Load from DB the role stats + full member list for that guild. */
export async function loadGuildData(guildId: string): Promise<{
  roleStats: {
    verified: number;
    pathfinder: number;
    navigator: number;
    pilot: number;
  };
  members: MemberInfo[];
}> {
  const client = await getClient(`[loadGuildData] for ${guildId}`);
  const guild = await client.guilds.fetch(guildId);
  const roles = await guild.roles.fetch();

  //console.log(`migrating mongo to mongo`)
  console.log(`[loadGuildData] [${Date.now()} ] - initializing the bot and checking if database migration is needed`);
  //await migrateMongoDatabasetoMongo();
  console.log(`[loadGuildData] [${Date.now()} ] - database migration complete`);
  console.log(`[loadGuildData] [${Date.now()} ] - parsing the guild roles from discord`);
  console.time("bulkUpsertGuildRoles");
  await bulkUpsertGuildRoles(guild, roles, client);
  console.timeEnd("bulkUpsertGuildRoles");
  console.log(`[loadGuildData] [${Date.now()} ] - guild roles parsed`);
  console.log(`[loadGuildData] [${Date.now()} ] - checking the role counts`);
  console.time("getRoleCounts");
  const counts = await getRoleCounts(guild);
  console.timeEnd("getRoleCounts");
  console.log(`[loadGuildData] [${Date.now()} ] - role counts checked`);
  console.log(`[loadGuildData] [${Date.now()} ] - syncing members from discord`);
  console.time("syncMembersFromDiscord");
  const dbMembers = await syncMembersFromDiscord(guild, client);
  console.timeEnd("syncMembersFromDiscord");
  console.log(`[loadGuildData] [${Date.now()} ] - members synced from discord`);
  const badges = await getAllPrecomputedBadges();
  console.log(`[loadGuildData] [${Date.now()} ] - badges fetched, retrieved ${badges.length} badges`);
  //const assets= await parseTomlFiles()
  //console.log(`asssets parsed ${assets}`);
  //console.log('all asset holders refreshed');
  //console.log(`[loadGuildData] with ${dbMembers.length} members`)

  return {
    roleStats: {
      verified: counts.verified,
      pathfinder: counts.pathfinder,
      navigator: counts.navigator,
      pilot: counts.pilot,
    },
    members: dbMembers,
    //userbadges: badges,
    //uservotes: votes,
    //threads: threads
  };
}
