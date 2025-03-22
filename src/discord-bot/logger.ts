//'use server';
//import { type User } from "discord.js";
//import { getClient } from "./client";
import { Client } from "discord.js";
import { BOT_IS_LOGGED_IN, ADMIN_USER_ID } from "./constants";

/**
 * Splits a string into chunks for Discord messages
 */
export async function splitIntoChunks(text: string, chunkSize: number): Promise<string[]> {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
/**
 * Logs a message. If the bot is logged in, try DMing the admin user; otherwise logs to console.
 */
export async function logger(message: string, client: Client): Promise<void> {
  const chunkSize = 1999;
  const chunks = await splitIntoChunks(message, chunkSize);

  if (BOT_IS_LOGGED_IN.value) {
    //const dc = await import("./client");
    //const { getClient } = dc;
    //const client =await getClient(`logger: ${message}`);
    try {
      const adminUser = await client.users.fetch(ADMIN_USER_ID);
      for (const c of chunks) {
        await adminUser.send(c);
      }
      console.log("ADMIN LOG:", message);
      return;
    } catch (err) {
      console.error("Error sending admin DM:", err);
    }
  }
  console.log("ADMIN LOG:", message);
}


/**
 * Sends a DM to userId if the bot is logged in
 */
export async function sendDM(message: string, userId: string): Promise<void> {
    const chunkSize = 1999;
    const chunks = await splitIntoChunks(message, chunkSize);
  
    if (!BOT_IS_LOGGED_IN.value) {
      console.log(
        `Attempted to DM ${userId}, but bot not logged in. Message: ${message}`
      );
      return;
    }
    try {
        const dc = await import("./client");
        const { getClient } = dc;
        const client =await getClient(`sendDm ${message} ${userId}`);      const user = await client.users.fetch(userId);
      for (const c of chunks) {
        await user.send(c);
      }
      await logger(`Sent DM to user ${userId}: ${message}`, client);
    } catch (err) {
      console.error("Error sending DM:", err);
    }
  }