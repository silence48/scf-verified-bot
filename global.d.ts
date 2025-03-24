/* eslint-disable no-var */
//// filepath: c:\SCF\scf-roles-bot\global.d.ts
import { Client } from "discord.js";

declare global {
  // Option A: Extend the NodeJS Global interface
  // (TS typically merges these declarations)
  namespace NodeJS {
    interface Global {
      client: Client | null;
      discordClient: Client | null;
      isLoggingIn: boolean;
      didRunReadyBlock: boolean;
      last_member_sync: Map<string, Date>;
      holders_refreshing: boolean;
      membersCacheByGuild: Map<string, { data: MemberInfo[]; timestamp: number }>;
      membersWatcherRunning: boolean;
      refreshScheduledMembers: boolean;
      badgeWatcherRunning: boolean;
      refreshScheduledBadges: boolean;
      migrationran: boolean;
      tierRolesInitialized: boolean;
    }
  }

  // Option B: Declare top-level vars on globalThis
  var discordClient: Client | null;
  var isLoggingIn: boolean;
  var didRunReadyBlock: boolean;
  var last_member_sync: Map<string, Date>;
  var holders_refreshing: boolean;
  var membersCacheByGuild: Map<string, { data: MemberInfo[]; timestamp: number }>;
  var membersWatcherRunning: boolean;
  var refreshScheduledMembers: boolean;
  var badgeWatcherRunning: boolean;
  var refreshScheduledBadges: boolean;
  var migrationran: boolean;
  var tierRolesInitialized: boolean;
}

export {};
