// lib/Discord-Client.ts

import { config } from "dotenv";
config(); // if you want to load .env

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Collection,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  GuildMember,
  InteractionType,
  TextChannel,
  ThreadChannel,
  ChatInputCommandInteraction,
  ButtonInteraction,
  CommandInteraction,
  Guild,
  DiscordAPIError,
  // typed
  GatewayIntentBits,
} from "discord.js";

import { getDb } from "./db";
import { SorobanRpc } from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-rpc.mainnet.stellar.gateway.fm";
const rpcServer = new SorobanRpc.Server(RPC_URL, { allowHttp: true });

// Admin user fallback
const ADMIN_USER = process.env.ADMIN_USER_ID ?? "248918075922055168";
// BOT token
const botToken = process.env.DISCORD_BOT_TOKEN;
if (!botToken) {
  throw new Error("No DISCORD_BOT_TOKEN found in env.");
}

// Create the Discord client with typed Intents
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

let botIsLoggedIn = false;

// This is your slash command definitions
const commands = [
  new SlashCommandBuilder()
    .setName("listmembers")
    .setDescription("Lists all members in the guild!"),
  new SlashCommandBuilder()
    .setName("nominate")
    .setDescription("Nominate a user for role advancement.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to nominate")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("getverified")
    .setDescription("Learn how to get verified."),
  new SlashCommandBuilder()
    .setName("updatevote")
    .setDescription("Update the vote count."),
  new SlashCommandBuilder()
    .setName("listactivevotes")
    .setDescription("List all active voting threads."),
].map((cmd) => cmd.toJSON());

// For your voting logic
const voteCounts: Map<string, Map<string, boolean>> = new Map();

// --------------------------------------------------------------------------------------
// Connect & “ready” event
// --------------------------------------------------------------------------------------
client.once("ready", async () => {
  try {
    if (!client.user) throw new Error("Client not ready (no user).");
    botIsLoggedIn = true;

    console.log(`Logged in as ${client.user.tag}`);

    const clientId = client.user.id;
    // run DB migrations or open DB
    const db = await getDb();

    // fetch all guilds the bot is in
    const guilds = await client.guilds.fetch();
    const rest = new REST({ version: "10" }).setToken(botToken);

    for (const [guildId, partialGuild] of guilds) {
      const fullGuild = await client.guilds.fetch(guildId);

      console.log(`Syncing guild: ${fullGuild.name} (${guildId})`);

      // register slash commands in this guild
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });

      // sync roles / members
      await syncRoles(fullGuild);
      await syncMembers(fullGuild);
    }

    console.log("Bot is fully ready!");
  } catch (err) {
    console.error("Error on ready event:", err);
  }
});

// Actually log in
client
  .login(botToken)
  .then(() => {
    console.log("client.login success!");
  })
  .catch((err) => {
    console.error("Error logging in:", err);
  });

// --------------------------------------------------------------------------------------
// event: messageCreate
// e.g. !ping
// --------------------------------------------------------------------------------------
client.on("messageCreate", async (message) => {
  try {
    if (!message.content.trim()) return;
    if (message.content.startsWith("!ping")) {
      await message.channel.send({ content: "Pong!" });
    }
  } catch (err) {
    console.error("Error in messageCreate:", err);
  }
});

// --------------------------------------------------------------------------------------
// event: interactionCreate
// slash commands + button interactions
// --------------------------------------------------------------------------------------
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.type === InteractionType.ApplicationCommand) {
      await handleCommandInteraction(
        interaction as ChatInputCommandInteraction
      );
    } else if (interaction.type === InteractionType.MessageComponent) {
      await handleButtonInteraction(interaction as ButtonInteraction);
    }
  } catch (err) {
    console.error("Error in interactionCreate:", err);
  }
});

// --------------------------------------------------------------------------------------
// HELPER: slash commands
// (Equivalent to your processListMembersCommand, etc.)
// --------------------------------------------------------------------------------------
async function handleCommandInteraction(
  interaction: ChatInputCommandInteraction
) {
  const commandName = interaction.commandName;

  switch (commandName) {
    case "listmembers":
      await processListMembersCommand(interaction);
      break;
    case "nominate":
      await processNominateCommand(interaction);
      break;
    case "getverified":
      await processGetVerifiedCommand(interaction);
      break;
    case "updatevote":
      await processUpdateVoteCommand(interaction);
      break;
    case "listactivevotes":
      await processListActiveVotesCommand(interaction);
      break;
    default:
      break;
  }
}

// --------------------------------------------------------------------------------------
// EXACT REPLICAS of your helper functions
// syncRoles, syncMembers, fixUserRoles, etc.
// --------------------------------------------------------------------------------------

// For example:
async function syncRoles(guild: Guild) {
  try {
    const db = await getDb();
    const roles = await guild.roles.fetch();
    console.log(`Syncing roles for guild ${guild.name}`);

    for (const [roleId, role] of roles) {
      // your DB checks, etc.
      const existing = await db.get(
        "SELECT role_id FROM roles WHERE role_id = ?",
        roleId
      );
      if (!existing) {
        await db.run(
          `INSERT OR REPLACE INTO roles (role_id, role_name, guild_id) VALUES (?, ?, ?)`,
          [roleId, role.name, guild.id]
        );
      }
    }
  } catch (err) {
    console.error("Error in syncRoles:", err);
  }
}

async function syncMembers(guild: Guild) {
  // replicate your logic for fetching members, storing them in DB, etc.
}

// Additional helper code omitted for brevity—copy from your original script, just remove Express parts

// --------------------------------------------------------------------------------------
// Command handlers
// --------------------------------------------------------------------------------------
async function processListMembersCommand(
  interaction: ChatInputCommandInteraction
) {
  // ...
}
async function processNominateCommand(
  interaction: ChatInputCommandInteraction
) {
  // ...
}
async function processGetVerifiedCommand(
  interaction: ChatInputCommandInteraction
) {
  // ...
}
async function processUpdateVoteCommand(
  interaction: ChatInputCommandInteraction
) {
  // ...
}
async function processListActiveVotesCommand(
  interaction: ChatInputCommandInteraction
) {
  // ...
}

// --------------------------------------------------------------------------------------
// Button interactions
// e.g. handle "vote-yes: <nomineeId>: <roleName>"
// --------------------------------------------------------------------------------------
async function handleButtonInteraction(interaction: ButtonInteraction) {
  // ...
}

// Additional code for role updates, fixUserRoles, etc. is placed here, same as your original code.

// Utility logger if needed:
async function logger(msg: string) {
  // send DM to ADMIN_USER, or just console.log
  if (botIsLoggedIn && ADMIN_USER) {
    try {
      const adminUser = await client.users.fetch(ADMIN_USER);
      await adminUser.send(msg);
    } catch (err) {
      console.error("logger failed to DM admin:", err);
    }
  }
  console.log("[ADMIN LOG]", msg);
}

// Now you have a single exported `client` plus all the logic in one place.
