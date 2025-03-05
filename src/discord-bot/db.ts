//'use server';
// src/discord-bot/db.ts
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

sqlite3.verbose();

let _db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

/**
 * Internal function that opens the SQLite DB and migrates if needed.
 */
async function getDatabase(): Promise<
  Database<sqlite3.Database, sqlite3.Statement>
> {
  if (_db) {
    return _db;
  }
  const db = await open({
    filename: "./data.sqlite",
    driver: sqlite3.Database,
  });
  // Optionally run migrations
  await db.migrate({ migrationsPath: "./migrations" });
  _db = db;
  return db;
}

/**
 * Public function for legacy code that expects "getDb()".
 * Returns the underlying SQLite Database object.
 */
export async function getDb(): Promise<
  Database<sqlite3.Database, sqlite3.Statement>
> {
  return getDatabase();
}

/** Insert or replace a Guild record */
export async function storeGuild(
  guildId: string,
  guildName: string
): Promise<void> {
  const db = await getDatabase();
  await db.run(
    "INSERT OR REPLACE INTO guilds (guild_id, guild_name) VALUES (?, ?)",
    guildId,
    guildName
  );
}

/** Insert or update a role. */
export async function upsertRole(
  roleId: string,
  roleName: string,
  guildId: string
): Promise<void> {
  const db = await getDatabase();
  await db.run(
    `
    INSERT INTO roles (role_id, role_name, guild_id)
    VALUES (?, ?, ?)
    ON CONFLICT(role_id) DO UPDATE SET role_name = EXCLUDED.role_name
    `,
    roleId,
    roleName,
    guildId
  );
}

/** Insert or replace a member. The guildIds param can be a comma list if desired. */
export async function upsertMember(
  memberId: string,
  username: string,
  discriminator: string,
  guildIds: string
): Promise<void> {
  const db = await getDatabase();
  await db.run(
    `INSERT OR REPLACE INTO members (member_id, username, discriminator, guild_id)
     VALUES (?, ?, ?, ?)`,
    memberId,
    username,
    discriminator,
    guildIds
  );
}

/** Insert user_roles row if it doesn't exist yet. */
export async function insertUserRole(
  userId: string,
  roleId: string,
  guildId: string
): Promise<void> {
  const db = await getDatabase();
  const existing = await db.get<{ role_assigned_at: string; }>(
    `SELECT role_assigned_at FROM user_roles WHERE user_id = ? AND role_id = ? AND guild_id = ?`,
    [userId, roleId, guildId]
  );
  if (!existing) {
    await db.run(
      `INSERT INTO user_roles (user_id, role_id, guild_id, role_assigned_at) VALUES (?, ?, ?, ?)`,
      userId,
      roleId,
      guildId,
      new Date().toISOString()
    );
  }
}

/**
 * Batching utility if you want to insert many items in one shot.
 */
export async function executeBatch(
  statementPrefix: string, // e.g. "INSERT OR REPLACE INTO members(...) VALUES "
  inserts: unknown[][],
  batchSize: number,
  variablesPerRow: number
): Promise<void> {
  const db = await getDatabase();
  for (let i = 0; i < inserts.length; i += batchSize) {
    const batch = inserts.slice(i, i + batchSize);
    const values = batch
      .map(() => `(${new Array(variablesPerRow).fill("?").join(", ")})`)
      .join(", ");
    await db.run(statementPrefix + values, batch.flat());
  }
}

/** Return usernames for all members whose guild_id includes the given guildId. */
export async function getGuildMemberUsernames(
  guildId: string
): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.all<{ username: string; }[]>(
    "SELECT username FROM members WHERE guild_id LIKE ?",
    [`%${guildId}%`]
  );
  return rows.map((r) => r.username);
}

/** VOTING SPECIFIC METHODS **/

/** Insert a new vote (threadId, voterId) with the current timestamp. */
export async function insertVote(
  threadId: string,
  voterId: string
): Promise<void> {
  const db = await getDatabase();
  await db.run(
    "INSERT INTO votes (thread_id, voter_id, vote_timestamp) VALUES (?, ?, ?)",
    threadId,
    voterId,
    new Date().toISOString()
  );
}

/** Return all voter_ids for a thread */
export async function getThreadVotes(threadId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.all<{ voter_id: string; }[]>(
    "SELECT voter_id FROM votes WHERE thread_id = ?",
    [threadId]
  );
  return rows.map((r) => r.voter_id);
}

/** Insert a new voting thread record */
export async function insertNewVotingThread(
  threadId: string,
  nominatorId: string,
  nomineeId: string,
  roleName: string
): Promise<void> {
  const db = await getDatabase();
  await db.run(
    `
    INSERT INTO voting_threads (
      thread_id,
      created_at,
      nominator_id,
      nominee_id,
      role_id,
      role_name,
      status
    )
    VALUES (
      ?, ?, ?, ?,
      (SELECT role_id FROM roles WHERE role_name = ?),
      ?,
      'OPEN'
    )
    `,
    threadId,
    new Date().toISOString(),
    nominatorId,
    nomineeId,
    roleName,
    roleName
  );
}

