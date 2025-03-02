// app/api/discord/grantRole/route.ts
import { NextResponse } from "next/server";
import { client } from "@/lib/Discord-Client";
import { getDb } from "@/lib/db";
import type { DiscordAPIError, Guild } from "discord.js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guildId, userId, roleName, auth } = body;

    // Basic checks
    if (!guildId || !userId || !roleName || !auth) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Simple authentication
    if (auth !== process.env.BOT_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // fetch the guild
    const guild: Guild | undefined = client.guilds.cache.get(guildId);
    if (!guild) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    // fetch the member
    let member;
    try {
      // Force a fetch if needed
      member = await guild.members.fetch(userId);
    } catch (error) {
      // If unknown member
      if ((error as DiscordAPIError).code === 10007) {
        return NextResponse.json({ error: "User not found in guild." }, { status: 404 });
      }
      // Otherwise re-throw
      throw error;
    }

    // If roleName is "SCF Guest" ...
    if (roleName === "SCF Guest") {
      return NextResponse.json({
        error: "User does not have a funded stellar account",
        role: "notfunded",
      }, { status: 406 });
    }

    // example logic from your code:
    const db = await getDb();
    const existingRoles = await db.all("SELECT role_id FROM user_roles WHERE user_id = ?", [userId]);
    console.log("Existing roles in DB for user:", existingRoles);

    // ... do your logic about project roles, check if user has a higher role, etc.
    // We'll just do a minimal example:
    const success = await updateUserRole(guild, userId, roleName);
    if (!success) {
      return NextResponse.json({ error: "Failed to grant role" }, { status: 500 });
    }

    return NextResponse.json({ message: `Role: ${roleName} granted successfully.` });
  } catch (err) {
    console.error("Error in POST /api/discord/grantRole:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Example extracted from your code. Adjust as needed. */
async function updateUserRole(guild: Guild, userId: string, roleName: string): Promise<boolean> {
  try {
    const member = await guild.members.fetch(userId);
    // find the role by name
    const role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
      console.log(`Role ${roleName} not found in guild.`);
      return false;
    }
    await member.roles.add(role.id, `Assigned via /api/discord/grantRole`);
    return true;
  } catch (err) {
    console.error("Error updateUserRole:", err);
    return false;
  }
}
