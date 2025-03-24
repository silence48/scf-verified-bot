import { SqAsset } from "@/discord-bot/types";
import { Db } from "mongodb";
import { Badge, BadgeHolder, fetchWithRetry } from "../stellarQuest";
import { sleep } from "../utils";
import { parseTomlFiles } from "../tomlParser";

const _API_KEY = process.env.SXX_API_KEY;
const BASE_URL = "https://api.stellar.expert";

export async function fetchAndUpdateAssetHolders(db: Db, asset: SqAsset) {
  if (globalThis.holders_refreshing) {
    console.log("Skipping refreshAllAssetHolders: Already running.");
    return;
  }

  const badgesCollection = db.collection("badges");
  const badgeHoldersCollection = db.collection("BadgeHolders");
  const holdersForBadgesCollection = db.collection("HoldersForBadges");

  const assetData = await badgesCollection.findOne({ code: asset.code, issuer: asset.issuer });

  if (!assetData) {
    console.log(`Asset ${asset.code}-${asset.issuer} not found in badges collection.`);
    throw new Error("Badge not found");
  }

  // Check if 24 hours have passed since last update
  const currentTime = new Date();
  const lastUpdated = assetData.lastUpdatedHolders ? new Date(assetData.lastUpdatedHolders) : null;

  if (lastUpdated && currentTime.getTime() - lastUpdated.getTime() < 24 * 60 * 60 * 1000) {
    console.log(`Skipping refresh for ${asset.code}-${asset.issuer}: Last updated less than 24 hours ago at ${lastUpdated}`);
    return;
  }

  globalThis.holders_refreshing = true;
  console.log("assetdata lastMarkUrlHolders is", assetData.lastMarkUrlHolders);

  let nextUrl = assetData.lastMarkUrlHolders ? BASE_URL + assetData.lastMarkUrlHolders : `${BASE_URL}/explorer/public/asset/${asset.code}-${asset.issuer}/holders?order=asc&limit=200`;

  const badgeId = assetData._id;

  // Holders set for fast lookups and to avoid duplicates
  const holdersSet = new Set<string>();

  try {
    while (nextUrl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await fetchWithRetry(nextUrl);
      if (data === false) {
        console.log(`🚨 Received 404 not found error for ${asset.code}-${asset.issuer}. Skipping this asset.`);
        return; // Exit the function to skip to the next asset
      }
      if (data === null) {
        console.log(`🚨 Received 400 error for ${asset.code}-${asset.issuer}. Resetting cursor and restarting.`);
        // Reset nextUrl to the default URL (no cursor)
        nextUrl = `${BASE_URL}/explorer/public/asset/${asset.code}-${asset.issuer}/holders?order=asc&limit=200`;
        continue; // Restart loop with a fresh URL
      }
      if (!data._embedded.records.length) break;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const holderUpdates = data._embedded.records.map((record: any) => ({
        updateOne: {
          filter: { owner: record.account },
          update: {
            $addToSet: { badges: { badgeId, tx: "" } },
          },
          upsert: true,
        },
      }));

      // Update BadgeHolders collection efficiently using bulkWrite
      await badgeHoldersCollection.bulkWrite(holderUpdates);

      // Add current holders to the set
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data._embedded.records.forEach((record: any) => holdersSet.add(record.account));

      // Handle pagination cursor
      nextUrl = `${BASE_URL}${data._links.next.href}`;
      console.log(`Next URL: ${nextUrl}`);

      // Save cursor after every batch
      await badgesCollection.updateOne({ _id: badgeId }, { $set: { lastMarkUrlHolders: String(data._links.self.href) } });

      await sleep(500);
    }

    // Update or create holdersForBadge document
    await holdersForBadgesCollection.updateOne({ badgeId }, { $addToSet: { holders: { $each: Array.from(holdersSet) } } }, { upsert: true });

    // Update the lastUpdatedHolders timestamp
    await badgesCollection.updateOne({ _id: badgeId }, { $set: { lastUpdatedHolders: new Date() } });

    console.log(`Successfully updated holders for ${asset.code}-${asset.issuer}`);
  } finally {
    globalThis.holders_refreshing = false;
  }
}

export async function ExistingInBadgeHolders(db: Db, assets: SqAsset[]): Promise<BadgeHolder[]> {
  const badges = await db
    .collection<Badge>("badges")
    .find({
      $or: assets.map((a) => ({ code: a.code, issuer: a.issuer })),
    })
    .toArray();

  const badgeIds = badges.map((badge) => badge._id);

  return await db
    .collection<BadgeHolder>("BadgeHolders")
    .find({
      "badges.badgeId": { $in: badgeIds },
    })
    .toArray();
}

export async function getHoldersForAsset(db: Db, asset: SqAsset): Promise<string[]> {
  const badgesCollection = db.collection("badges");
  const holdersForBadgesCollection = db.collection("HoldersForBadges");

  const badge = await badgesCollection.findOne({ code: asset.code, issuer: asset.issuer });
  if (!badge) return [];

  const holdersDoc = await holdersForBadgesCollection.findOne({ badgeId: badge._id });
  return holdersDoc ? Array.from(holdersDoc.holders) : [];
}

export async function refreshAllAssetHolders(db: Db, assets?: SqAsset[]): Promise<void> {
  const badgesCollection = db.collection("badges");

  // Step 1: Fetch assets from DB if not provided
  if (!assets || assets.length === 0) {
    assets = await badgesCollection
      .find()
      .toArray()
      .then((badges) => badges.map((badge) => ({ code: badge.code, issuer: badge.issuer })));
  }

  // Step 2: Parse TOML files if DB has no assets
  if (!assets || assets.length === 0) {
    console.log("No assets found in database, parsing TOML files...");
    await parseTomlFiles(); // Assume this function is implemented elsewhere

    assets = await badgesCollection
      .find()
      .toArray()
      .then((badges) => badges.map((badge) => ({ code: badge.code, issuer: badge.issuer })));
  }

  if (!assets || assets.length === 0) {
    throw new Error("No assets provided and unable to fetch from database.");
  }

  console.log(`Refreshing asset holders for ${assets.length} assets...`);

  // Step 3: Fetch and update holders for all assets sequentially (or parallel if desired)
  for (const asset of assets) {
    console.log(`Processing asset: ${asset.code}-${asset.issuer}`);
    await fetchAndUpdateAssetHolders(db, asset);
  }

  console.log("All asset holders refreshed successfully.");
}
