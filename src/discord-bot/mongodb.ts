/**
 * mongodb.ts
 *
 * A drop-in replacement for db.ts that uses MongoDB instead of SQLite.
 * Each function has the same signature (args + return) as the original.
 * Additionally, if process.env.DATABASE_MIGRATION === 'true', we fetch relevant
 * rows from SQLite (via the original db.ts) and upsert them into MongoDB for migration.
 */

import { MongoClient, Db, Collection, UpdateFilter } from 'mongodb';
import { BOT_READONLY_MODE } from './constants';

// Import the original db.ts so we can read from SQLite for migration
import * as SqliteDB from './db';
import type { Database } from 'sqlite';

// Example DiscordProfile interface you provided:
export interface DiscordProfile extends Record<string, unknown> {
  id: string; // Snowflake
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  mfa_enabled: boolean;
  banner: string | null;
  accent_color: number | null;
  locale: string;
  verified: boolean;
  email: string | null;
  flags: number;
  premium_type: number;
  public_flags: number;
  display_name: string | null;
  avatar_decoration: string | null;
  banner_color: string | null;
  image_url: string;
}

// Re-export your existing interfaces so calling code doesn't break
export interface MemberRoleInfo {
  name: string;      // e.g. "Navigator" (without "SCF ")
  obtained: string;  // ISO string of date assigned
}

export interface MemberInfo {
  discordId: string;   // maps to 'member_id'
  username: string;    // e.g. "Alice#1234"
  memberSince: string; // e.g. "N/A" or an ISO date
  joinedDiscord: string; // e.g. "N/A" or an ISO date
  roles: MemberRoleInfo[];
  profileDescription: string;
  joinedStellarDevelopers?: string;
}

/* ----------------------------------------------------
   MONGO CONNECTION / COLLECTION HELPERS
---------------------------------------------------- */

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

/**
 * Connects to Mongo if not already connected.
 * Returns the `Db` instance (using database name "scfroles").
 */
async function getMongoDatabase(): Promise<Db> {
  if (mongoDb) return mongoDb;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI not set in environment');
  }

  mongoClient = new MongoClient(process.env.MONGO_URI);
  await mongoClient.connect();
  mongoDb = mongoClient.db('scfroles');

  return mongoDb;
}

/**
 * Helper to get a handle on the SQLite DB for migration, only if MIGRATION === true.
 */
async function getSqliteDatabase(): Promise<Database | null> {
  if (process.env.DATABASE_MIGRATION === 'true') {
    return SqliteDB.getDb();
  }
  return null;
}

/* ----------------------------------------------------
   SCHEMAS (One collection per original table)
---------------------------------------------------- */

// GUILDS => "guilds"
interface GuildDoc {
  _id: string;         // guild_id
  guildName: string;
  createdAt: Date;
  updatedAt: Date;
}

// MEMBERS => "users"
// We'll store each user’s partial or full Discord profile if available.
// This doc can contain additional fields like joinedAt, etc.
interface UserDoc {
  _id: string;         // member_id
  username: string;
  discriminator: string;
  guildIds: string[];  // in case one user is in multiple guilds
  discordProfile?: DiscordProfile;
  createdAt: Date;
  updatedAt: Date;
}

// ROLES => "roles"
interface RoleDoc {
  _id: string;  // role_id
  roleName: string;
  guildId: string;
  createdAt: Date;
  updatedAt: Date;
}

