import { getClient } from "@/discord-bot/client";
export async function getGuilds() {
  "use server";
  console.log("[getGuilds] getting the discord client instance");
  const client = await getClient();

  client.guilds.cache.map((guild) => {
    console.log(guild.toJSON());
    console.log(guild.name);
  });
  const guilds = client.guilds.cache.map((guild) => ({
    id: guild.id,
    name: guild.name,
  }));
  return guilds;
}
