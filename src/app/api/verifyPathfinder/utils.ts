import { GUILD_ID } from "@/discord-bot/constants";
import { getMongoDatabase } from "@/discord-bot/mongo-db";
import { PrecomputedBadge } from "@/types/discord-bot";
import { TierRole } from "@/types/roles";
import { Client, Guild, GuildMember } from "discord.js";
import { Db } from "mongodb";

export async function extractRoleName(message: string): Promise<string> {
    const regex = /Role:?\s+(.*?)\s+granted successfully/i;
    const match = message.match(regex);
    return match ? match[1].trim() : "unknown-role";
  }

export async function assignRole(member: GuildMember, role: TierRole, client: Client) {
        const guild = await client.guilds.fetch(GUILD_ID);
        
}

export async function getMember(client: Client, discordId: string):Promise<{guild:Guild, member: GuildMember }>{
        let guild;
        try {
          guild = await client.guilds.fetch(GUILD_ID);
        } catch(error: unknown) {
          console.error("Guild not found for ID", GUILD_ID);
          throw new Error(`unable to get guild: ${error}`);
        }
    
        let member;
        try {
          member = await guild.members.fetch(discordId);
        } catch (error: unknown) {
          throw new Error(`unable to get member, they are not in the discord server most likely. ${discordId}, ${error}`);
        }
        return {guild: guild, member: member};
}

export async function getBadgesForKeys(publicKeys: string[], db: Db ) : Promise<PrecomputedBadge[]> {
  if (publicKeys.length > 0) {
    const allBadges = await db.collection<PrecomputedBadge>("precomputedBadges")
    .find({ _id: { $in: publicKeys } })
    .toArray();
    return allBadges;
  } else{
    throw new Error("No public keys provided");
  }
}

export async function getBadgesForDiscordId(discordId: string): Promise<PrecomputedBadge[]> {
const db = await getMongoDatabase();
const userBadges = await db.collection<PrecomputedBadge>("precomputedBadges").find({ discordId }).toArray();
return userBadges;

}

type RoleInfo = Pick<TierRole, "_id" | "roleName">;

export async function getMemberDiscordRoles(member: GuildMember): Promise<RoleInfo[]> {
    const roles = member.roles.cache.map(role => { 
        return {_id: role.id, roleName: role.name};
     });
    return roles;
}

export async function getMemberHighestCurrentTierRole(member: GuildMember): Promise<Partial<RoleInfo> | null> {
    const tierOrder = ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"];
    const roles = await getMemberDiscordRoles(member);

    // Find the highest tier role that the member has
    let highestTierRole: Partial<TierRole> | null = null;
    let highestTierIndex = -1;

    for (const role of roles) {
        const tierIndex = tierOrder.indexOf(role.roleName);
        if (tierIndex !== -1 && tierIndex > highestTierIndex) {
            highestTierIndex = tierIndex;
            highestTierRole = role;
        }
    }

    return highestTierRole;
    
};