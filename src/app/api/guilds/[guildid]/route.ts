// app/api/discord/guilds/[guildId]/route.ts
import { NextResponse } from "next/server";
import { getClient } from "@/discord-bot/client";

export async function GET(_req: Request, { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    console.log("[guild/guilidid] getting the discord client instance");
    const client = await getClient();
    
    const { guildId }= await params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }
    // fetch fresh members if desired
    await guild.members.fetch();

    const members = guild.members.cache.map((m) => ({
      id: m.id,
      name: m.user.username, 
    }));

    return NextResponse.json({
      id: guild.id,
      name: guild.name,
      members,
    });
  } catch (err) {
    console.error("Error fetching guild:", err);
    return NextResponse.json(
      { error: "Failed to fetch guild" },
      { status: 500 }
    );
  }
}
