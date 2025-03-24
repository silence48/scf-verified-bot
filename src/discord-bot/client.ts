// src/discord-bot/client.ts

import { Client, GatewayIntentBits, Guild, ClientOptions } from "discord.js";
import { logger } from "./logger";
import { handleMessageCreateEvent } from "./messages";
import { handleInteractionCreateEvent } from "./interactions";
//import { syncRoles, syncMembers } from "./roles";
import { registerSlashCommands } from "./commands";
//import { upsertGuild } from "./mongo-db";
import { DISCORD_BOT_TOKEN, BOT_IS_LOGGED_IN, BOT_READONLY_MODE } from "./constants";
export interface BaseUser {
  _id: string; // Discord user ID
  username: string;
  discriminator: string;
  guildIds: string[];
  discordProfile: any;
  user: any;
  createdAt: Date;
  updatedAt: Date;
  stellarAccount: string;
}

// Ensure these global variables have initial values.
//if (globalThis.discordClient === undefined) globalThis.discordClient = null;
if (globalThis.isLoggingIn === undefined) globalThis.isLoggingIn = false;
if (globalThis.didRunReadyBlock === undefined) globalThis.didRunReadyBlock = false;
function waitForClientReady(client: Client): Promise<Client> {
  if (client.isReady()) {
    return Promise.resolve(client);
  }
  return new Promise((resolve) => {
    const readyHandler = () => {
      client.off("ready", readyHandler);
      resolve(client);
    };
    client.once("ready", readyHandler);
  });
}
/**
 * Returns the Discord client singleton. If it's not yet created/logged in,
 * this will:
 *   - Create it
 *   - Log in
 *   - On "ready", run sync roles, register slash commands, etc.
 */
export async function getClient(source?: string): Promise<Client> {
  if (globalThis.discordClient) {
    console.log("[] discord client exists");
    if (globalThis.didRunReadyBlock) {
      console.log("[] discord client is already ready and logged in returning it.");
      return globalThis.discordClient;
    }
    console.log("[] waiting for discord client to be ready");
    return await waitForClientReady(globalThis.discordClient);
  }
  /*
    if (globalThis.discordClient.isReady()) {
      console.log('[] discord client is ready');
      return globalThis.discordClient;
    } else {
      console.log('[] waiting for discord client to be ready');
      return new Promise((resolve) => {
        const readyHandler = () => {
          console.log('[discordbot] client is now ready');
          globalThis.discordClient?.off('ready', readyHandler);
          resolve(globalThis.discordClient as Client);
        };
        
        globalThis.discordClient?.once('ready', readyHandler);
      });
    }*/

  // Otherwise, create a new Client
  const options: ClientOptions = {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
  };
  globalThis.discordClient = new Client(options);
  console.log(`[getClient] discord client created by ${source}`);
  const client = globalThis.discordClient;
  if (!BOT_READONLY_MODE) {
    // Hook event handlers (messageCreate, interactionCreate)
    client.on("messageCreate", async (message) => {
      await handleMessageCreateEvent(message, client);
    });
    client.on("interactionCreate", async (interaction) => {
      await handleInteractionCreateEvent(interaction, client);
    });
  }

  // Initiate login on first getClient() call
  if (!isLoggingIn) {
    isLoggingIn = true;
    console.log("[discordbot/client] is logging in");
    client
      .login(DISCORD_BOT_TOKEN)
      .then(() => {
        client?.once("ready", async () => {
          // Make sure we only run this block once, even if 'ready' is fired again
          if (!client || didRunReadyBlock) {
            if (didRunReadyBlock) {
              console.log("did run ready block");
            }
            return;
          }
          didRunReadyBlock = true;

          if (!client.user) {
            logger("Client is ready but user is unavailable.", client);
            return;
          }

          BOT_IS_LOGGED_IN.value = true;
          logger(`Logged in as ${client.user.tag}. Client ID: ${client.user.id}`, client);

          // Now do the old "once ready" logic: fetch guilds, store them in DB,
          // register slash commands, sync roles/members, etc.
          try {
            const guilds = await client.guilds.fetch();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const [guildId, partialGuild] of guilds) {
              const fullGuild: Guild = await client.guilds.fetch(guildId);
              logger(`Initializing guild: ${fullGuild.name} (${guildId})`, client);
              console.log("The bot read only mode", BOT_READONLY_MODE);
              if (!BOT_READONLY_MODE) {
                // Store guild in DB
                //await upsertGuild(fullGuild.id, fullGuild.name);

                // Sync roles
                //await syncRoles(fullGuild);
                // Sync members
                //await syncMembers(fullGuild);

                // Register slash commands
                await registerSlashCommands(client.user.id, fullGuild, client);
              }

              logger(`Guild initialization complete: ${fullGuild.name}`, client);
            }

            logger("Bot is fully ready!", client);
          } catch (err) {
            logger(`Error in client "ready" block: ${String(err)}`, client);
            console.error(err);
          }
        });
      })
      .catch((err) => {
        logger(`Error logging in Discord client: ${String(err)}`, client);
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
  if (globalThis.discordClient) {
    try {
      logger("Discord client restarted: next getClient() call will re-initialize.", globalThis.discordClient);
      await globalThis.discordClient.destroy();
    } catch (err) {
      console.error("Error destroying Discord client:", err);
    }
  }

  globalThis.discordClient = null;
  isLoggingIn = false;
  didRunReadyBlock = false;
  BOT_IS_LOGGED_IN.value = false;
  const client = await getClient("restartDiscordClient");
  logger("discord bot restarted and re-initialized", client);
  return;
}
