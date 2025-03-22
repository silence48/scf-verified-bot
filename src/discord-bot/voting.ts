// src/discord-bot/voting.ts
//'use server';
import {
  ChatInputCommandInteraction,
  CommandInteraction,
  ThreadChannel,
  ButtonInteraction,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  Client,
} from "discord.js";
import {
  insertVote,
  getThreadVotes,
  getVotingThreadCreatedAt,
  markVotingThreadClosed,
  incrementThreadVoteCount,
  insertNewVotingThread,
  getOpenVotingThreads,
  getThreadVoteCount,
} from "./mongo-db";
import { logger } from "./logger";
import { updateUserRole } from "./roles";
import { BOT_READONLY_MODE } from "./constants";

export const voteCounts: Map<string, Map<string, boolean>> = new Map();


/** Check if user can vote for the specified roleName. */
export async function validateVoterRole(
  interaction: ButtonInteraction,
  roleName: string
): Promise<boolean> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Voting is only permitted in a server thread.",
      ephemeral: true,
    });
    return false;
  }
  const voter = await interaction.guild.members.fetch(interaction.user.id);

  // For "SCF Navigator", allowed = ["SCF Navigator","SCF Pilot"]; for "SCF Pilot", allowed = ["SCF Pilot"]
  let allowed = ["SCF Pilot"];
  if (roleName === "SCF Navigator") {
    allowed = ["SCF Navigator", "SCF Pilot"];
  }
  const canVote = voter.roles.cache.some((r) => allowed.includes(r.name));
  if (!canVote) {
    await interaction.reply({
      content: "You do not have permission to vote for this role.",
      ephemeral: true,
    });
    return false;
  }
  return true;
}

/** Record a user's "yes" vote in the DB, update local map, check if threshold is met. */
export async function recordVote(
  interaction: ButtonInteraction,
  nomineeId: string,
  roleName: string,
  client: Client
): Promise<boolean> {
  if (!interaction.channel || !(interaction.channel instanceof ThreadChannel)) {
    await interaction.reply({
      content: "Voting is only permitted in a thread channel.",
      ephemeral: true,
    });
    return false;
  }
  const threadId = interaction.channel.id;
  const userId = interaction.user.id;

  // If we haven't loaded votes for this thread, load from DB
  if (!voteCounts.has(threadId)) {
    const existingVoters = await getThreadVotes(threadId);
    voteCounts.set(threadId, new Map(existingVoters.map((v) => [v, true])));
  }
  const threadVotes = voteCounts.get(threadId)!;

  if (threadVotes.has(userId)) {
    await interaction.reply({
      content: "You already voted in this thread.",
      ephemeral: true,
    });
    return false;
  }

  // Insert new vote record
  await insertVote(threadId, userId);
  threadVotes.set(userId, true);

  // Update the count, possibly assign the role
  const newCount = threadVotes.size;
  await updateVoteCountAndCheckRoleAssignment(
    interaction,
    threadId,
    nomineeId,
    roleName,
    newCount,
    client
  );
  return true;
}

/** If the thread is older than 5 days, close it; else check if enough votes exist. */
export async function updateVoteCountAndCheckRoleAssignment(
  interaction: ButtonInteraction,
  threadId: string,
  nomineeId: string,
  roleName: string,
  currentVoteCount: number,
  client: Client
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Voting is only permitted within a server.",
      ephemeral: true,
    });
    return;
  }
  const creationTime = await getVotingThreadCreatedAt(threadId);
  if (!creationTime) {
    await interaction.reply({
      content: "This thread is not tracked in the DB.",
      ephemeral: true,
    });
    return;
  }
  const dayInMs = 24 * 60 * 60 * 1000;
  if (Date.now() - creationTime.getTime() > 5 * dayInMs) {
    // Expired
    if (interaction.channel instanceof ThreadChannel) {
      await updateThreadVoteCount(interaction.channel, currentVoteCount, client);
      await interaction.channel.setLocked(true);
      await interaction.channel.setArchived(true);
    }
    await markVotingThreadClosed(threadId);
    await interaction.reply({
      content:
        "This voting thread has expired (5 days). The user must wait and try again.",
      ephemeral: false,
    });
    return;
  }

  // Not expired => increment DB vote_count
  await incrementThreadVoteCount(threadId);

  // Update thread name
  if (interaction.channel instanceof ThreadChannel) {
    await updateThreadVoteCount(interaction.channel, currentVoteCount, client);
  }

  // Check vote thresholds
  const neededNav = 10;
  const neededPilot = 7;
  const needed = roleName === "SCF Navigator" ? neededNav : neededPilot;
  if (currentVoteCount < needed) {
    await interaction.reply({
      content: `Vote recorded. Not enough votes yet (${currentVoteCount}/${needed}).`,
      ephemeral: false,
    });
    return;
  }

  // Enough votes => try to assign role
  const roleAssigned =  BOT_READONLY_MODE ? false : await updateUserRole(
    interaction.guild,
    nomineeId,
    roleName,
    client
  );
  if (roleAssigned) {
    await interaction.reply({
      content: `Vote complete! The role ${roleName} has been assigned.`,
      ephemeral: false,
    });
    if (interaction.channel instanceof ThreadChannel) {
      await interaction.channel.setLocked(true);
      await interaction.channel.setArchived(true);
    }
    await markVotingThreadClosed(threadId);
  } else {
    await interaction.reply({
      content: "ERROR: Unable to assign role, contact admin.",
      ephemeral: false,
    });
  }
}

