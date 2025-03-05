// src/discord-bot/client.ts

import { Client, GatewayIntentBits, Guild } from "discord.js";
import { logger } from "./logger";
import { handleMessageCreateEvent } from "./messages";
import { handleInteractionCreateEvent } from "./interactions";
import { syncRoles, syncMembers } from "./roles";
import { registerSlashCommands } from "./commands";
import { storeGuild } from "./db";
import { DISCORD_BOT_TOKEN, BOT_IS_LOGGED_IN, BOT_READONLY_MODE } from "./constants";

let client: Client | null = null;

// We track whether we're already logging in
let isLoggingIn = false;
// Once the client emits "ready", we run the big block (sync roles, etc.) just once
let didRunReadyBlock = false;

/**
 * Returns the Discord client singleton. If it's not yet created/logged in,
 * this will:
 *   - Create it
 *   - Log in
 *   - On "ready", run sync roles, register slash commands, etc.
 */
export async function getClient(): Promise<Client> {
  // If we already have a client, return it
  console.log('in getclient');
  if (client) {
    return client;
  }

  // Otherwise, create a new Client
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  if (!BOT_READONLY_MODE) {
    // Hook event handlers (messageCreate, interactionCreate)
    client.on("messageCreate", async (message) => {
      await handleMessageCreateEvent(message);
    });
    client.on("interactionCreate", async (interaction) => {
      await handleInteractionCreateEvent(interaction);
    });

  }

  // Initiate login on first getClient() call
  if (!isLoggingIn) {
    isLoggingIn = true;
    console.log('is logging in')
    client
      .login(DISCORD_BOT_TOKEN)
      .then(() => {
        client?.once("ready", async () => {
          // Make sure we only run this block once, even if 'ready' is fired again
          if (!client || didRunReadyBlock) {
            if(didRunReadyBlock) {
              console.log('did run ready block');
            }
            return;
          }
          didRunReadyBlock = true;

          if (!client.user) {
            logger("Client is ready but user is unavailable.");
            return;
          }

          BOT_IS_LOGGED_IN.value = true;
          logger(
            `Logged in as ${client.user.tag}. Client ID: ${client.user.id}`
          );

          // Now do the old "once ready" logic: fetch guilds, store them in DB,
          // register slash commands, sync roles/members, etc.
          try {
            const guilds = await client.guilds.fetch();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const [guildId, partialGuild] of guilds) {
              const fullGuild: Guild = await client.guilds.fetch(guildId);
              logger(`Initializing guild: ${fullGuild.name} (${guildId})`);
              console.log("The bot read only mode", BOT_READONLY_MODE);
              if (!BOT_READONLY_MODE) {

              // Store guild in DB
              await storeGuild(fullGuild.id, fullGuild.name);

              // Sync roles
              await syncRoles(fullGuild);
              // Sync members
              await syncMembers(fullGuild);

              // Register slash commands
              await registerSlashCommands(client.user.id, fullGuild);
              }

              logger(`Guild initialization complete: ${fullGuild.name}`);
            }

            logger("Bot is fully ready!");
          } catch (err) {
            logger(`Error in client "ready" block: ${String(err)}`);
            console.error(err);
          }
        });
      })
      .catch((err) => {
        logger(`Error logging in Discord client: ${String(err)}`);
        throw err;
      });
  }

  return client;
}

/**
 * Destroy the existing client, so the next call to getClient() re-initializes it.
 * Useful if you want an admin to "restart" the bot without restarting the server process.
 */
export async function restartDiscordClient(): Promise<void> {
  if (client) {
    try {
      await client.destroy();
    } catch (err) {
      console.error("Error destroying Discord client:", err);
    }
  }
  client = null;
  isLoggingIn = false;
  didRunReadyBlock = false;
  BOT_IS_LOGGED_IN.value = false;
  logger("Discord client restarted: next getClient() call will re-initialize.");
}
