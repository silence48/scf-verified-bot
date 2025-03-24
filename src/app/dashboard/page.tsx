// src/app/dashboard/page.tsx
//'use server';
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

import DashboardClient from "./SelectGuild";
import { getGuilds } from "@/discord-bot/guilds";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  // Optional auth check
  const allowedAdminIds = [
    "248918075922055168", //silence
    "378384721660346378",
    "610091022051180544",
    "755851928461901936",
  ];
  if (!allowedAdminIds.includes(session.user.discordId)) {
    return <div style={{ padding: 40 }}>Unauthorized</div>;
  }

  // -- Node-only logic: call discord.js on the server
  const guilds = await getGuilds();

  // Pass this plain data to the client component
  return (
    <div style={{ padding: "2rem" }}>
      <h2>Dashboard</h2>
      <DashboardClient guilds={guilds} />
    </div>
  );
}
