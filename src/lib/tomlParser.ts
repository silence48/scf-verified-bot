import { getDb } from "@/discord-bot/mongo-db";
import { BadgeAsset, SqAsset } from "@/discord-bot/types";
import * as toml from "toml";
import { refreshAllAssetHolders } from "@/lib/SQ/ingestHolders";

export async function parseTomlFiles(): Promise<boolean> {
    try {
        const db = await getDb();
        const questUrls = [
            "https://quest.stellar.org/.well-known/stellar.toml",
            "https://fastcheapandoutofcontrol.com/.well-known/stellar.toml"
        ];

        const badgesCollection = db.collection<BadgeAsset>("badges");
        const badgeBulkOps = [];

        for (const url of questUrls) {
            try {
                const response = await fetch(url);
                const text = await response.text();
                const data = toml.parse(text);
                const currencies: {code: string, issuer: string, name: string, desc: string, image: string}[] = data.CURRENCIES || [];
                const currencyQueries: Array<SqAsset> = currencies.map(currency => ({
                    code: currency.code,
                    issuer: currency.issuer
                }));

                // Query existing badges in bulk
                const existingBadges = await badgesCollection.find<BadgeAsset>({
                    $or: currencyQueries
                }).project({ code: 1, issuer: 1 }).toArray();

                const existingSet = new Set(existingBadges.map(b => `${b.code}-${b.issuer}`));

                for (const currency of currencies) {
                    const key = `${currency.code}-${currency.issuer}`;
                    if (!existingSet.has(key)) {
                        badgeBulkOps.push({
                            insertOne: {
                                document: {
                                    code: currency.code || "",
                                    issuer: currency.issuer || "",
                                    difficulty: "",
                                    subDifficulty: "",
                                    category_broad: "",
                                    category_narrow: "",
                                    description_short: currency.name || "",
                                    description_long: currency.desc || "",
                                    current: 1,
                                    instructions: "",
                                    issue_date: new Date().toISOString(),
                                    type: "",
                                    aliases: [],
                                    image: currency.image || "",
                                    lastMarkUrlHolders: ""
                                }
                            }
                        });
                    }
                }
            } catch (error) {
                console.error(`Failed to fetch or parse TOML from ${url}:`, error);
                return false;
            }
        }

        if (badgeBulkOps.length > 0) {
            await badgesCollection.bulkWrite(badgeBulkOps);
            console.log(`Inserted ${badgeBulkOps.length} new badges.`);
        } else {
            console.log("No new badges to insert.");
        }
        // Refresh all asset holders
        await refreshAllAssetHolders(db);
        console.log("Asset holders refreshed.");
        return true;
    } catch (error) {
        console.error("Error parsing TOML files:", error);
        return false;
    }
}

