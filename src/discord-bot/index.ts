// src/discord-bot/index.ts
/*
import { DiscordClient } from "./client";
import { syncRoles, syncMembers } from "./roles";
import { registerSlashCommands } from "./commands";
import { logger, DISCORD_BOT_TOKEN } from "./utils";
import { Guild } from "discord.js";
import { getDb } from "@/discord-bot/db";

let isBotInitialized = false;

export async function startBot(readonly: boolean): Promise<void> {
  // If already started, do nothing
  if (isBotInitialized) {
    return;
  }
  isBotInitialized = true;

  const client = DiscordClient();

  client.login(DISCORD_BOT_TOKEN!).catch((err) => {
    logger(`Error logging in Discord client: ${String(err)}`);
  });

  client.once("ready", async () => {
    if (!client.user) {
      logger("Client user is not defined after login.");
      return;
    }

    try {
      const db = await getDb();
      logger("Bot is ready. Fetching guilds...");

      const guilds = await client.guilds.fetch();
      const clientId = client.user.id;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [guildId, partialGuild] of guilds) {
        const fullGuild: Guild = await client.guilds.fetch(guildId);
        logger(`Initializing guild: ${fullGuild.name} (${guildId})`);

        await db.run(
          "INSERT OR REPLACE INTO guilds (guild_id, guild_name) VALUES (?, ?)",
          fullGuild.id,
          fullGuild.name
        );

        // If not in read-only mode, sync roles/members and register commands
        if (!readonly) {
          await syncRoles(fullGuild);
          await syncMembers(fullGuild);
        }

        // Register slash commands (even if read-only, you typically want your commands up to date)
        await registerSlashCommands(clientId, fullGuild);

        logger(`Guild initialization complete: ${fullGuild.name}`);
      }
    } catch (error) {
      logger(`Error during onReady: ${String(error)}`);
      console.error(error);
    }
  });
}
*/
