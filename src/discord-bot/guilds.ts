import { getClient } from "@/discord-bot/client";
export async function getGuilds() {
    'use server';
    console.log('in the getGuilds')
    const client = await getClient();
    client.guilds.cache.map( (guild) => {
        console.log(guild.toJSON());
        console.log(guild.name);
    })
    const guilds = client.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
    }));
    return guilds;
};