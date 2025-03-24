// src/discord-bot/commands.ts
//'use server';
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import type { Guild, ChatInputCommandInteraction, Client } from "discord.js";
import { logger } from "./logger";
import { getGuildMemberUsernames } from "./mongo-db";
import { DISCORD_BOT_TOKEN } from "./constants";

/** The slash commands to register (applicationGuildCommands). */
export async function getSlashCommands() {
  return [
    new SlashCommandBuilder().setName("listmembers").setDescription("Lists all members in the guild!"),
    new SlashCommandBuilder()
      .setName("nominate")
      .setDescription("Nominate a user for role advancement.")
      .addUserOption((option) => option.setName("user").setDescription("The user to nominate").setRequired(true)),
    new SlashCommandBuilder().setName("getverified").setDescription("Learn how to get verified."),
    new SlashCommandBuilder().setName("updatevote").setDescription("Update the vote count in the current voting thread."),
    new SlashCommandBuilder().setName("listactivevotes").setDescription("Lists all active voting threads."),
  ].map((cmd) => cmd.toJSON());
}

/**
 * Registers slash commands for a specific guild using the Discord REST API.
 */
export async function registerSlashCommands(clientId: string, guild: Guild, client: Client): Promise<void> {
  if (!DISCORD_BOT_TOKEN) {
    logger("No bot token available; cannot register slash commands.", client);
    return;
  }
  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);
  try {
    logger(`Registering (/) commands for guild: ${guild.name}`, client);
    await rest.put(Routes.applicationGuildCommands(clientId, guild.id), {
      body: await getSlashCommands(),
    });
    logger("Successfully registered slash commands.", client);
  } catch (error) {
    logger(`Error registering slash commands: ${String(error)}`, client);
    console.error(error);
  }
}

/** The "getverified" slash command: provide a link button. */
export async function processGetVerifiedCommand(interaction: ChatInputCommandInteraction, client: Client) {
  try {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import("discord.js");
    const getVerifiedButton = new ButtonBuilder().setLabel("Get Verified").setStyle(ButtonStyle.Link).setURL("https://communityfund.stellar.org/tiers");

    const row = new ActionRowBuilder<typeof getVerifiedButton>().addComponents(getVerifiedButton);

    await interaction.reply({
      content: "Start your SCF journey by getting verified!",
      components: [row],
    });
  } catch (err) {
    if (err instanceof Error) {
      logger(`Error in processGetVerifiedCommand: ${err.message}`, client);
    }
    console.error(err);
  }
}

/** The "listmembers" slash command: fetch from DB, chunk results. */
export async function processListMembersCommand(interaction: ChatInputCommandInteraction, client: Client) {
  try {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const members = await getGuildMemberUsernames(interaction.guild.id);
    if (!members.length) {
      await interaction.reply({
        content: "No members found in DB.",
        ephemeral: true,
      });
      return;
    }

    const allNames: string[] = [];
    let currentChunk = "";
    for (let i = 0; i < members.length; i++) {
      const nextString = `${members[i]}${i < members.length - 1 ? ", " : ""}`;
      if (currentChunk.length + nextString.length > 1900) {
        allNames.push(currentChunk);
        currentChunk = nextString;
      } else {
        currentChunk += nextString;
      }
    }
    if (currentChunk) {
      allNames.push(currentChunk);
    }

    if (allNames.length > 1) {
      await interaction.reply({
        content: "Members list is large, sending in chunks...",
        ephemeral: true,
      });
      for (const chunk of allNames) {
        await interaction.followUp({ content: chunk, ephemeral: true });
      }
    } else {
      await interaction.reply({
        content: `Members: ${allNames[0]}`,
        ephemeral: true,
      });
    }
  } catch (err) {
    if (err instanceof Error) {
      logger(`Error in processListMembersCommand: ${err.message}`, client);
    }
    console.error(err);
  }
}
