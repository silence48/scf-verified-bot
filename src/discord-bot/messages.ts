// src/discord-bot/messages.ts
//'use server';
import { Client, Message } from "discord.js";
import { logger } from "./logger";
import { getExactGuildMemberUsernames } from "@/discord-bot/mongo-db";

/**
 * Primary message handler for the "messageCreate" event.
 */
export async function handleMessageCreateEvent(
  message: Message,
  client: Client
): Promise<void> {
  try {
    // Ignore non-text messages or empty content
    if (!message.content.trim()) return;

    console.log(`Processing message: ${message.content}`);

    if (message.content.startsWith("!ping")) {
      if ('send' in message.channel) {
        await message.channel.send({ content: "Pong!" });
      }
    }

    if (message.content === "!listmembers") {
      if (message.guild) {
        // use DB helper to get exact matches by guild_id
        const usernames = await getExactGuildMemberUsernames(message.guild.id);
        const memberList = usernames.join(", ");
        if ('send' in message.channel) {
          await message.channel.send({ content: `Members: ${memberList}` });
        }
      } else {
        console.error("Message does not belong to a guild.");
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      logger(`Error in handleMessageCreateEvent: ${err.message}`, client);
      console.error(err);
    } else {
      console.error("Unknown error in handleMessageCreateEvent:", err);
    }
  }
}
