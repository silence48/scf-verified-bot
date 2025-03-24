import { Db, Document, ObjectId } from "mongodb";
import { getMongoDatabase } from "@/discord-bot/mongo-db";

import { BadgeAsset, SCFUser } from "@/discord-bot/types";
import { Transaction } from "@/types/discord-bot";
globalThis.badgeWatcherRunning = false;

// Using type intersection instead of interface extension to avoid property conflict
interface TransactionBadge extends Omit<Transaction, "_id" | "badge_ids">, Omit<BadgeAsset, "_id"> {
  _id: string | ObjectId; // badge objectid as a string.
  badge_ids: ObjectId[] | string[]; // badge_ids as string[] instead of ObjectId[]
}
type precomputedUserBadge = Omit<SCFUser, "_id"> & Omit<Transaction, "_id">;
export interface PrecomputedBadge extends precomputedUserBadge, Document {
  _id: string; // account id
  badges: TransactionBadge[];
  useroid: ObjectId | string; // is an objectid.
}

async function setupIndexes(db: Db) {
  const indexPromises = [
    db.collection<Transaction>("transactions").createIndex({ account_id: 1 }),
    db.collection<BadgeAsset>("badges").createIndex({ _id: 1 }),
    db.collection<SCFUser>("SCF_Users").createIndex({ publicKey: 1 }),
    db.collection<SCFUser>("SCF_Users").createIndex({ publicKeys: 1 }),
  ];
  indexPromises.push(db.collection<PrecomputedBadge>("precomputedBadges").createIndex({ _id: 1 }));

  await Promise.all(indexPromises);
}

async function refreshMaterializedView(db: Db) {
  await db
    .collection<Transaction>("transactions")
    .aggregate([
      {
        $lookup: {
          from: "badges",
          localField: "badge_ids",
          foreignField: "_id",
          as: "badge",
        },
      },
      { $unwind: { path: "$badge", preserveNullAndEmptyArrays: true } },
      { $replaceRoot: { newRoot: { $mergeObjects: ["$$ROOT", "$badge"] } } },
      { $project: { badge: 0 } },
      {
        $group: {
          _id: "$account_id",
          badges: { $push: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "SCF_Users",
          localField: "_id",
          foreignField: "publicKey",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "SCF_Users",
          let: { accountId: "$_id", userMatched: "$user" },
          pipeline: [{ $match: { $expr: { $and: [{ $in: ["$$accountId", { $ifNull: ["$publicKeys", []] }] }, { $eq: ["$$userMatched", null] }] } } }, { $project: { _id: 0 } }],
          as: "userAlt",
        },
      },
      { $unwind: { path: "$userAlt", preserveNullAndEmptyArrays: true } },
      { $addFields: { user: { $ifNull: ["$user", "$userAlt"] } } },
      { $project: { userAlt: 0 } },
      { $addFields: { "user.useroid": "$user._id" } },
      { $project: { "user._id": 0 } },
      { $replaceRoot: { newRoot: { $mergeObjects: ["$$ROOT", "$user"] } } },
      { $project: { user: 0 } },
      {
        $merge: {
          into: "precomputedBadges",
          on: "_id",
          whenMatched: "replace",
          whenNotMatched: "insert",
        },
      },
    ])
    .toArray();
  console.log(`[Badges - refreshMaterializedView] precomputedBadges refreshed with ${await db.collection<PrecomputedBadge>("precomputedBadges").countDocuments()} documents`);
}

export async function startBadgeWatcher() {
  console.log("[startBadgeWatcher] Starting badge watcher...");
  if (globalThis.badgeWatcherRunning) return;
  console.log("[startBadgeWatcher] badge watcher already running");
  globalThis.badgeWatcherRunning = true;

  const db = await getMongoDatabase();
  // u might need to create the collection on first run? i'm not sure.
  //const collectionsList = await db.listCollections({ name: "precomputedBadges" }).toArray();
  //const collectionExists = collectionsList.length > 0;
  setupIndexes(db);
  refreshMaterializedView(db);

  const collections = ["transactions", "badges", "SCF_Users"];

  collections.forEach((collectionName) => {
    const changeStream = db.collection(collectionName).watch([{ $match: { operationType: { $in: ["insert", "update", "delete"] } } }], { collation: { locale: "en", strength: 1 } });

    changeStream.on("change", () => {
      if (!globalThis.refreshScheduledBadges) {
        globalThis.refreshScheduledBadges = true;
        console.log(`Change detected in ${collectionName}, scheduling materialized view refresh...`);
        setTimeout(async () => {
          await refreshMaterializedView(db);
          console.log("Materialized view updated.");
          globalThis.refreshScheduledBadges = false;
        }, 60000); // 1-minute debounce
      }
    });
  });
}

/**
 * This returns all aggregated data (i.e. all "members") with certain badge fields excluded.
 */
export async function getAllPrecomputedBadges(): Promise<PrecomputedBadge[]> {
  console.log("[getAllPrecomputedBadges] Starting badge watcher...");
  await startBadgeWatcher();
  const db: Db = await getMongoDatabase();
  const precomputedColl = db.collection<PrecomputedBadge>("precomputedBadges");

  // Use projection to exclude specific fields from badge objects
  const badges = await precomputedColl
    .find<PrecomputedBadge>(
      {},
      {
        projection: {
          "badges.body": 0,
          "badges.meta": 0,
          "badges.result": 0,
        },
      },
    )
    .toArray();

  // Convert ObjectId to string for each document
  console.time("[getAllPrecomputedBadges]mappingtostrings");
  const mappedbadges = badges.map((doc) => {
    // Convert useroid to string if it's not already
    if (doc.useroid && typeof doc.useroid !== "string") {
      doc.useroid = doc.useroid.toString();
    }

    // Convert each badge._id to string if not already
    if (doc.badges && Array.isArray(doc.badges)) {
      doc.badges = doc.badges.map((badge) => {
        if (badge._id && typeof badge._id !== "string") {
          badge._id = badge._id.toString();
        }
        if (badge.badge_ids && Array.isArray(badge.badge_ids)) {
          badge.badge_ids = badge.badge_ids.map((badgeId) => {
            if (typeof badgeId === "string") return badgeId;
            // Convert ObjectId or any other type to string
            return badgeId.toString();
          });
        }
        return badge;
      });
    }

    return doc;
  });
  console.timeEnd("[getAllPrecomputedBadges]mappingtostrings");
  return mappedbadges;
}

/**
 * Retrieves a single precomputed badge document by its account ID.
 * The _id field in precomputedBadges is the account_id.
 * @param accountId The account ID (string) to filter by.
 */
export async function getPrecomputedBadgeByAccountId(accountId: string) {
  const db: Db = await getMongoDatabase();
  const precomputedColl = db.collection<PrecomputedBadge>("precomputedBadges");
  return await precomputedColl.findOne({ _id: accountId });
}

export async function getBadgeData(accountId: string) {
  if (!globalThis.badgeWatcherRunning) {
    await startBadgeWatcher();
  }
  return queryBadgeByAccountId(accountId);
}
export async function queryBadgeByAccountId(accountId: string) {
  const db = await getMongoDatabase();
  return db.collection<PrecomputedBadge>("precomputedBadges").findOne({ _id: accountId });
}