/** Updates a thread's name to show the vote count. */
export async function updateThreadVoteCount(
  thread: ThreadChannel,
  currentVoteCount: number,
  client: Client
): Promise<void> {
  try {
    if (!thread.name) {
      logger("Thread has no name set", client);
      return;
    }
    const baseName = thread.name.split("[")[0].trim();
    await thread.edit({ name: `${baseName} [Votes: ${currentVoteCount}]` });
  } catch (err) {
    if (err instanceof Error) {
      logger(`Error in updateThreadVoteCount: ${err.message}`, client);
    }
    console.error(err);
  }
}

/** Creates a new thread for /nominate, inserts it in DB, etc. */
export async function createVotingThread(
  interaction: CommandInteraction,
  nominee: GuildMember,
  nominator: GuildMember,
  roleName: string,
  client: Client
): Promise<ThreadChannel | null> {
  try {
    if (!(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        content: "You can only create a voting thread within a text channel.",
        ephemeral: true,
      });
      return null;
    }
    const thread = await interaction.channel.threads.create({
      name: `Nomination: ${nominee.user.username} for ${roleName}`,
      autoArchiveDuration: 60,
      reason: `Nomination for ${nominee.user.username} => ${roleName}`,
    });

    const voteButton = new ButtonBuilder()
      .setCustomId(`vote-yes:${nominee.id}:${roleName}`)
      .setLabel("Vote Yes")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(voteButton);
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`Nomination for ${nominee.user.username}`)
      .setDescription(
        `Cast your vote for ${nominee.displayName} to become a ${roleName}.`
      )
      .setTimestamp();

    await thread.send({
      content: `**Please Vote!** <@${nominator.id}> nominated <@${nominee.id}> for ${roleName}.`,
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: `A voting thread has been created: <#${thread.id}>`,
      ephemeral: true,
    });

    await insertNewVotingThread(thread.id, nominator.id, nominee.id, roleName);
    return thread;
  } catch (err) {
    logger(`Error in createVotingThread: ${String(err)}`, client);
    console.error(err);
    return null;
  }
}

/** The /nominate slash command handler. */
export async function processNominateCommand(
  interaction: ChatInputCommandInteraction,
  client: Client
): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({
        content: "Use this command in a server only.",
        ephemeral: true,
      });
      return;
    }
    if (!(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        content: "Nominate must be used in a text channel.",
        ephemeral: true,
      });
      return;
    }

    const nominator = interaction.member as GuildMember;
    const nominee = interaction.options.getMember("user");
    if (!nominee || !(nominee instanceof GuildMember)) {
      await interaction.reply({
        content: "Could not find the user to nominate.",
        ephemeral: true,
      });
      return;
    }
    if (nominator.id === nominee.id) {
      logger(`${nominator.id} tried to nominate themselves.`, client);
      await interaction.reply({
        content: "You cannot nominate yourself.",
        ephemeral: true,
      });
      return;
    }

    // Determine next role for the nominee
    const role = determineNomineeRole(nominee);
    if (!role) {
      await interaction.reply({
        content: `User ${nominee.user.tag} does not have a valid SCF role to be promoted from.`,
        ephemeral: true,
      });
      return;
    }

    // If nominee already has the target role
    if (nominee.roles.cache.some((r) => r.name === role)) {
      await interaction.reply({
        content: `User ${nominee.user.tag} already has ${role}.`,
        ephemeral: true,
      });
      return;
    }

    // If the nominator doesn't have permission to nominate for that role
    if (!canNominatorAssignRole(nominator, role)) {
      await interaction.reply({
        content: `You do not have permission to nominate for ${role}.`,
        ephemeral: true,
      });
      return;
    }

    await createVotingThread(interaction, nominee, nominator, role, client);
  } catch (err) {
    logger(`Error in processNominateCommand: ${String(err)}`, client);
    console.error(err);
  }
}