/** Return the created_at for a given thread if it exists */
export async function getVotingThreadCreatedAt(
  threadId: string
): Promise<Date | null> {
  const db = await getDatabase();
  const row = await db.get<{ created_at: string; }>(
    "SELECT created_at FROM voting_threads WHERE thread_id = ?",
    threadId
  );
  return row ? new Date(row.created_at) : null;
}

/** Mark a thread as CLOSED in the DB */
export async function markVotingThreadClosed(threadId: string): Promise<void> {
  const db = await getDatabase();
  await db.run(
    `UPDATE voting_threads SET status = 'CLOSED' WHERE thread_id = ?`,
    threadId
  );
}

/** Increment the vote_count in DB for a thread */
export async function incrementThreadVoteCount(
  threadId: string
): Promise<void> {
  const db = await getDatabase();
  await db.run(
    `UPDATE voting_threads SET vote_count = vote_count + 1 WHERE thread_id = ?`,
    threadId
  );
}

/** Return the vote_count for a thread */
export async function getThreadVoteCount(
  threadId: string
): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.get<{ vote_count: number; }>(
    "SELECT vote_count FROM voting_threads WHERE thread_id = ?",
    threadId
  );
  return row ? row.vote_count : null;
}

/** Returns all "OPEN" threads from DB. Used if you want to list active votes. */
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
  const db = await getDatabase();
  return db.all(`
    SELECT thread_id, role_name, nominee_id, nominator_id,
           vote_count, datetime(created_at, 'localtime') AS created_at
    FROM voting_threads
    WHERE (status IS NULL OR status = '' OR status = 'OPEN')
  `);
}

/**
+  * Returns all usernames of members whose guild_id exactly matches guildId.
+  * (Different from getGuildMemberUsernames() which uses LIKE %...%)
+  */
export async function getExactGuildMemberUsernames(guildId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.all<{ username: string; }[]>(
    'SELECT username FROM members WHERE guild_id = ?',
    [guildId]
  );
  return rows.map((r) => r.username);
}

// src/discord-bot/db.ts

// 1) If you don’t already store SCF role counts, you can do something like:
export async function getRoleCounts(guildId: string): Promise<{
  verified: number;
  pathfinder: number;
  navigator: number;
  pilot: number;
}> {
  const db = await getDatabase();
  
  // Example naive queries. Adjust to match how you store roles in `user_roles`, etc.
  const verifiedCount = await db.get<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.role_id
    WHERE r.role_name = 'SCF Verified' AND ur.guild_id = ?
  `, guildId);

  const pathfinderCount = await db.get<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.role_id
    WHERE r.role_name = 'SCF Pathfinder' AND ur.guild_id = ?
  `, guildId);

  const navigatorCount = await db.get<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.role_id
    WHERE r.role_name = 'SCF Navigator' AND ur.guild_id = ?
  `, guildId);

  const pilotCount = await db.get<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.role_id
    WHERE r.role_name = 'SCF Pilot' AND ur.guild_id = ?
  `, guildId);

  return {
    verified: verifiedCount?.count ?? 0,
    pathfinder: pathfinderCount?.count ?? 0,
    navigator: navigatorCount?.count ?? 0,
    pilot: pilotCount?.count ?? 0,
  };
}

/** 
 * Minimal info for each role. Expand as needed (e.g. role_id).
 */
export interface MemberRoleInfo {
  name: string;
  obtained: string;  // 'role_assigned_at'
}

/** 
 * Info about each member for the dashboard 
 */
export interface MemberInfo {
  discordId: string;   // maps to 'member_id'
  username: string;    // e.g. "Alice#1234"
  memberSince: string; // We can fill from 'joinedDate' or default 'N/A'
  joinedDiscord: string; // from some data if you have it, or 'N/A'
  roles: MemberRoleInfo[];
  profileDescription: string;
  joinedStellarDevelopers?: string;
}


/** 
 * Return an array of members with their SCF roles. 
 * Adjust queries if you prefer storing multiple guild IDs in CSV or something else.
 */
export async function getAllMembersForGuild(guildId: string): Promise<MemberInfo[]> {
  const db = await getDatabase();
  // 1) fetch basic member info from 'members'
  const rows = await db.all<{
    member_id: string;
    username: string;
    discriminator: string;
    guild_id: string;
  }[]>(
    `SELECT member_id, username, discriminator, guild_id
     FROM members
     WHERE guild_id = ?`,
    [guildId]
  );

  // 2) For each member, gather roles from user_roles + roles table
  const members: MemberInfo[] = [];

  for (const row of rows) {
    const userRoles = await db.all<{
      role_name: string;
      role_assigned_at: string;
    }[]>(
      `SELECT r.role_name, ur.role_assigned_at
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.role_id
       WHERE ur.user_id = ? AND ur.guild_id = ?`,
      [row.member_id, guildId]
    );

    // Convert them to typed array
    const mappedRoles: MemberRoleInfo[] = userRoles.map((r) => ({
      name: r.role_name.replace("SCF ", ""), // example short name 
      obtained: r.role_assigned_at,
    }));

    members.push({
      discordId: row.member_id,
      username: `${row.username}#${row.discriminator}`,
      memberSince: "N/A",
      joinedDiscord: "N/A",
      roles: mappedRoles,
      profileDescription: "",
      joinedStellarDevelopers: "N/A",
    });
  }

  return members;
}