// src/app/dashboard/SelectGuildActions.ts
"use server";

import { auth } from "@/lib/auth";
import { client } from "@/lib/Discord-Client";

interface DetailedGuild {
  id: string;
  name: string;
  members: { id: string; name: string }[];
}
export async function handleFormSubmit(formData: FormData) {
  const guildId = formData.get("guildId") as string;
  const details = await fetchGuildDetailsAction(guildId);
  return { guild: details };
}
export async function fetchGuildDetailsAction(
  guildId: string
): Promise<DetailedGuild | null> {
  // Double-check user is logged in (optional):
  const session = await auth();
  if (!session) {
    throw new Error("Not authenticated");
  }
  // Optional: check if session.user.id in allowedAdminIds.

  if (!guildId) return null;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return null;

  await guild.members.fetch();
  const members = guild.members.cache.map((m) => ({
    id: m.id,
    name: m.user.username,
  }));

  return {
    id: guild.id,
    name: guild.name,
    members,
  };
}
