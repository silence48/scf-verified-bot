// app/api/discord/guilds/[guildId]/route.ts
import { NextResponse } from "next/server";
import { client } from "@/lib/Discord-Client";

interface Params {
  guildId: string;
}

export async function GET(_req: Request, { params }: { params: Params }) {
  try {
    const guild = client.guilds.cache.get(params.guildId);
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
