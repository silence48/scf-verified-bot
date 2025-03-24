// app/api/guilds/route.ts
import { NextResponse } from "next/server";
import { getClient } from "@/discord-bot/client";
// ^ If your `bot.ts` is at project root, or "lib/bot.ts", adapt the path

export async function GET() {
  try {
    // The client should be connected & have a cache
    console.log(`[guilds] getting the discord client instance`);
    const client = await getClient();
    const guilds = client.guilds.cache.map((g) => ({
      id: g.id,
      name: g.name,
    }));
    return NextResponse.json({ guilds });
  } catch (err) {
    console.error("Error in GET /api/guilds:", err);
    return NextResponse.json({ error: "Failed to list guilds" }, { status: 500 });
  }
}
