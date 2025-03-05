// app/api/discord/grantRole/route.ts
import { NextResponse } from "next/server";
import type { Guild } from "discord.js";
import { getClient } from "@/discord-bot/client"; 
import { grantRoleWithChecks } from "@/discord-bot/roles";

export async function POST(request: Request) {
  try {
    const { guildId, userId, roleName, auth } = await request.json();

    // Basic checks
    if (!guildId || !userId || !roleName || !auth) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (auth !== process.env.BOT_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure the bot is started
    const client = await getClient();

    // Attempt to get the guild from cache or fetch
    let guild: Guild | undefined = client.guilds.cache.get(guildId);
    if (!guild) {
      try {
        guild = await client.guilds.fetch(guildId);
      } catch {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
      }
    }

    const result = await grantRoleWithChecks(guild, userId, roleName);
    if (!result.success) {
      const status = result.statusCode || 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      message: `Role: ${
        result.finalRoleName || roleName
      } granted successfully.`,
    });
  } catch (err) {
    console.error("Error in POST /api/discord/grantRole:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
