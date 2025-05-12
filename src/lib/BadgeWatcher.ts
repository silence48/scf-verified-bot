import { Db, Document, ObjectId } from "mongodb";
import { getMongoDatabase } from "@/discord-bot/mongo-db";

import { BadgeAsset, SCFUser } from "@/discord-bot/types";
import { Transaction } from "@/types/discord-bot";
import { CollectionTypeMap } from "../../global";
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
      // First unwind the badge_ids array to allow for proper lookup
      {
        $unwind: {
          path: "$badge_ids",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Perform the lookup with unwound badge_ids
      {
        $lookup: {
          from: "badges",
          localField: "badge_ids",
          foreignField: "_id",
          as: "badge",
        },
      },
      // After lookup, convert IDs to strings and rename badge_ids to badge_id
      {
        $addFields: {
          _id: {
            $toString: "$_id",
          },
          badge_id: {
            $toString: "$badge_ids",
          },
        },
      },
      // Remove the original badge_ids field
      {
        $project: {
          badge_ids: 0,
          body: 0,
          meta: 0,
          result: 0,
        },
      },
      // Unwind the badge array (should be a single item)
      {
        $unwind: {
          path: "$badge",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set:
          /**
           * field: The field name
           * expression: The expression.
           */
          {
            code: "$badge.code",
            issue_date: "$badge.issue_date",
            image: "$badge.image",
            difficulty: "$badge.difficulty",
            category_broad: "$badge.category_broad",
          },
      },
      {
        $project: {
          badge: 0,
        },
      },
      {
        $group: {
          _id: "$account_id",
          badges: {
            $push: "$$ROOT",
          },
        },
      },
      // Remove unwanted fields before grouping
      // {
      //   $project: {}
      // }
      {
        $lookup: {
          from: "SCF_Users",
          localField: "_id",
          foreignField: "publicKey",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "SCF_Users",
          let: {
            accountId: "$_id",
            userMatched: "$user",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $in: [
                        "$$accountId",
                        {
                          $ifNull: ["$publicKeys", []],
                        },
                      ],
                    },
                    {
                      $eq: ["$$userMatched", null],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
              },
            },
          ],
          as: "userAlt",
        },
      },
      {
        $unwind: {
          path: "$userAlt",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          user: {
            $ifNull: ["$user", "$userAlt"],
          },
        },
      },
      {
        $project: {
          userAlt: 0,
        },
      },
      {
        $addFields: {
          "user.useroid": {
            $toString: "$user._id",
          },
        },
      },
      {
        $project: {
          "user._id": 0,
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$$ROOT", "$user"],
          },
        },
      },
      {
        $project: {
          user: 0,
        },
      },
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

  // Initialize the changeStreams object if it doesn't exist
  if (!globalThis.changeStreams) {
    globalThis.changeStreams = {};
  }

  // Check if all change streams are already running
  const streamsRunning = ["transactions", "badges", "SCF_Users"].every((name) => globalThis.changeStreams[name as keyof CollectionTypeMap]);

  if (streamsRunning) {
    console.log("[startBadgeWatcher] Change streams already running");
    return;
  }

  globalThis.badgeWatcherRunning = true;

  const db = await getMongoDatabase();
  await setupIndexes(db);
  await refreshMaterializedView(db);

  // Set up typed change streams for each collection
  setupChangeStream<"transactions">(db, "transactions");
  setupChangeStream<"badges">(db, "badges");
  setupChangeStream<"SCF_Users">(db, "SCF_Users");
}

function setupChangeStream<K extends keyof CollectionTypeMap>(db: Db, collectionName: K) {
  // Skip if this change stream is already running
  if (globalThis.changeStreams[collectionName]) {
    console.log(`Change stream for ${collectionName} already running`);
    return;
  }

  console.log(`Setting up change stream for ${collectionName}`);
  const changeStream = db
    .collection<CollectionTypeMap[K]>(collectionName)
    .watch([{ $match: { operationType: { $in: ["insert", "update", "delete"] } } }], { collation: { locale: "en", strength: 1 } });

  // Store the change stream in the global object
  globalThis.changeStreams[collectionName] = changeStream;

  changeStream.on("change", () => {
    if (!globalThis.refreshScheduledBadges) {
      globalThis.refreshScheduledBadges = true;
      console.log(`Change detected in ${collectionName}, scheduling materialized view refresh...`);
      setTimeout(async () => {
        const freshDb = await getMongoDatabase();
        await refreshMaterializedView(freshDb);
        console.log("Materialized view updated.");
        globalThis.refreshScheduledBadges = false;
      }, 60000); // 1-minute debounce
    }
  });

  // Handle errors and reconnection
  changeStream.on("error", (error) => {
    console.error(`Error in ${collectionName} change stream:`, error);
    delete globalThis.changeStreams[collectionName];

    // Try to reconnect after a delay
    setTimeout(() => setupChangeStream(db, collectionName), 5000);
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
