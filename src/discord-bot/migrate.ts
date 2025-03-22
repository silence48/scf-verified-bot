import { Db } from "mongodb";
import * as SqliteDB from './sqlite-db'; // for migration reads
import { Database } from "sqlite";

import { RUN_DATABASE_MIGRATION } from "./constants";
import { getMongoDatabase, upsertGuild,  upsertGuildRole,  upsertUserRole } from "./mongo-db";
import { upsertMember } from "./sqlite-db";
import { RoleDoc, VoteDoc, VotingThreadDoc, GuildDoc, BaseRole, BaseUserRole, BaseVote } from "./types";


async function getSqliteDatabase(): Promise<Database | null> {
  if (RUN_DATABASE_MIGRATION === 'true') {
    return SqliteDB.getDb();
  }
  return null;
}

export async function migrateToMongo(guildId: string): Promise<void> {
  const db: Db = await getMongoDatabase();
  //const usersColl = db.collection<UserDoc>('users');
  //const userRolesColl = db.collection<UserRoleDoc>('user_roles');
  const rolesColl = db.collection<RoleDoc>('guild_roles');
  const votesColl = db.collection<VoteDoc>('nomination_votes');
  const threadsColl = db.collection<VotingThreadDoc>('nomination_threads');
  // 1) MIGRATION LOGIC (only if RUN_DATABASE_MIGRATION === 'true')
  if (RUN_DATABASE_MIGRATION === 'true') {
    const sqliteDb: Database | null = await getSqliteDatabase();
    if (sqliteDb) {
      // (a) Ensure the guild is in Mongo
      const existingGuild = await db.collection<GuildDoc>('guilds').findOne({ _id: guildId });
      if (!existingGuild) {
        const oldGuild = await sqliteDb.get<{
          guild_id: string;
          guild_name: string;
          date_added: string;
        }>(
          'SELECT guild_id, guild_name, date_added FROM guilds WHERE guild_id = ?',
          [guildId]
        );
        if (oldGuild) {
          // upsertGuild will also do a migration check
          await upsertGuild(oldGuild.guild_id, oldGuild.guild_name, oldGuild.date_added);
        }
      }

      // (b) Migrate members whose guild_id includes this guild (CSV or single)
      const oldMembers = await sqliteDb.all<{
        member_id: string;
        username: string;
        discriminator: string;
        guild_id: string;
      }[]>(
        'SELECT member_id, username, discriminator, guild_id FROM members WHERE guild_id LIKE ?',
        [`%${guildId}%`]
      );
      for (const m of oldMembers || []) {
        await upsertMember(m.member_id, m.username, m.discriminator, m.guild_id);
      }

      // (c) Migrate roles for this guild
      const oldRoles = await sqliteDb.all<{
        role_id: string;
        role_name: string;
        guild_id: string;
      }[]>(
        'SELECT role_id, role_name, guild_id FROM roles WHERE guild_id = ?',
        [guildId]
      );
      for (const role of oldRoles || []) {
        const exists = await rolesColl.findOne<BaseRole>({
          _id: role.role_id,
        });
        const newRoleData: BaseRole = {
          _id: role.role_id,
          roleName: role.role_name,
          guildId: role.guild_id,
          createdAt: new Date(Date.now()),
          updatedAt: new Date(Date.now()),
          removedAt: null,
        }
        if(exists) {
          newRoleData.createdAt = exists.createdAt;
        }
          await upsertGuildRole(newRoleData);
      }

      // (d) Migrate user_roles for this guild
      const oldUserRoles = await sqliteDb.all<{
        user_id: string;
        role_id: string;
        guild_id: string;
        role_assigned_at: string;
      }[]>(
        'SELECT user_id, role_id, guild_id, role_assigned_at FROM user_roles WHERE guild_id = ?',
        [guildId]
      );

      for (const role of oldUserRoles || []) {
        // insertUserRole will also handle its own migration checks
        const userRole: BaseUserRole = {
          _id: `${role.user_id}_${role.role_id}_${role.guild_id}`,
          userId: role.user_id,
          roleId: role.role_id,
          guildId: role.guild_id,
          roleAssignedAt: new Date(role.role_assigned_at),
          createdAt: new Date(Date.now()),
          updatedAt: new Date(Date.now()),
          removedAt: undefined
        }
        await upsertUserRole(userRole);
      }
      // migrate past votes from sqlite to mongodb.
      const pastvotes = await sqliteDb.all<{
        vote_id: number;
        thread_id: string;
        voter_id: string;
        vote_timestamp: string;
      }[]>('SELECT vote_id, thread_id, voter_id, vote_timestamp FROM votes');
      for (const vote of pastvotes || []) {
        const voteTime = new Date(vote.vote_timestamp);
        const exists = await votesColl.findOne<BaseVote>({
          _id: vote.vote_id,
        });
        const votedata = {
          _id: vote.vote_id,
          threadId: vote.thread_id,
          voterId: vote.voter_id,
          voteTimestamp: voteTime,
          createdAt:  new Date(Date.now()),
        } as VoteDoc;
        if (!exists) {
          await votesColl.insertOne(votedata);
        }
      }
      // migrate threads to mongodb.
      const pastThreads = await sqliteDb.all<{
        thread_id: string;
        created_at: string;
        nominator_id: string;
        nominee_id: string;
        role_id: string;
        role_name: string;
        vote_count: number;
        status: "OPEN" | "CLOSED" | "";
      }[]>('SELECT thread_id, created_at, nominator_id, nominee_id, role_id, role_name, vote_count, status FROM voting_threads');
      for (const thread of pastThreads || []) {
        const threadTime = new Date(thread.created_at);
        const exists = await threadsColl.findOne<VotingThreadDoc>({
          _id: thread.thread_id,
        });
        const threaddata = {
          _id: thread.thread_id,
          createdAt: threadTime,
          nominatorId: thread.nominator_id,
          nomineeId: thread.nominee_id,
          roleId: thread.role_id,
          roleName: thread.role_name,
          voteCount: thread.vote_count,
          status: thread.status,
          updatedAt: new Date(Date.now()),
        } as VotingThreadDoc;
        if (!exists) {
          await threadsColl.insertOne(threaddata);
        }
      }
    
      

    }
  }

 
}