// user_roles => "user_roles"
interface UserRoleDoc {
  // Typically we might define a compound unique index on (userId, roleId, guildId).
  _id: string; // Could just be `${userId}_${roleId}`
  userId: string;
  roleId: string;
  guildId: string;
  roleAssignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// voting_threads => "voting_threads"
interface VotingThreadDoc {
  _id: string;      // thread_id
  createdAt: Date;
  nominatorId: string;
  nomineeId: string;
  roleId: string;
  roleName: string;
  voteCount: number;
  status: 'OPEN' | 'CLOSED' | ''; // handle the empty string too
  updatedAt: Date;
}

// votes => "votes"
interface VoteDoc {
  // In SQLite, we have vote_id as autoincrement, but in Mongo we use an ObjectId.
  // We can just store an auto `_id` or a composite. We'll just store an _id = ObjectId
  threadId: string;
  voterId: string;
  voteTimestamp: Date;
  createdAt: Date;
}

// For the "interested_members" table if needed. We'll skip for brevity
// or implement similarly.

// We also re-implement all the same function names here:


/* ----------------------------------------------------
   1) getDb() EQUIVALENT
---------------------------------------------------- */

/**
 * For backward compatibility. Some legacy code might call "getDb()" expecting
 * a SQLite Database. Now we return a placeholder or the Mongo DB instance.
 * If you only want to keep the signature but not actually rely on it, you can
 * return an empty object. But here, we return the MongoDB instance for convenience.
 */
export async function getDb(): Promise<Db> {
  return getMongoDatabase();
}


/* ----------------------------------------------------
   2) storeGuild(guildId, guildName)
---------------------------------------------------- */
export async function storeGuild(guildId: string, guildName: string): Promise<void> {
  const db = await getMongoDatabase();
  const guildsColl = db.collection<GuildDoc>('guilds');

  try {
    // Upsert the new guild doc:
    const now = new Date();
    await guildsColl.updateOne(
      { _id: guildId },
      {
        $setOnInsert: { createdAt: now },
        $set: {
          guildName,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // Optional migration from SQLite
    if (process.env.DATABASE_MIGRATION === 'true' && !BOT_READONLY_MODE) {
      const sqliteDb = await getSqliteDatabase();
      if (sqliteDb) {
        const oldRow = await sqliteDb.get<{
          guild_id: string;
          guild_name: string;
          date_added: string;
        }>(
          `SELECT guild_id, guild_name, date_added FROM guilds WHERE guild_id = ?`,
          [guildId]
        );

        if (oldRow) {
          const rowCreatedAt = oldRow.date_added ? new Date(oldRow.date_added) : now;
          // Overwrite only if we don't have a smaller createdAt
          await guildsColl.updateOne(
            { _id: oldRow.guild_id },
            {
              $min: { createdAt: rowCreatedAt },
              $set: {
                guildName: oldRow.guild_name,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }
    }
  } catch (err) {
    console.error('[storeGuild] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   3) upsertRole(roleId, roleName, guildId)
---------------------------------------------------- */
export async function upsertRole(
  roleId: string,
  roleName: string,
  guildId: string
): Promise<void> {
  const db = await getMongoDatabase();
  const rolesColl = db.collection<RoleDoc>('roles');

  try {
    const now = new Date();
    await rolesColl.updateOne(
      { _id: roleId },
      {
        $setOnInsert: {
          createdAt: now,
          guildId,
        },
        $set: {
          roleName,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    if (process.env.DATABASE_MIGRATION === 'true' && !BOT_READONLY_MODE) {
      const sqliteDb = await getSqliteDatabase();
      if (sqliteDb) {
        const oldRow = await sqliteDb.get<{
          role_id: string;
          role_name: string;
          guild_id: string;
        }>(
          `SELECT role_id, role_name, guild_id FROM roles WHERE role_id = ?`,
          [roleId]
        );

        if (oldRow) {
          await rolesColl.updateOne(
            { _id: oldRow.role_id },
            {
              $setOnInsert: {
                createdAt: now, // no createdAt in roles table, so we set now
                guildId: oldRow.guild_id,
              },
              $set: {
                roleName: oldRow.role_name,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }
    }
  } catch (err) {
    console.error('[upsertRole] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   4) upsertMember(memberId, username, discriminator, guildIds)
      In Mongo, we might store user docs in "users" or "members" collection.
      We'll call it "users" here.
---------------------------------------------------- */
export async function upsertMember(
  memberId: string,
  username: string,
  discriminator: string,
  guildIds: string
): Promise<void> {
  const db = await getMongoDatabase();
  const usersColl = db.collection<UserDoc>('users');
  const now = new Date();

  try {
    // Convert the CSV of guild IDs to an array.
    const guildArray = guildIds.split(',').map((g) => g.trim()).filter(Boolean);

    // If you have a full DiscordProfile for this user from your Discord.js
    // logic, you could pass it in and store it. For now, we only have username/discriminator.
    // We'll show you can store partial profile placeholders.
    await usersColl.updateOne(
      { _id: memberId },
      {
        $setOnInsert: {
          createdAt: now,
        },
        $set: {
          username,
          discriminator,
          updatedAt: now,
        },
        $addToSet: {
          guildIds: { $each: guildArray },
        },
      },
      { upsert: true }
    );

    if (process.env.DATABASE_MIGRATION === 'true' && !BOT_READONLY_MODE) {
      const sqliteDb = await getSqliteDatabase();
      if (sqliteDb) {
        // Migrate from the "members" table
        const oldRow = await sqliteDb.get<{
          member_id: string;
          username: string;
          discriminator: string;
          guild_id: string;
        }>(
          `SELECT member_id, username, discriminator, guild_id
           FROM members
           WHERE member_id = ?`,
          [memberId]
        );

        if (oldRow) {
          // Their old stored guild_id might be a single ID or multiple
          const oldGuildArray = oldRow.guild_id
            .split(',')
            .map((g) => g.trim())
            .filter(Boolean);

          await usersColl.updateOne(
            { _id: oldRow.member_id },
            {
              $setOnInsert: { createdAt: now },
              $set: {
                username: oldRow.username,
                discriminator: oldRow.discriminator,
                updatedAt: new Date(),
              },
              $addToSet: {
                guildIds: { $each: oldGuildArray },
              },
            },
            { upsert: true }
          );
        }
      }
    }
  } catch (err) {
    console.error('[upsertMember] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   5) insertUserRole(userId, roleId, guildId)
      In SQLite, we have user_roles as a table. Here, we'll store them in a
      "user_roles" collection for a 1:1 migration approach.
---------------------------------------------------- */
export async function insertUserRole(
  userId: string,
  roleId: string,
  guildId: string
): Promise<void> {
  const db = await getMongoDatabase();
  const userRolesColl = db.collection<UserRoleDoc>('user_roles');
  const now = new Date();
  const docId = `${userId}_${roleId}_${guildId}`; // a simple composite key

  try {
    // Check if it already exists
    const existing = await userRolesColl.findOne({ _id: docId });
    if (!existing) {
      // Insert (not strictly an upsert, we only insert if not found).
      await userRolesColl.insertOne({
        _id: docId,
        userId,
        roleId,
        guildId,
        roleAssignedAt: now, // or handle your date logic
        createdAt: now,
        updatedAt: now,
      });
    }

    // MIGRATION
    if (process.env.DATABASE_MIGRATION === 'true' && !BOT_READONLY_MODE) {
      const sqliteDb = await getSqliteDatabase();
      if (sqliteDb) {
        const oldRow = await sqliteDb.get<{
          user_id: string;
          role_id: string;
          guild_id: string;
          role_assigned_at: string;
        }>(
          `SELECT user_id, role_id, guild_id, role_assigned_at
           FROM user_roles
           WHERE user_id = ? AND role_id = ? AND guild_id = ?`,
          [userId, roleId, guildId]
        );
        if (oldRow) {
          const oldAssigned = oldRow.role_assigned_at
            ? new Date(oldRow.role_assigned_at)
            : now;
          const oldDocId = `${oldRow.user_id}_${oldRow.role_id}_${oldRow.guild_id}`;
          await userRolesColl.updateOne(
            { _id: oldDocId },
            {
              $setOnInsert: {
                createdAt: now,
              },
              $set: {
                userId: oldRow.user_id,
                roleId: oldRow.role_id,
                guildId: oldRow.guild_id,
                roleAssignedAt: oldAssigned,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }
    }
  } catch (err) {
    console.error('[insertUserRole] Error:', err);
    throw err;
  }
}

/* ----------------------------------------------------
   7) getGuildMemberUsernames(guildId)
      Return usernames for all members whose guildIds includes the given guildId.
---------------------------------------------------- */
export async function getGuildMemberUsernames(guildId: string): Promise<string[]> {
  const db = await getMongoDatabase();
  const usersColl = db.collection<UserDoc>('users');

  try {
    // We'll find all docs that have `guildId` in their `guildIds` array
    const users = await usersColl
      .find({ guildIds: guildId })
      .project({ username: 1, discriminator: 1 })
      .toArray();

    return users.map(u => u.username);
  } catch (err) {
    console.error('[getGuildMemberUsernames] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   VOTING SPECIFIC METHODS
---------------------------------------------------- */

/* ----------------------------------------------------
   8) insertVote(threadId, voterId)
---------------------------------------------------- */
export async function insertVote(threadId: string, voterId: string): Promise<void> {
  const db = await getMongoDatabase();
  const votesColl = db.collection<VoteDoc>('votes');
  const now = new Date();

  try {
    // Insert a new doc
    await votesColl.insertOne({
      threadId,
      voterId,
      voteTimestamp: now,
      createdAt: now,
    });

    // MIGRATION
    if (process.env.DATABASE_MIGRATION === 'true' && !BOT_READONLY_MODE) {
      const sqliteDb = await getSqliteDatabase();
      if (sqliteDb) {
        // There's no single row to upsert if we only get "threadId, voterId" from arguments.
        // We can check if there's a matching row in the SQLite "votes" table.
        // The "votes" table uses an autoincrement primary key, but we can approximate.
        const oldRows = await sqliteDb.all<Array<{
          vote_id: number;
          thread_id: string;
          voter_id: string;
          vote_timestamp: string;
        }>>(
          `SELECT vote_id, thread_id, voter_id, vote_timestamp
           FROM votes
           WHERE thread_id = ? AND voter_id = ?`,
          [threadId, voterId]
        );
        // Upsert each old row
        for (const old of oldRows) {
          const oldTime = old.vote_timestamp ? new Date(old.vote_timestamp) : now;
          // In Mongo, we rely on the idea that each row is distinct. So just insert or skip.
          // We'll do a unique approach: create a doc with a special composite ID if you prefer.
          // For brevity, let's just do an insertOne with an additional filter check:
          const existing = await votesColl.findOne({
            threadId: old.thread_id,
            voterId: old.voter_id,
            voteTimestamp: oldTime,
          });
          if (!existing) {
            await votesColl.insertOne({
              threadId: old.thread_id,
              voterId: old.voter_id,
              voteTimestamp: oldTime,
              createdAt: new Date(),
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[insertVote] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   9) getThreadVotes(threadId)
      Return all voter_ids for a thread
---------------------------------------------------- */
export async function getThreadVotes(threadId: string): Promise<string[]> {
  const db = await getMongoDatabase();
  const votesColl = db.collection<VoteDoc>('votes');

  try {
    const rows = await votesColl
      .find({ threadId })
      .project({ voterId: 1 })
      .toArray();
    return rows.map((r) => r.voterId);
  } catch (err) {
    console.error('[getThreadVotes] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   10) insertNewVotingThread(threadId, nominatorId, nomineeId, roleName)
---------------------------------------------------- */
export async function insertNewVotingThread(
  threadId: string,
  nominatorId: string,
  nomineeId: string,
  roleName: string
): Promise<void> {
  const db = await getMongoDatabase();
  const threadsColl = db.collection<VotingThreadDoc>('voting_threads');
  const now = new Date();

  try {
    // We also need to figure out the role_id from roles table if it exists. In the original
    // code, we do: (SELECT role_id FROM roles WHERE role_name = ?).
    // We'll do a quick lookup in Mongo:
    let roleId = '';
    const roleDoc = await db.collection<RoleDoc>('roles').findOne({ roleName });
    if (roleDoc) {
      roleId = roleDoc._id;
    }

    await threadsColl.updateOne(
      { _id: threadId },
      {
        $setOnInsert: {
          createdAt: now,
        },
        $set: {
          nominatorId,
          nomineeId,
          roleId: roleId || `unknown_for_${roleName}`,
          roleName,
          voteCount: 0,
          status: 'OPEN',
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // MIGRATION
    if (process.env.DATABASE_MIGRATION === 'true' && !BOT_READONLY_MODE) {
      const sqliteDb = await getSqliteDatabase();
      if (sqliteDb) {
        const oldRow = await sqliteDb.get<{
          thread_id: string;
          created_at: string;
          nominator_id: string;
          nominee_id: string;
          role_id: string;
          role_name: string;
          vote_count: number;
          status: string;
        }>(
          `SELECT thread_id, created_at, nominator_id, nominee_id, role_id, role_name, vote_count, status
           FROM voting_threads
           WHERE thread_id = ?`,
          [threadId]
        );
        if (oldRow) {
          const oldCreatedAt = new Date(oldRow.created_at);
          await threadsColl.updateOne(
            { _id: oldRow.thread_id },
            {
              $min: { createdAt: oldCreatedAt },
              $setOnInsert: {},
              $set: {
                nominatorId: oldRow.nominator_id,
                nomineeId: oldRow.nominee_id,
                roleId: oldRow.role_id,
                roleName: oldRow.role_name,
                voteCount: oldRow.vote_count ?? 0,
                status: oldRow.status || 'OPEN',
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }
    }
  } catch (err) {
    console.error('[insertNewVotingThread] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   11) getVotingThreadCreatedAt(threadId)
       Return Date or null
---------------------------------------------------- */
export async function getVotingThreadCreatedAt(threadId: string): Promise<Date | null> {
  const db = await getMongoDatabase();
  const threadsColl = db.collection<VotingThreadDoc>('voting_threads');

  try {
    const doc = await threadsColl.findOne({ _id: threadId });
    return doc ? doc.createdAt : null;
  } catch (err) {
    console.error('[getVotingThreadCreatedAt] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   12) markVotingThreadClosed(threadId)
---------------------------------------------------- */
export async function markVotingThreadClosed(threadId: string): Promise<void> {
  const db = await getMongoDatabase();
  const threadsColl = db.collection<VotingThreadDoc>('voting_threads');

  try {
    await threadsColl.updateOne(
      { _id: threadId },
      {
        $set: {
          status: 'CLOSED',
          updatedAt: new Date(),
        },
      }
    );
    // MIGRATION logic for existing row is basically a no-op unless we want to fetch from SQLite
    // But for consistency:
    if (process.env.DATABASE_MIGRATION === 'true' && !BOT_READONLY_MODE) {
      const sqliteDb = await getSqliteDatabase();
      if (sqliteDb) {
        const oldRow = await sqliteDb.get<{ thread_id: string }>(
          `SELECT thread_id FROM voting_threads WHERE thread_id = ?`,
          [threadId]
        );
        if (oldRow) {
          // We already have the doc in Mongo, so just ensure it's closed
          await threadsColl.updateOne(
            { _id: oldRow.thread_id },
            { $set: { status: 'CLOSED', updatedAt: new Date() } }
          );
        }
      }
    }
  } catch (err) {
    console.error('[markVotingThreadClosed] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   13) incrementThreadVoteCount(threadId)
---------------------------------------------------- */
export async function incrementThreadVoteCount(threadId: string): Promise<void> {
  const db = await getMongoDatabase();
  const threadsColl = db.collection<VotingThreadDoc>('voting_threads');

  try {
    await threadsColl.updateOne(
      { _id: threadId },
      {
        $inc: { voteCount: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    if (process.env.DATABASE_MIGRATION === 'true' && !BOT_READONLY_MODE) {
      // Migrate old row, then increment
      const sqliteDb = await getSqliteDatabase();
      if (sqliteDb) {
        const oldRow = await sqliteDb.get<{
          thread_id: string;
          vote_count: number;
        }>(
          `SELECT thread_id, vote_count FROM voting_threads WHERE thread_id = ?`,
          [threadId]
        );
        if (oldRow) {
          await threadsColl.updateOne(
            { _id: oldRow.thread_id },
            {
              $set: {
                voteCount: (oldRow.vote_count ?? 0) + 1,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }
    }
  } catch (err) {
    console.error('[incrementThreadVoteCount] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   14) getThreadVoteCount(threadId)
       Return number or null
---------------------------------------------------- */
export async function getThreadVoteCount(threadId: string): Promise<number | null> {
  const db = await getMongoDatabase();
  const threadsColl = db.collection<VotingThreadDoc>('voting_threads');

  try {
    const doc = await threadsColl.findOne({ _id: threadId }, { projection: { voteCount: 1 } });
    return doc ? doc.voteCount : null;
  } catch (err) {
    console.error('[getThreadVoteCount] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   15) getOpenVotingThreads()
       Returns all "OPEN" threads from DB
---------------------------------------------------- */
export async function getOpenVotingThreads(): Promise<
  {
    thread_id: string;
    role_name: string;
    nominee_id: string;
    nominator_id: string;
    vote_count: number;
    created_at: string;
  }[]
> {
  const db = await getMongoDatabase();
  const threadsColl = db.collection<VotingThreadDoc>('voting_threads');

  try {
    // "OPEN" or empty string in your schema. Let's handle both:
    const openThreads = await threadsColl
      .find({
        $or: [{ status: 'OPEN' }, { status: '' }, { status: { $exists: false } }],
      })
      .toArray();

    return openThreads.map((t) => ({
      thread_id: t._id,
      role_name: t.roleName,
      nominee_id: t.nomineeId,
      nominator_id: t.nominatorId,
      vote_count: t.voteCount,
      created_at: t.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error('[getOpenVotingThreads] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   16) getExactGuildMemberUsernames(guildId)
       Returns all usernames of members whose guild_id EXACTLY matches.
       In SQLite, you do `WHERE guild_id = ?`. For Mongo, we interpret that
       as "the array of guildIds is exactly [guildId]."
       Or you might have originally stored a single string (no CSV).
---------------------------------------------------- */
export async function getExactGuildMemberUsernames(guildId: string): Promise<string[]> {
  const db = await getMongoDatabase();
  const usersColl = db.collection<UserDoc>('users');

  try {
    // If you literally stored `guildIds: string[]`, you have a few ways:
    // 1) Exactly one guild ID in the array => guildIds: [guildId]
    // 2) Or store a single field guildId
    // We'll assume you want to match EXACT array eq [guildId].
    const docs = await usersColl
      .find({ guildIds: [guildId] })
      .project({ username: 1 })
      .toArray();

    return docs.map((d) => d.username);
  } catch (err) {
    console.error('[getExactGuildMemberUsernames] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   17) getRoleCounts(guildId)
       Return { verified, pathfinder, navigator, pilot }
       In the original version, you do queries that join user_roles and roles
       for specific role_name patterns. We'll replicate that logic in Mongo.
---------------------------------------------------- */
export async function getRoleCounts(guildId: string): Promise<{
  verified: number;
  pathfinder: number;
  navigator: number;
  pilot: number;
}> {
  console.log(`[getRoleCounts] with guildId ${guildId}`);
  const db = await getMongoDatabase();
  const rolesColl = db.collection<RoleDoc>('roles');
  const userRolesColl = db.collection<UserRoleDoc>('user_roles');

  const roleNames = ['SCF Verified', 'SCF Pathfinder', 'SCF Navigator', 'SCF Pilot'];
  const results: Record<string, number> = {
    'SCF Verified': 0,
    'SCF Pathfinder': 0,
    'SCF Navigator': 0,
    'SCF Pilot': 0,
  };

  try {
    // 1) For each of the SCF role names, find the matching role doc(s)
    //    Then count how many user_roles reference them (in the same guild).
    for (const rn of roleNames) {
      const roleDocs = await rolesColl.find({ guildId, roleName: rn }).toArray();
      let totalCount = 0;

      for (const r of roleDocs) {
        // Count how many user_role docs reference this roleId
        const count = await userRolesColl.countDocuments({
          roleId: r._id,
          guildId,
        });
        totalCount += count;
      }
      results[rn] = totalCount;
    }

    // Return the final object but with property names: verified, pathfinder...
    return {
      verified: results['SCF Verified'] ?? 0,
      pathfinder: results['SCF Pathfinder'] ?? 0,
      navigator: results['SCF Navigator'] ?? 0,
      pilot: results['SCF Pilot'] ?? 0,
    };
  } catch (err) {
    console.error('[getRoleCounts] Error:', err);
    throw err;
  }
}


/* ----------------------------------------------------
   18) getAllMembersForGuild(guildId)
       Return an array of MemberInfo objects.
       Original code:
         1) fetch from members table
         2) find matching roles in user_roles => roles table => etc.
---------------------------------------------------- */
export async function getAllMembersForGuild(guildId: string): Promise<MemberInfo[]> {
  const db = await getMongoDatabase();
  const usersColl = db.collection<UserDoc>('users');
  const userRolesColl = db.collection<UserRoleDoc>('user_roles');
  const rolesColl = db.collection<RoleDoc>('roles');

  console.log(`[getAllMembersForGuild] with guildId ${guildId}`);

  try {
    // 1) fetch user docs that contain this guildId
    const rows = await usersColl
      .find({ guildIds: guildId })
      .toArray();

    const members: MemberInfo[] = [];

    for (const row of rows) {
      // 2) gather roles from user_roles + roles
      const userRoleDocs = await userRolesColl
        .find({ userId: row._id, guildId })
        .toArray();

      // For each userRoleDoc, find the matching role_name
      const roles: MemberRoleInfo[] = [];
      for (const ur of userRoleDocs) {
        const roleDoc = await rolesColl.findOne({ _id: ur.roleId });
        if (!roleDoc) continue;
        // Convert e.g. "SCF Navigator" => "Navigator"
        const shortName = roleDoc.roleName.replace(/^SCF\s+/, '');
        roles.push({
          name: shortName,
          obtained: ur.roleAssignedAt.toISOString(),
        });
      }

      // Build the final object
      members.push({
        discordId: row._id,
        username: `${row.username}#${row.discriminator}`,
        memberSince: 'N/A', // you can store your joinedAt if you have it in row
        joinedDiscord: 'N/A', // likewise
        roles,
        profileDescription: '',
        joinedStellarDevelopers: 'N/A',
      });
    }

    return members;
  } catch (err) {
    console.error('[getAllMembersForGuild] Error:', err);
    throw err;
  }
}

