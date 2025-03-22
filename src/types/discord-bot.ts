import { SCFUser } from "@/discord-bot/types";
import { ObjectId, Document } from "mongodb";

/**
 * This is the overall structure returned by the loadGuildData function.
 * It contains counts for roles and arrays for members, badges, votes, and nomination threads.
 */
export interface LoadGuildData {
    roleStats: RoleStats; // Contains counts for each role (verified, pathfinder, navigator, pilot)
    members: MemberInfo[]; // Array of MemberInfo objects; each member's discordId relates to precomputedBadge.discordId and nomination votes/votes
    userbadges: PrecomputedBadge[]; // Array of PrecomputedBadge objects; each badge has a discordId matching a MemberInfo.discordId
    uservotes: NominationVote[]; // Array of NominationVote objects; each vote references a thread (threadId) and a member (voterId matching MemberInfo.discordId)
    threads: NominationThread[]; // Array of NominationThread objects; each thread has a roleId that relates to a GuildRole, and nomineeId and nominatorId that match MemberInfo.discordId
  }
  

  /**
   * Represents the counts for the different roles.
   */
  export interface RoleStats {
    verified: number;
    pathfinder: number;
    navigator: number;
    pilot: number;
    categoryDelegate: number;
    project: number;
  }

  export interface BadgeAsset {
    _id: ObjectId; 
    code: string;
    issuer: string;
    difficulty: string;
    subDifficulty: string;
    category_broad: string;
    category_narrow: string;
    description_short: string;
    description_long: string;
    current: number;
    instructions: string;
    issue_date: string;
    type: string;
    aliases: string[];
    image: string;
    lastMarkUrlHolders: string;
  }
  /**
   * Information about a guild member.
   * Note: The member's discordId will be used to relate to badges, votes, and nomination threads.
   */
  export interface MemberInfo {
    _id: string; // discord userid, (also used as mongodb unique identifier)
    discordId: string; // Unique identifier for the member (matches PrecomputedBadge.discordId, NominationVote.voterId, and NominationThread fields)
    username: string;
    memberSince: Date | null; // the date the user first verified
    joinedDiscord: Date;
    avatar: string;
    roles: MemberRole[]; // Array of roles with name, shortname, and obtained date
    profileDescription: string;
    joinedStellarDevelopers: Date;
    guildId: string; // reference to the guild
  }
  
  /**
   * Represents a role assigned to a member
   */
  export interface MemberRole {
    name: string;
    shortname: string;
    obtained: Date;
  }
  
  /**
   * A nomination thread represents a nomination for a specific role.
   * - threadId (i.e. _id of the thread) is referenced by NominationVote.threadId.
   * - nominatorId and nomineeId both reference MemberInfo.discordId.
   * - roleId corresponds to an entry in GuildRole.
   * - status is either "open" or "closed" and updatedAt reflects the last vote or creation time.
   */
  export interface NominationThread {
    _id: string;
    createdAt: Date;
    nominatorId: string; // discordId of the member who initiated the nomination
    nomineeId: string; // discordId of the member being nominated
    roleId: string; // Corresponds to a GuildRole._id (role in Discord)
    roleName: string; // Redundant with GuildRole.role.name but provided for convenience
    voteCount: number;
    status: "open" | "closed" | null;
    updatedAt: Date;
  }
  
  /**
   * A nomination vote is a yes vote from a member.
   * - threadId corresponds to a NominationThread._id.
   * - voterId corresponds to a MemberInfo.discordId.
   */
  export interface NominationVote {
    _id: number | string;
    threadId: string;
    voterId: string; // Should match a MemberInfo.discordId
    voteTimestamp: Date;
    createdAt: Date;
  }

  export interface NominationVoteResult {
    met: boolean, 
    threadId: string;
    voteCount: number;
    lastVote: Date;
    nominationDate: Date;
    votes: NominationVote[]
  }

 
  /* The nomination requirement verification object */
  export interface NominationRequirementVerification {
    met: boolean;
    roleName: string;
    winningThread: string;
    nominatorId: string; // discordid of the nominator
    voteResults: NominationVoteResult[];
  }

  // Interface for the Transaction collection
  export interface Transaction {
    _id?: ObjectId;
    account_id: string;
    badge_ids: ObjectId[];
    tx_hash: string;
    ledger: number;
    timestamp: number;
    body: string;
    meta: string;
    result: string;
  }

  export interface TransactionBadge extends Omit<Transaction, "_id" | "badge_ids">, Omit<BadgeAsset, "_id"> {
    _id: string | ObjectId; // badge objectid as a string.
    badge_ids: ObjectId[] | string[]; // badge_ids as string[] instead of ObjectId[]
  };
  export type precomputedUserBadge =  Omit<SCFUser, "_id"> & Omit<Transaction, "_id"> 
  export interface PrecomputedBadge extends precomputedUserBadge, Document {
    _id: string; // account id
    badges: TransactionBadge[];
    useroid: ObjectId | string; // is an objectid.
  }

  /**
   * A precomputed badge represents the aggregated badge data for a member.
   * - The discordId here matches MemberInfo.discordId.
   * - processResponse contains the status and message from the badge processing,
   *   including the requested role in a field called "role".
   */
  /*
  export interface PrecomputedBadge {
    _id: string; // a stellar public key
    badges: BadgeTransaction[]; // Array of individual badgeTransaction documents
    discordId?: string; // Matches MemberInfo.discordId
    lastProcessed?: Date;
    processResponse?: ProcessResponse;
    publicKey?: string;
    useroid?: ObjectId | string;
  }*/
  
  /**
   * Represents an individual badge within the precomputed badge document.
   */
  /*
  export interface BadgeTransaction extends Omit<BadgeAsset, "_id" > {
    _id: ObjectId | string;
    tx_hash: string;
    account_id: string;
    badge_ids: ObjectId[] | string[];
    ledger: number;
    timestamp: number;
  }

    export interface BadgeAsset {
      _id: ObjectId | string;
      code: string;
      issuer: string;
      difficulty: string;
      subDifficulty: string;
      category_broad: string;
      category_narrow: string;
      description_short: string;
      description_long: string;
      current: number;
      instructions: string;
      issue_date: string| Date;
      type: string;
      aliases: string[];
      image: string;
      lastMarkUrlHolders: string;
    }
    */

  
  /**
   * Represents a guild role as defined by Discord.
   * This can be looked up for additional details regarding the roleId found in nomination threads.
   */
  export interface GuildRole {
    _id: string;
    createdAt: Date;
    guildId: string;
    role: {
      guild: string;
      icon: string | null;
      unicodeEmoji: string | null;
      id: string;
      name: string;
      color: number;
      hoist: boolean;
      rawPosition: number;
      permissions: string;
      managed: boolean;
      mentionable: boolean;
      flags: number;
      tags: Record<string, unknown> | null;
      createdTimestamp: number;
    }
    roleName: string; // Redundant: same as role.name
    updatedAt: Date;
  }
  
  