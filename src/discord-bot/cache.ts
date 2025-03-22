import { type loadGuildData } from "@/app/dash/actions";
import { syncMembersFromDiscord } from "./mongo-db";

// cache.ts
interface CacheEntry<T> {
    data: T;
    timestamp: number;
  }
  
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  const guildDataCache: { [guildId: string]: CacheEntry<ReturnType<typeof loadGuildData>> } = {};
  const memberInfoCache: { [guildId: string]: CacheEntry<ReturnType<typeof syncMembersFromDiscord>> } = {};
  
  /**
   * Get cached data if available and not expired.
   */
  export function getCachedGuildData1<T>(guildId: string): T | null {
    const entry = guildDataCache[guildId];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as T;
    }
    return null;
  }
  
  /**
   * Cache the data for a guild.
   */
  export function setCachedGuildData1(guildId: string, data: ReturnType<typeof loadGuildData>): void {
    guildDataCache[guildId] = { data, timestamp: Date.now() };
  }



  // Generic cache storage for different types of data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const caches: { [cacheKey: string]: { [key: string]: CacheEntry<any> } } = {
    guildData: guildDataCache
};

/**
 * Get cached data if available and not expired.
 * @param cacheType The type of cache to access
 * @param key The key to look up in the cache
 */
export function getCachedData<T>(cacheType: string, key: string): T | null {
    const cache = caches[cacheType];
    if (!cache) return null;
    
    const entry = cache[key];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data as T;
    }
    return null;
}

/**
 * Cache data with a specific key.
 * @param cacheType The type of cache to store in
 * @param key The key to store the data under
 * @param data The data to cache
 */
export function setCachedData<T>(cacheType: string, key: string, data: T): void {
    if (!caches[cacheType]) {
        caches[cacheType] = {};
    }
    caches[cacheType][key] = { data, timestamp: Date.now() };
}

// Convenience functions for the guild data cache
export function getCachedGuildData<T>(guildId: string): T | null {
    return getCachedData<T>("guildData", guildId);
}

export function setCachedGuildData<T>(guildId: string, data: T): void {
    setCachedData<T>("guildData", guildId, data);
}
  