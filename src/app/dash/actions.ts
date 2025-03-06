// app/dash/actions.ts
"use server";

import { getClient } from "@/discord-bot/client";
import { Guild } from "discord.js";
import { syncRoles, syncMembers } from "@/discord-bot/roles";
import { getAllMembersForGuild, getRoleCounts } from "@/discord-bot/db";

/** Force a refresh from Discord => DB for this guild. */
export async function refreshGuildFromDiscord(guildId: string): Promise<void> {
  const client = await getClient();
  let guild: Guild | undefined = client.guilds.cache.get(guildId);

  if (!guild) {
    guild = await client.guilds.fetch(guildId);
  }

  // Force the sync (reads from Discord, upserts into DB)
  await syncRoles(guild);
  await syncMembers(guild);
}

/** Load from DB the role stats + full member list for that guild. */
export async function loadGuildData(guildId: string): Promise<{
  
  roleStats: {
    verified: number;
    pathfinder: number;
    navigator: number;
    pilot: number;
  };
  members: {
    discordId: string;
    name: string;
    avatar: string;
    memberSince: string;
    joinedDiscord: string;
    roles: Array<{ name: string; obtained: string }>;
    profileDescription: string;
    joinedStellarDevelopers?: string;
  }[];
}> {
  console.log('in load guild data');
  const counts = await getRoleCounts(guildId);
  const dbMembers = await getAllMembersForGuild(guildId);

  // Convert `dbMembers` (MemberInfo) into the shape your client table expects.
  const members = dbMembers.map((m) => ({
    discordId: m.discordId,
    name: m.username,
    avatar: "/placeholder.svg?height=40&width=40",
    memberSince: m.memberSince,
    joinedDiscord: m.joinedDiscord,
    roles: m.roles.map((r) => ({
      // Possibly remove "SCF " prefix for display
      name: r.name,
      obtained: r.obtained,
    })),
    profileDescription: m.profileDescription,
    joinedStellarDevelopers: m.joinedStellarDevelopers,
  }));

  return {
    roleStats: {
      verified: counts.verified,
      pathfinder: counts.pathfinder,
      navigator: counts.navigator,
      pilot: counts.pilot,
    },
    members,
  };
}
