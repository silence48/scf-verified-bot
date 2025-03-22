// src/discord-bot/interactions.ts
//'use server';
import {
  Interaction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  InteractionType,
  Client,
} from "discord.js";
import { logger } from "./logger";
import {
  processListMembersCommand,
  processGetVerifiedCommand,
} from "./commands";
import {
  processNominateCommand,
  processUpdateVoteCommand,
  processListActiveVotesCommand,
  validateVoterRole,
  recordVote,
} from "./voting";
import { BOT_READONLY_MODE } from "./constants";

/**
 * The main 'interactionCreate' event handler, called in client.ts.
 * If BOT_READONLY_MODE is true, we skip all slash command & button handling.
 */
export async function handleInteractionCreateEvent(interaction: Interaction, client: Client) {
  try {
    // 1) Check read-only mode up front
    if (BOT_READONLY_MODE) {
      logger("Bot is in read-only mode: ignoring slash commands and interactions.", client);
      return;
    }

    // 2) If not read-only, handle normally
    if (interaction.type === InteractionType.ApplicationCommand) {
      await handleSlashCommand(interaction as ChatInputCommandInteraction, client);
    } else if (interaction.type === InteractionType.MessageComponent) {
      await handleButtonInteraction(interaction as ButtonInteraction, client);
    }
  } catch (err) {
    if (err instanceof Error) {
      logger(`Error in handleInteractionCreateEvent: ${err.message}`, client);
      console.error(err);
    } else {
      console.error("Unknown error in handleInteractionCreateEvent:", err);
    }
  }
}

async function handleSlashCommand(interaction: ChatInputCommandInteraction, client: Client) {
  const { commandName } = interaction;
  switch (commandName) {
    case "listmembers":
      await processListMembersCommand(interaction, client);
      break;
    case "nominate":
      await processNominateCommand(interaction, client);
      break;
    case "getverified":
      await processGetVerifiedCommand(interaction, client);
      break;
    case "updatevote":
      await processUpdateVoteCommand(interaction, client);
      break;
    case "listactivevotes":
      await processListActiveVotesCommand(interaction, client);
      break;
    default:
      await interaction.reply({
        content: "Unrecognized command.",
        ephemeral: true,
      });
  }
}

async function handleButtonInteraction(interaction: ButtonInteraction, client: Client) {
  // e.g., "vote-yes:123456789:SCF Navigator"
  const [action, nomineeId, roleName] = interaction.customId.split(":");
  if (action !== "vote-yes") return;

  if (!(await validateVoterRole(interaction, roleName))) return;
  await recordVote(interaction, nomineeId, roleName, client);
}