function determineNomineeRole(nominee: GuildMember): string | null {
  const hasPathfinder = nominee.roles.cache.some(
    (r) => r.name === "SCF Pathfinder"
  );
  const hasNavigator = nominee.roles.cache.some(
    (r) => r.name === "SCF Navigator"
  );
  if (hasPathfinder) return "SCF Navigator";
  if (hasNavigator) return "SCF Pilot";
  return null;
}

function canNominatorAssignRole(nominator: GuildMember, role: string): boolean {
  // SCF Navigator => require SCF Navigator or SCF Pilot
  // SCF Pilot => require SCF Pilot
  if (role === "SCF Navigator") {
    return nominator.roles.cache.some(
      (r) => r.name === "SCF Navigator" || r.name === "SCF Pilot"
    );
  }
  if (role === "SCF Pilot") {
    return nominator.roles.cache.some((r) => r.name === "SCF Pilot");
  }
  return false;
}

/** The /updatevote slash command to refresh the displayed vote count in the thread. */
export async function processUpdateVoteCommand(
  interaction: CommandInteraction,
  client: Client
) {
  try {
    if (!interaction.channel || !interaction.channel.isThread()) {
      await interaction.reply({
        content: "Must be used in a voting thread.",
        ephemeral: true,
      });
      return;
    }
    const threadId = interaction.channel.id;
    const currentCount = await getThreadVoteCount(threadId);
    if (currentCount == null) {
      await interaction.reply({
        content: "This thread is not tracked in the DB.",
        ephemeral: true,
      });
      return;
    }
    if (interaction.channel instanceof ThreadChannel) {
      await updateThreadVoteCount(interaction.channel, currentCount, client);
    }
    await interaction.reply({
      content: `Vote count updated to ${currentCount}.`,
      ephemeral: true,
    });
  } catch (err) {
    logger(`Error in processUpdateVoteCommand: ${String(err)}`, client);
    console.error(err);
  }
}

/** The /listactivevotes slash command: list "OPEN" threads from DB that are also still active in Discord. */
export async function processListActiveVotesCommand(
  interaction: CommandInteraction,
  client: Client
): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const allActiveVotes = await getOpenVotingThreads();
    // Filter to only threads that are truly still active in Discord
    const active = await interaction.guild.channels.fetchActiveThreads();
    const activeThreadIds = new Set(active.threads.map((t) => t.id));
    const filtered = allActiveVotes.filter((v) =>
      activeThreadIds.has(v.thread_id)
    );

    if (!filtered.length) {
      await interaction.reply({
        content: "No active votes found.",
        ephemeral: true,
      });
      return;
    }

    // Separate by role_name
    const navVotes = filtered.filter((v) => v.role_name === "SCF Navigator");
    const pilotVotes = filtered.filter((v) => v.role_name === "SCF Pilot");

    await interaction.reply({
      content: "Processing active votes...",
      ephemeral: true,
    });

    const sendEmbeds = async (title: string, votes: typeof filtered) => {
      const { EmbedBuilder } = await import("discord.js");
      let embed = new EmbedBuilder().setTitle(title).setColor(0x0099ff);
      let fieldCount = 0;

      for (const vote of votes) {
        const threadLink = `https://discord.com/channels/${interaction.guild?.id}/${vote.thread_id}`;
        const fieldValue = [
          `Date: ${vote.created_at.split(" ")[0]}`,
          `Nominee: <@${vote.nominee_id}>`,
          `Nominator: <@${vote.nominator_id}>`,
          `Votes: ${vote.vote_count}`,
          `Link: [Vote Here](${threadLink})`,
        ].join("\n");

        if (fieldCount >= 25) {
          await interaction.followUp({ embeds: [embed], ephemeral: false });
          embed = new EmbedBuilder()
            .setTitle(`${title} (cont.)`)
            .setColor(0x0099ff);
          fieldCount = 0;
        }

        embed.addFields({
          name: "Nomination",
          value: fieldValue,
          inline: true,
        });
        fieldCount++;
      }

      if (fieldCount > 0) {
        await interaction.followUp({ embeds: [embed], ephemeral: false });
      }
    };

    if (navVotes.length) {
      await sendEmbeds("Navigator Nominations", navVotes);
    }
    if (pilotVotes.length) {
      await sendEmbeds("Pilot Nominations", pilotVotes);
    }
  } catch (err) {
    logger(`Error in processListActiveVotesCommand: ${String(err)}`, client);
    console.error(err);
  }
}
