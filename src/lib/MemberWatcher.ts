// materializedMembers.ts

import { Db } from "mongodb";
import { getMongoDatabase } from "@/discord-bot/mongo-db";
import { MemberInfo, UserDoc } from "@/discord-bot/types";

// TTL for an in-memory cache (if you wish to add caching later)
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Use globalThis to not deal with this stuff in dev mode.
if (globalThis.membersWatcherRunning === undefined) {
  globalThis.membersWatcherRunning = false;
}
if (globalThis.refreshScheduledMembers === undefined) {
  globalThis.refreshScheduledMembers = false;
}

/**
 * Ensure the materialized_members collection exists.
 * If it doesn't, create it.
 * Then create a unique index on discordId (join field for $merge)
 * and an index on guildId for faster querying.
 */
async function ensureMaterializedMembersCollection(db: Db): Promise<void> {
  console.log("[ensureMaterializedMembersCollection] checking for materialized_members collection");
  const collections = await db.listCollections({ name: "materialized_members" }).toArray();
  if (collections.length === 0) {
    console.log("Creating materialized_members collection...");
    await db.createCollection("materialized_members");
  }
  const materialized = db.collection("materialized_members");
  // Create a unique index on discordId (the join field) and an index on guildId.
  await materialized.createIndex({ discordId: 1 }, { unique: true });
  await materialized.createIndex({ guildId: 1 });
}

/**
 * Runs an aggregation pipeline on the users collection to materialize
 * a view of members for a given guild. Uses $merge to update the
 * materialized_members collection incrementally.
 */
export async function refreshMembersMaterializedView(guildId: string): Promise<void> {
  const db = await getMongoDatabase();
  const usersColl = db.collection<UserDoc>("users");

  // Ensure the materialized_members collection exists.
  await ensureMaterializedMembersCollection(db);

  // Set up indexes on source collections (idempotent operations).
  await usersColl.createIndex({ guildIds: 1 });
  await db.collection("user_roles").createIndex({ userId: 1, guildId: 1 });

  // Define the aggregation pipeline (replicating your original logic).
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
    { $unwind: { path: "$userRoles", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "guild_roles",
        localField: "userRoles.roleId",
        foreignField: "_id",
        as: "roleDoc",
      },
    },
    { $unwind: { path: "$roleDoc", preserveNullAndEmptyArrays: true } },
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
        discordId: "$_id", // This is the join field.
        username: 1,
        memberSince: 1,
        joinedDiscord: 1,
        roles: "$mappedRoles",
        profileDescription: 1,
        joinedStellarDevelopers: 1,
        avatar: 1,
        guildId: { $literal: guildId }, // Embed guildId for querying.
      },
    },
    // Merge the aggregation results into the materialized_members collection.
    {
      $merge: {
        into: "materialized_members",
        on: "discordId",
        whenMatched: "replace",
        whenNotMatched: "insert",
      },
    },
  ];

  // Execute the aggregation pipeline.
  await usersColl.aggregate(pipeline).toArray();
}

/**
 * Starts a watcher on the underlying collections so that when a change occurs,
 * the materialized_members view for the given guild is refreshed.
 * This function is a singleton—only one watcher runs no matter how many times it's called.
 */
export async function startMembersWatcher(guildId: string): Promise<void> {
  console.log("[startMembersWatcher] getting members watcher");
  if (globalThis.membersWatcherRunning) {
    console.log("[startMembersWatcher] already running");
    return;
  } // Already running.
  globalThis.membersWatcherRunning = true;

  const db = await getMongoDatabase();
  await ensureMaterializedMembersCollection(db);

  // Create indexes on source collections (idempotent).
  await db.collection("users").createIndex({ guildIds: 1 });
  await db.collection("user_roles").createIndex({ userId: 1, guildId: 1 });
  // Ensure our target collection indexes.
  await db.collection("materialized_members").createIndex({ discordId: 1 }, { unique: true });
  await db.collection("materialized_members").createIndex({ guildId: 1 });

  // Do an initial materialization.
  await refreshMembersMaterializedView(guildId);

  const collectionsToWatch = ["users", "user_roles", "guild_roles"];

  collectionsToWatch.forEach((collectionName) => {
    const changeStream = db.collection(collectionName).watch([{ $match: { operationType: { $in: ["insert", "update", "delete"] } } }], { collation: { locale: "en", strength: 1 } });

    changeStream.on("change", () => {
      if (!globalThis.refreshScheduledMembers) {
        globalThis.refreshScheduledMembers = true;
        console.log(`Change detected in ${collectionName} for guild ${guildId}, scheduling materialized view refresh...`);
        setTimeout(async () => {
          await refreshMembersMaterializedView(guildId);
          console.log(`Materialized members view for guild ${guildId} updated.`);
          globalThis.refreshScheduledMembers = false;
        }, 60000); // 1-minute debounce
      }
    });
  });
}

/**
 * Query the materialized view for a given guild.
 * This function ensures that the members watcher is started (singleton)
 * on its first call.
 */
export async function getAllMembersAgg(guildId: string): Promise<MemberInfo[]> {
  console.log("[getAllMembersAgg] getting members for guild", guildId);
  // Start the watcher on the first call if it's not already running.
  startMembersWatcher(guildId).catch((err) => {
    console.error("Error starting members watcher:", err);
  });

  const db = await getMongoDatabase();
  const materializedColl = db.collection<MemberInfo>("materialized_members");
  const members: MemberInfo[] = await materializedColl.find({ guildId }).toArray();
  console.log(`[getAllMembersAgg] found ${members.length} members for guild ${guildId} THE FIRST MEMBER IS \n ${JSON.stringify(members[0])}`);
  return members;
}
