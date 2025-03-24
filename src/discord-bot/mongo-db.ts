import { MongoClient, Db } from "mongodb";
import { Client, Collection, Guild, Role } from "discord.js";
import { logger } from "./logger";
import { GuildDoc, RoleDoc, BaseRole, UserDoc, BaseUserRole, BaseVote, VoteDoc, VotingThreadDoc, BaseVotingThread, UserRoleDoc, InterestedMemberDoc, MemberInfo, MemberRoleInfo } from "./types";
import { type BaseUser } from "./client";
import { getAllMembersAgg } from "@/lib/MemberWatcher";
import { RoleStats } from "@/types/discord-bot";
//import { Badge, fetchWithRetry } from '@/lib/stellarQuest';
//import { parseTomlFiles } from '@/lib/tomlParser';
//import { sleep } from '@/lib/utils';
/* Reminder:
upsert: true = “Update or create.”
$setOnInsert = fields only set if a new doc is created.
$set = fields updated always, whether new doc or existing.
$addToSet = push a value into an array only if it isn’t already present.
$each = used with $addToSet to add multiple values.
$inc = increment a field by a specified value.
$push = add a value to an array, regardless of duplicates.
$pull = remove a value from an array.
$unset = remove a field from a document.
$rename = rename a field in a document.
$addToSet = add a value to an array only if it isn’t already present.
$pop = remove the first or last element of an array.
$bit = perform bitwise operations on a field.
$min = update a field only if the specified value is less than the current value.
$max = update a field only if the specified value is greater than the current value.
$mul = multiply a field by a specified value.
$rename = rename a field in a document.
*/

const _API_KEY = process.env.SXX_API_KEY;
const _BASE_URL = "https://api.stellar.expert";
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
const DB_NAME = process.env.NEW_DB_NAME || "scfroles-test";
export async function getMongoDatabase(): Promise<Db> {
  if (mongoDb) return mongoDb;
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI not set");
  }
  mongoClient = new MongoClient(process.env.MONGO_URI);
  await mongoClient.connect();
  mongoDb = mongoClient.db(DB_NAME);
  return mongoDb;
}

export async function getDb(): Promise<Db> {
  return getMongoDatabase();
}

