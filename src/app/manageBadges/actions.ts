"use server";
import { getMongoDatabase } from "@/discord-bot/mongo-db";
import type { BadgeAsset } from "@/types/discord-bot";
import { ObjectId } from "mongodb";
//import { ObjectId } from "mongodb";

export async function getBadges(): Promise<BadgeAsset[]> {
  const db = await getMongoDatabase();
  const raw = await db.collection<BadgeAsset>("badges").find().toArray();
  // Convert _id to a string so that only plain objects are passed.
  return raw.map((doc) => ({
    ...doc,
    _id: doc._id,
  }));
}

// List of fields that are allowed to be updated
const EDITABLE_FIELDS = [
  "difficulty",
  "subDifficulty",
  "category_broad",
  "category_narrow",
  "description_short",
  "description_long",
  "current",
  "instructions",
  "type",
  "aliases",
] as const;

// Type for editable fields only
type EditableBadgeFields = Pick<BadgeAsset, (typeof EDITABLE_FIELDS)[number]>

export async function updateBadge(badgeId: string, updatedData: Partial<BadgeAsset>): Promise<void> {
  const db = await getMongoDatabase();

  // Filter out non-editable fields by picking only allowed fields
  const filteredData: Partial<EditableBadgeFields> = Object.fromEntries(
    Object.entries(updatedData).filter(([key]) => 
      EDITABLE_FIELDS.includes(key as typeof EDITABLE_FIELDS[number])
    )
  ) as Partial<EditableBadgeFields>;

  await db.collection<BadgeAsset>("badges").updateOne(
    { _id: new ObjectId(badgeId) }, 
    { $set: filteredData }, 
    { upsert: true }
  );
}

