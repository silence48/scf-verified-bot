import { getDb } from "../db";
type Member = {
  guild_id: string;
  username: string;
  discriminator: string;
};

export async function getMember(memberId: string): Promise<Member> {
  // it returns a member from the database.
  const db = await getDb();
  const member = await db.get(
    "SELECT guild_id, username, discriminator FROM members WHERE member_id = ?",
    memberId
  );
  return member;
}

// Helper function to split inserts into batches
interface UserRole {
    user_id: string;
    role_id: string;
    guild_id: string;
    role_assigned_at: Date;
}

interface MemberInsert {
    member_id: string;
    username: string;
    discriminator: string;
    guild_id: string;
}

async function executeUserRoleBatch(userRoles: UserRole[], batchSize: number = 249) {
    const statement = "INSERT INTO user_roles (user_id, role_id, guild_id, role_assigned_at) VALUES ";
    const db = await getDb();
    
    for (let i = 0; i < userRoles.length; i += batchSize) {
        const batch = userRoles.slice(i, i + batchSize);
        const values = batch
            .map(() => "(?, ?, ?, CURRENT_TIMESTAMP)")
            .join(", ");
        
        const params = batch.flatMap(role => [role.user_id, role.role_id, role.guild_id]);
        await db.run(statement + values, params);
    }
}

async function executeMemberBatch(members: MemberInsert[], batchSize: number = 249) {
    const statement = "INSERT OR REPLACE INTO members (member_id, username, discriminator, guild_id) VALUES ";
    const db = await getDb();
    
    for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        const values = batch
            .map(() => "(?, ?, ?, ?)")
            .join(", ");
        
        const params = batch.flatMap(member => [
            member.member_id,
            member.username,
            member.discriminator,
            member.guild_id
        ]);
        await db.run(statement + values, params);
    }
}