export async function upsertGuild(guildId: string, guildName: string, date_added?: string | Date): Promise<void> {
  const db = await getMongoDatabase();
  const coll = db.collection<GuildDoc>("guilds");
  const now = new Date();

  let createdAt = now;
  if (date_added) {
    if (typeof date_added === "string") {
      createdAt = new Date(date_added);
      if (isNaN(createdAt.getTime())) {
        createdAt = now;
      }
    } else {
      createdAt = date_added;
    }
  }

  try {
    await coll.updateOne(
      { _id: guildId },
      {
        $setOnInsert: { createdAt },
        $set: { guildName, updatedAt: now },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[upsertGuild] Error:", err);
    throw err;
  }
}

export async function bulkUpsertGuildRoles(guild: Guild, fetchedRoles: Collection<string, Role>, client: Client): Promise<void> {
  const now = new Date();

  // Build an array of bulk "updateOne" operations
  const ops = [];
  for (const role of fetchedRoles.values()) {
    ops.push({
      updateOne: {
        filter: { _id: role.id },
        update: {
          $setOnInsert: { createdAt: now, guildId: guild.id },
          $set: { roleName: role.name, updatedAt: now, role: role.toJSON() },
        },
        upsert: true,
      },
    });
  }

  if (ops.length === 0) {
    logger(`[bulkUpsertGuildRoles] No roles to upsert for ${guild.name}.`, client);
    return;
  }

  try {
    const db: Db = await getMongoDatabase();
    const rollsColl = db.collection<RoleDoc>("guild_roles");

    const result = await rollsColl.bulkWrite(ops, { ordered: false });
    logger(`[bulkUpsertGuildRoles] Upsert result: upserted=${result.upsertedCount}, modified=${result.modifiedCount}`, client);
  } catch (err) {
    logger(`[bulkUpsertGuildRoles] Error: ${err}`, client);
    throw err;
  }
}

export async function upsertGuildRole(role: BaseRole): Promise<void> {
  const db = await getMongoDatabase();
  const coll = db.collection<RoleDoc>("guild_roles");
  const now = new Date();
  try {
    await coll.updateOne(
      { _id: role._id },
      {
        $setOnInsert: { createdAt: now, guildId: role.guildId },
        $set: { roleName: role.roleName, updatedAt: now },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[upsertGuildRole] Error:", err);
    throw err;
  }
}
// Track the last time the syncMembersFromDiscord function was called
const SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const donotsync = false;
export async function syncMembersFromDiscord(guild: Guild, client: Client): Promise<MemberInfo[]> {
  console.log("[SyncMembersFromDiscord] starting sync from discord.");
  try {
    if (globalThis.last_member_sync === undefined) {
      globalThis.last_member_sync = new Map<string, Date>();
    }
    const now = new Date();
    const guildId = guild.id;
    const lastSync = globalThis.last_member_sync.get(guildId);
    console.log(`[sync members] the last sync was ${lastSync}`);
    // Check if we've synced recently (within the last hour)
    if (lastSync && now.getTime() - lastSync.getTime() < SYNC_COOLDOWN_MS) {
      logger(`[syncMembersFromDiscord] Skipping bulk upsert - last sync was ${Math.floor((now.getTime() - lastSync.getTime()) / 60000)} minutes ago`, client);
      // Just return data from database without re-syncing
      return await getAllMembersAgg(guildId);
    }
    if (donotsync === true) {
      console.log("do not sync is true returning data");
      return await getAllMembersAgg(guildId);
    }

    // 1) Fetch members from Discord
    const members = await guild.members.fetch();
    logger(`[bulkUpsertMembers] Fetched ${members.size} members for guild ${guild.name}`, client);

    // 2) Prepare for batch processing
    const db = await getMongoDatabase();
    const usersColl = db.collection<BaseUser>("users");
    const allOps = [];

    // 3) Build operations array
    for (const member of members.values()) {
      allOps.push({
        updateOne: {
          filter: { _id: member.user.id },
          update: {
            $setOnInsert: { createdAt: now },
            $set: {
              // Basic fields
              username: member.user.username,
              discriminator: member.user.discriminator,
              updatedAt: now,
              discordProfile: member.toJSON() as typeof member,
              user: member.user.toJSON() as typeof member.user,
            },
            $addToSet: {
              guildIds: guild.id,
            },
          },
          upsert: true,
        },
      });
    }

    if (allOps.length === 0) {
      logger("[bulkUpsertMembers] No members to upsert.", client);
      throw new Error("no members found");
    }

    // 4) Execute the bulkWrite in batches of 100
    const batchSize = 2500;
    let totalMatched = 0;
    let totalModified = 0;
    let totalUpserted = 0;

    for (let i = 0; i < allOps.length; i += batchSize) {
      const batch = allOps.slice(i, i + batchSize);
      logger(`[bulkUpsertMembers] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allOps.length / batchSize)}, size: ${batch.length}`, client);

      const result = await usersColl.bulkWrite(batch, { ordered: false });

      totalMatched += result.matchedCount;
      totalModified += result.modifiedCount;
      totalUpserted += result.upsertedCount;
    }

    logger(
      `[bulkUpsertMembers] All batches completed. 
      matchedCount=${totalMatched}, 
      modifiedCount=${totalModified}, 
      upsertedCount=${totalUpserted}`,
      client,
    );

    // Update the last sync time
    globalThis.last_member_sync.set(guildId, now);

    const memberInfoArray = await getAllMembersAgg(guild.id);
    return memberInfoArray;
  } catch (err) {
    logger(`[bulkUpsertMembers] Error: ${String(err)}`, client);
    console.error(err);
    throw err;
  }
}

export async function upsertMember(memberId: string, username: string, discriminator: string, guildIds: string): Promise<void> {
  const db = await getMongoDatabase();
  const coll = db.collection<UserDoc>("users");
  const now = new Date();
  try {
    const guildArray = guildIds
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    await coll.updateOne(
      { _id: memberId },
      {
        $setOnInsert: { createdAt: now },
        $set: { username, discriminator, updatedAt: now },
        $addToSet: { guildIds: { $each: guildArray } },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[upsertMember] Error:", err);
    throw err;
  }
}

export async function upsertUserRole(userRoleData: Partial<BaseUserRole> & { userId: string; roleId: string; guildId: string }): Promise<void> {
  const db = await getMongoDatabase();
  const coll = db.collection<BaseUserRole>("user_roles");
  const now = new Date();
  const { userId, roleId, guildId } = userRoleData;
  const docId = `${userId}_${roleId}_${guildId}`;

  try {
    const existing = await coll.findOne({ _id: docId });
    if (!existing) {
      await coll.insertOne({
        _id: docId,
        userId,
        roleId,
        guildId,
        roleAssignedAt: userRoleData.roleAssignedAt || now,
        createdAt: now,
        updatedAt: now,
        removedAt: userRoleData.removedAt,
      });
    } else {
      await coll.updateOne(
        { _id: docId },
        {
          $set: {
            updatedAt: now,
            ...(userRoleData.roleAssignedAt && { roleAssignedAt: userRoleData.roleAssignedAt }),
            ...(userRoleData.removedAt !== undefined && { removedAt: userRoleData.removedAt }),
          },
        },
      );
    }
  } catch (err) {
    console.error("[upsertUserRole] Error:", err);
    throw err;
  }
}

export async function getGuildMemberUsernames(guildId: string): Promise<string[]> {
  const db = await getMongoDatabase();
  const coll = db.collection<UserDoc>("users");
  try {
    const rows = await coll.find({ guildIds: guildId }, { projection: { username: 1, discriminator: 1 } }).toArray();
    return rows.map((r: UserDoc) => r.username);
  } catch (err) {
    console.error("[getGuildMemberUsernames] Error:", err);
    throw err;
  }
}

export async function insertVote(threadId: string, voterId: string): Promise<void> {
  const db = await getMongoDatabase();
  const coll = db.collection<BaseVote>("nomination_votes");
  const now = new Date();
  try {
    await coll.insertOne({
      threadId,
      voterId,
      voteTimestamp: now,
      createdAt: now,
    });
  } catch (err) {
    console.error("[insertVote] Error:", err);
    throw err;
  }
}

export async function getThreadVotes(threadId: string): Promise<string[]> {
  const db = await getMongoDatabase();
  const coll = db.collection<VoteDoc>("nomination_votes");
  try {
    const votes = await coll.find({ threadId }, { projection: { voterId: 1 } }).toArray();
    return votes.map((r: VoteDoc) => r.voterId);
  } catch (err) {
    console.error("[getThreadVotes] Error:", err);
    throw err;
  }
}

export async function insertNewVotingThread(threadId: string, nominatorId: string, nomineeId: string, roleName: string): Promise<void> {
  const db = await getMongoDatabase();
  const threads = db.collection<VotingThreadDoc>("nomination_threads");
  const roles = db.collection<BaseRole>("guild_roles");
  const now = new Date();
  try {
    const roleDoc = await roles.findOne({ roleName, guildId: { $exists: true } });
    const roleId = roleDoc ? roleDoc._id : `unknown_for_${roleName}`;
    await threads.updateOne(
      { _id: threadId },
      {
        $setOnInsert: { createdAt: now },
        $set: {
          nominatorId,
          nomineeId,
          roleId,
          roleName,
          voteCount: 0,
          status: "OPEN",
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[insertNewVotingThread] Error:", err);
    throw err;
  }
}

export async function getVotingThreadCreatedAt(threadId: string): Promise<Date | null> {
  const db = await getMongoDatabase();
  const coll = db.collection<VotingThreadDoc>("nomination_threads");
  try {
    const doc = await coll.findOne({ _id: threadId });
    return doc ? doc.createdAt : null;
  } catch (err) {
    console.error("[getVotingThreadCreatedAt] Error:", err);
    throw err;
  }
}

export async function markVotingThreadClosed(threadId: string): Promise<void> {
  const db = await getMongoDatabase();
  const coll = db.collection<VotingThreadDoc>("nomination_threads");
  try {
    await coll.updateOne({ _id: threadId }, { $set: { status: "CLOSED", updatedAt: new Date() } });
  } catch (err) {
    console.error("[markVotingThreadClosed] Error:", err);
    throw err;
  }
}

export async function incrementThreadVoteCount(threadId: string): Promise<void> {
  const db = await getMongoDatabase();
  const coll = db.collection<VotingThreadDoc>("nomination_threads");
  try {
    await coll.updateOne({ _id: threadId }, { $inc: { voteCount: 1 }, $set: { updatedAt: new Date() } });
  } catch (err) {
    console.error("[incrementThreadVoteCount] Error:", err);
    throw err;
  }
}

export async function getThreadVoteCount(threadId: string): Promise<number | null> {
  const db = await getMongoDatabase();
  const coll = db.collection<VotingThreadDoc>("nomination_threads");
  try {
    const doc = await coll.findOne({ _id: threadId }, { projection: { voteCount: 1 } });
    return doc ? doc.voteCount : null;
  } catch (err) {
    console.error("[getThreadVoteCount] Error:", err);
    throw err;
  }
}

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
  const coll = db.collection<BaseVotingThread>("nomination_threads");
  try {
    const cursor = coll.find({
      $or: [{ status: "OPEN" }, { status: "" }, { status: { $exists: false } }],
    });
    const docs = await cursor.toArray();
    return docs.map((d) => ({
      thread_id: d._id,
      role_name: d.roleName,
      nominee_id: d.nomineeId,
      nominator_id: d.nominatorId,
      vote_count: d.voteCount,
      created_at: d.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("[getOpenVotingThreads] Error:", err);
    throw err;
  }
}

export async function getExactGuildMemberUsernames(guildId: string): Promise<string[]> {
  const db = await getMongoDatabase();
  const coll = db.collection<UserDoc>("users");
  try {
    const rows: UserDoc[] = await coll.find({ guildIds: [guildId] }, { projection: { username: 1 } }).toArray();
    return rows.map((r) => r.username);
  } catch (err) {
    console.error("[getExactGuildMemberUsernames] Error:", err);
    throw err;
  }
}

export async function getRoleCounts(guild: Guild): Promise<RoleStats> {
  const db = await getMongoDatabase();
  const rolesColl = db.collection<RoleDoc>("guild_roles");
  const userRolesColl = db.collection<BaseUserRole>("user_roles");
  const roleNames = ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot", "SCF Category Delegate", "SCF Project"];
  const guildId = guild.id;
  const results: Record<string, number> = {
    "SCF Verified": 0,
    "SCF Pathfinder": 0,
    "SCF Navigator": 0,
    "SCF Pilot": 0,
    "SCF Category Delegate": 0,
    "SCF Project": 0,
  };
  try {
    for (const rn of roleNames) {
      const matchingRoles = await rolesColl.find({ guildId, roleName: rn }).toArray();
      let total = 0;
      for (const r of matchingRoles) {
        const count = await userRolesColl.countDocuments({ roleId: r._id, guildId });
        total += count;
      }
      results[rn] = total;
    }
    return {
      verified: results["SCF Verified"],
      pathfinder: results["SCF Pathfinder"],
      navigator: results["SCF Navigator"],
      pilot: results["SCF Pilot"],
      categoryDelegate: results["SCF Category Delegate"],
      project: results["SCF Project"],
    };
  } catch (err) {
    console.error("[getRoleCounts] Error:", err);
    throw err;
  }
}

// Map to store cache of members by guildId
//const membersCacheByGuild = new Map<string, { data: MemberInfo[], timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

export async function getAllMembersAgg1(guildId: string): Promise<MemberInfo[]> {
  // Check if we have cached data that's still valid
  if (globalThis.membersCacheByGuild === undefined) {
    globalThis.membersCacheByGuild = new Map<string, { data: MemberInfo[]; timestamp: number }>();
    console.log("[getAllMembersAgg] Initialized global cache for guild members.");
  }
  const cached = globalThis.membersCacheByGuild.get(guildId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`[getAllMembersAgg] Using cached members for guild ${guildId}, age: ${Math.floor((now - cached.timestamp) / 1000)} seconds`);
    return cached.data;
  }

  console.log(`[getAllMembersAgg] Cache miss or expired for guild ${guildId}, running aggregation pipeline`);

  const pipeline = [
    {
      $match: {
        guildIds: { $in: [guildId] },
        user: { $exists: true, $ne: null },
        discordProfile: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "user_roles",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$userId", "$$uid"] }, { $eq: ["$guildId", guildId] }],
              },
            },
          },
        ],
        as: "userRoles",
      },
    },
    {
      $unwind: { path: "$userRoles", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "guild_Roles",
        localField: "userRoles.roleId",
        foreignField: "_id",
        as: "roleDoc",
      },
    },
    {
      $unwind: { path: "$roleDoc", preserveNullAndEmptyArrays: true },
    },
    {
      $group: {
        _id: "$_id",
        user: { $first: "$user" },
        discordProfile: { $first: "$discordProfile" },
        mappedRoles: {
          $push: {
            $cond: [
              { $ifNull: ["$roleDoc", false] },
              {
                name: "$roleDoc.roleName",
                // If roleName starts with "SCF ", remove the first four characters; otherwise use roleName as is.
                shortname: {
                  $cond: [{ $eq: [{ $substrCP: ["$roleDoc.roleName", 0, 4] }, "SCF "] }, { $substrCP: ["$roleDoc.roleName", 4, { $strLenCP: "$roleDoc.roleName" }] }, "$roleDoc.roleName"],
                },
                obtained: "$userRoles.roleAssignedAt",
              },
              "$$REMOVE",
            ],
          },
        },
      },
    },
    {
      $addFields: {
        username: {
          $cond: [{ $eq: [{ $toInt: "$user.discriminator" }, 0] }, "$user.username", { $concat: ["$user.username", "#", "$user.discriminator"] }],
        },
        memberSince: { $min: "$mappedRoles.obtained" },
        joinedDiscord: { $toDate: "$user.createdTimestamp" },
        joinedStellarDevelopers: { $ifNull: ["$discordProfile.joinedAt", "$user.createdTimestamp"] },
        avatar: "$discordProfile.displayAvatarURL",
        profileDescription: "",
      },
    },
    {
      $project: {
        discordId: "$_id",
        username: 1,
        memberSince: 1,
        joinedDiscord: 1,
        roles: "$mappedRoles",
        profileDescription: 1,
        joinedStellarDevelopers: 1,
        avatar: 1,
      },
    },
  ];

  const db = await getMongoDatabase();
  const collections = await db.listCollections({ name: "materialized_members" }).toArray();
  if (collections.length === 0) {
    console.log("Creating materialized_members collection...");
    await db.createCollection("materialized_members");
  }
  await db.collection("materialized_members").createIndex({ discordId: 1 });

  const usersColl = db.collection<UserDoc>("users");
  await usersColl.createIndex({ guildIds: 1 });
  await db.collection("user_roles").createIndex({ userId: 1, guildId: 1 });
  await db.collection("user_roles").createIndex({ userId: 1, guildId: 1, roleId: 1 });
  const members: MemberInfo[] = await usersColl.aggregate<MemberInfo>(pipeline).toArray();

  // Update cache
  globalThis.membersCacheByGuild.set(guildId, { data: members, timestamp: now });

  return members;
}

export async function getAllMembers(guildId: string): Promise<MemberInfo[]> {
  const db = await getMongoDatabase();
  const usersColl = db.collection<UserDoc>("users");
  const userRolesColl = db.collection<UserRoleDoc>("user_roles");
  const rolesColl = db.collection<RoleDoc>("guild_roles");
  try {
    const users = await usersColl
      .find({
        guildIds: guildId,
        user: { $exists: true, $ne: null },
      })
      .toArray();
    const members: MemberInfo[] = [];

    for (const user of users) {
      const userRoleDocs = await userRolesColl.find({ userId: user._id, guildId }).toArray();
      const mappedRoles: MemberRoleInfo[] = [];
      if (!user.discordProfile) {
        console.warn(`User ${user._id} has no discordProfile; skipping.`);
        continue;
      }
      for (const userRole of userRoleDocs) {
        const roleDoc = await rolesColl.findOne({ _id: userRole.roleId });
        if (!roleDoc) continue;

        const shortName = roleDoc.roleName.startsWith("SCF ") ? roleDoc.roleName.substring(4) : roleDoc.roleName;
        mappedRoles.push({
          name: roleDoc.roleName,
          shortname: shortName,
          obtained: userRole.roleAssignedAt,
        });
      }

      const username = Number(user.user.discriminator) === 0 ? user.user.username : `${user.user.username}#${user.user.discriminator}`;

      const verifiedSince = mappedRoles.map((r) => r.obtained).sort()[0] || null;
      members.push({
        _id: user._id,
        discordId: user._id,
        username: username,
        memberSince: verifiedSince,
        joinedDiscord: new Date(user.user.createdTimestamp),
        roles: mappedRoles,
        profileDescription: "",
        joinedStellarDevelopers: user.discordProfile.joinedAt ?? user.user.createdTimestamp,
        avatar: user.discordProfile.displayAvatarURL,
        guildId: user.guildIds[0],
      });
    }
    return members;
  } catch (err) {
    console.error("[getAllMembersForGuild] Error:", err);
    throw err;
  }
}

export async function upsertInterestedMember(memberId: string, guildId: string, interestedRole: string, reason: string): Promise<void> {
  const db = await getMongoDatabase();
  const coll = db.collection<InterestedMemberDoc>("interested_members");
  const now = new Date();
  const docId = `${memberId}_${interestedRole}_${guildId}`;
  try {
    await coll.updateOne(
      { _id: docId },
      {
        $setOnInsert: {
          createdAt: now,
          memberId,
          guildId,
          interestedRole,
          interestedSince: now,
        },
        $set: { reason, updatedAt: now },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[upsertInterestedMember] Error:", err);
    throw err;
  }
}

export async function getInterestedMembersForGuild(guildId: string): Promise<InterestedMemberDoc[]> {
  const db = await getMongoDatabase();
  const coll = db.collection<InterestedMemberDoc>("interested_members");
  try {
    return coll.find({ guildId }).toArray();
  } catch (err) {
    console.error("[getInterestedMembersForGuild] Error:", err);
    throw err;
  }
}

/*
export async function fetchAssetsFromDb(db: Db, assetLimit: number): Promise<SqAsset[]> {
  const assets = await db.collection<BadgeAsset>('badges').find().limit(assetLimit).toArray();
  return assets.map((asset) => ({
    code: asset.code,
    issuer: asset.issuer
  }));
}


export async function assetHoldersForBadge(db: Db, asset: SqAsset): Promise<Badge[]> {
  let allHolders: Badge[] = [];
  const assetData = await db.collection('badges').findOne({ code: asset.code, issuer: asset.issuer });

  let nextUrl: string | null = assetData?.lastMarkUrlHolders ?
    `${BASE_URL}${assetData.lastMarkUrlHolders}` :
    `${BASE_URL}/explorer/public/asset/${asset.code}-${asset.issuer}/holders?order=desc&limit=200`;
  // cursor isnt working properly so lets just get them all for now.
  //nextUrl = `${BASE_URL}/explorer/public/asset/${asset.code}-${asset.issuer}/holders?order=desc&limit=200`;
  let badgeIndex = 1;

  while (nextUrl) {
    try {
      console.log(`Fetching holders for ${asset.code}-${asset.issuer} from ${nextUrl}`);
      const data: any = await fetchWithRetry(nextUrl);

      const holders = data._embedded.records.map((record: any) => ({
        _id: new ObjectId(),
        index: badgeIndex++,
        assetCode: asset.code,
        assetIssuer: asset.issuer,
        owner: record.account,
        balance: record.balance,
        transactions: [{ badgeId: assetData?._id, tx: '' }], // Placeholder for transaction
      }));

      allHolders = allHolders.concat(holders);

      if (data._embedded.records.length < 200) {
        nextUrl = null;
      } else {
        nextUrl = BASE_URL + data._links.next.href;
      }

      await db.collection('badges').updateOne(
        { code: asset.code, issuer: asset.issuer },
        { $set: { lastMarkUrlHolders: data._links.self.href } }
      );

      await sleep(500);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Not Found')) {
        console.warn(`No holders found for asset ${asset.code}-${asset.issuer}`);
        break;
      } else {
        throw err; // Re-throw unexpected errors
      }
    }
  }

  return allHolders;
}
*/
/**
 * Gets all badge holders for all assets in the database
 */
/*
export async function getAllHoldersAllAssets(db: Db): Promise<Badge[]> {
  return runHolderAggregation(db);
}
*/
/**
 * Gets all badge holders for specific assets
 */
/*
export async function getAllHoldersForAssets(db: Db, assets: Asset[]): Promise<Badge[]> {
  if (!assets || assets.length === 0) {
    return [];
  }
  
  // Prepare filters for the assets
  const assetFilters = assets.map(asset => ({
    code: asset.code,
    issuer: asset.issuer
  }));
  
  return runHolderAggregation(db, assetFilters);
}
*/
/**
 * Runs the MongoDB aggregation pipeline to get badge holders
 */
/*
async function runHolderAggregation(db: Db, assetFilters?: Array<{code: string, issuer: string}>): Promise<Badge[]> {
  // Build the pipeline
  const pipeline = [
    // First stage: Match badges (optional filter)
    ...(assetFilters && assetFilters.length > 0 ? [
      { $match: { $or: assetFilters } }
    ] : []),
    
    // Join with BadgeHolders collection
    {
      $lookup: {
        from: 'BadgeHolders',
        localField: '_id',
        foreignField: 'badges.badgeId',
        as: 'holders'
      }
    },
    
    // Unwind the holders array to get one document per holder
    { $unwind: '$holders' },
    
    // Unwind badges in each holder document to match only relevant badges
    { $unwind: '$holders.badges' },
    
    // Filter to keep only the badge relationship we're looking for
    {
      $match: {
        '$expr': { $eq: ['$_id', '$holders.badges.badgeId'] }
      }
    },
    
    // Format the output
    {
      $project: {
        _id: '$_id',
        index: '$index',
        assetCode: '$code',
        assetIssuer: '$issuer',
        owner: '$holders.owner',
        balance: '$balance',
        transactions: [{ 
          badgeId: '$_id', 
          tx: '$holders.badges.tx' 
        }]
      }
    }
  ];
  
  // Run the aggregation
  return db.collection('badges').aggregate(pipeline).toArray() as Promise<Badge[]>;
}
*/

/**
 * Ingests asset holders into the database
 * @param db The MongoDB database connection
 * @param assets Optional list of assets to ingest. If not provided, all assets will be fetched from the database.
 * @returns A promise that resolves to an array of Badge objects representing the holders.
 */

/*
export async function ingestAssetHolders(db: Db, assets?: Asset[]): Promise<Badge[]> {
  // If no assets provided, fetch all assets from database
  if (!assets || assets.length === 0) {
    assets = await db.collection<BadgeAsset>('badges').find().toArray().then(badges => 
      badges.map(badge => ({ code: badge.code, issuer: badge.issuer }))
    );
  }
  if (!assets || assets.length === 0) {
    console.log('no assets provided, or found in database, parsing toml file for assets.')
    await parseTomlFiles();
    assets = await db.collection<BadgeAsset>('badges').find().toArray().then(badges => 
      badges.map(badge => ({ code: badge.code, issuer: badge.issuer }))
    );
  }
  if (!assets || assets.length === 0) {
    throw new Error('No assets provided and unable to fetch from database.');
  }
  
  const allHolders: Badge[] = [];
  for (const asset of assets) {
    // Fetch holders from external API
    const holders = await assetHoldersForBadge(db, asset);

    // Store holders in database
    for (const holder of holders) {
      // Check if holder already exists
      const existingHolder = await db.collection('BadgeHolders').findOne({ owner: holder.owner });

      if (!existingHolder) {
        // Create new holder entry
        await db.collection('BadgeHolders').insertOne({
          owner: holder.owner,
          badges: [{ badgeId: holder.transactions[0].badgeId, tx: '' }],
        });
      } else {
        // Update existing holder entry
        const existingBadges = existingHolder.badges || [];
        let badgeExists = false;
        
        for (const existingBadge of existingBadges) {
          if (existingBadge.badgeId.equals(holder.transactions[0].badgeId)) {
            // Badge already exists, no need to update
            badgeExists = true;
            break;
          }
        }
        
        if (!badgeExists) {
          // Add new badge to existing holder
          await db.collection('BadgeHolders').updateOne(
            { owner: holder.owner },
            { $push: { badges: { badgeId: holder.transactions[0].badgeId, tx: '' } } }
          );
        }
      }

      allHolders.push(holder);
    }
  }

  return allHolders;
}
*/
