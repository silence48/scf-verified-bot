"use server";
import { getMongoDatabase } from "@/discord-bot/mongo-db";
import type { BadgeAsset as Badge, BadgeAsset } from "@/types/discord-bot";

// function to get all badges
export async function getAllBadges(): Promise<Badge[]> {
      const db = await getMongoDatabase();
    const assets = await db.collection<BadgeAsset>("badges").find().toArray();
    return assets;
}

// function to get badges for a user
export async function getUserBadges(userId: string): Promise<Badge[]> {
  console.log(`Getting badges for user: ${userId}`);
  const allBadges = await getAllBadges();
  return allBadges.filter((_, index) => index % 2 === 0);
}

// function to get badge categories
export async function getBadgeCategories(): Promise<string[]> {
    console.log("Getting badge categories");
    
    const allBadges = await getAllBadges();
    const categories = new Set<string>();
    
    // Extract categories from all badges
    allBadges.forEach(badge => {
        const category = getBadgeCategory(badge.code);
        categories.add(category);
    });
    
    return Array.from(categories);
}

// Helper function to extract category from badge code
function getBadgeCategory(badgeCode: string | undefined): string {
    if (!badgeCode) return "OTHER";
    
    if (badgeCode.startsWith("FCA")) {
        // Handle FCA special case
        return badgeCode.match(/^(FCA\d{2}C)/)?.[1] || "FCA";
    } else if (badgeCode.startsWith("RPCIEGE")) {
        // Handle RPCIEGE case
        return "RPCIEGE";
    } else if (badgeCode.match(/^(S+Q)/)) {
        // Handle SSQ, SQ cases
        return badgeCode.match(/^(S+Q)/)?.[1] || "OTHER";
    } else if (badgeCode.match(/^(SQL)/)) {
        // Handle SQL case
        return "SQL";
    }
    
    return "OTHER";
}

// Function to get badges grouped by category
export async function getBadgesByCategory(): Promise<Record<string, Badge[]>> {
    console.log("Getting badges by category");
    
    const allBadges = await getAllBadges();
    const categories = await getBadgeCategories();
    const badgesByCategory: Record<string, Badge[]> = {};
    
    // Initialize all categories with empty arrays
    categories.forEach(category => {
        badgesByCategory[category] = [];
    });
    
    // Add badges to their respective categories
    allBadges.forEach(badge => {
        const category = getBadgeCategory(badge.code);
        badgesByCategory[category].push(badge);
    });
    
    return badgesByCategory;
}
