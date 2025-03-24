import { ObjectId } from "mongodb";
import { BaseUser } from "./client";

export interface processedUserResponse {
  status: number;
  date: Date;
  message?: string;
  error?: string;
  role: string;
}
export interface SCFUser {
  _id?: ObjectId | string; //ObjectId; // it's an object id but the code needs a string automatically generated ObjectId (unless you use a custom _id)
  discordId: string;
  publicKey: string;
  publicKeys: string[]; // an array of public key strings
  lastProcessed: Date; // an ISO date string
  processResponse: processedUserResponse;
  processedResponses?: processedUserResponse[];
}
export interface MemberRoleInfo {
  name: string;
  shortname: string;
  obtained: Date;
}
/*
interface UserMember {
  discordId: string;
  name: string;
  avatar: string;
  memberSince: Date;
  joinedDiscord: Date;
  roles: Array<{
    name: string;
    shortname: string;
    obtained: Date;
  }>;
  joinedStellarDevelopers?: Date;
  profileDescription?: string;
}
  */
export interface MemberInfo {
  _id: string; // userId
  discordId: string;
  username: string;
  memberSince: Date;
  joinedDiscord: Date;
  avatar: string;
  roles: MemberRoleInfo[];
  profileDescription: string;
  joinedStellarDevelopers: Date;
  guildId: string;
}

export interface BaseGuild {
  _id: string;
  guildName: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface GuildDoc extends BaseGuild, Document {}

export interface UserDoc extends BaseUser, Document {}

export interface BaseRole {
  _id: string; // roleId
  roleName: string;
  guildId: string;
  createdAt: Date;
  updatedAt: Date;
  removedAt: Date | null;
}
export interface RoleDoc extends BaseRole, Document {}

export interface BaseUserRole {
  _id: string; // e.g. `${userId}_${roleId}_${guildId}`
  userId: string;
  roleId: string;
  guildId: string;
  roleAssignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  removedAt?: Date;
}

export interface UserRoleDoc extends BaseUserRole, Document {}

export interface BaseVotingThread {
  _id: string; // threadId
  createdAt: Date;
  nominatorId: string;
  nomineeId: string;
  roleId: string;
  roleName: string;
  voteCount: number;
  status: "OPEN" | "CLOSED" | "";
  updatedAt: Date;
}

export interface VotingThreadDoc extends BaseVotingThread, Document {}

export interface BaseVote {
  _id?: number;
  threadId: string;
  voterId: string;
  voteTimestamp: Date;
  createdAt: Date;
}

export interface VoteDoc extends BaseVote, Document {}

export interface BaseInterestedMember {
  _id: string; // e.g. `${memberId}_${interestedRole}_${guildId}`
  memberId: string;
  interestedSince: Date;
  interestedRole: string;
  reason?: string;
  guildId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterestedMemberDoc extends BaseInterestedMember, Document {}

export interface UserJSON {
  // From the User instance (enumerable properties)
  id: string;
  username?: string | null;
  globalName?: string | null;
  discriminator?: string | null;
  bot?: boolean | null;
  system?: boolean | null;
  flags?: unknown;
  avatar?: string | null;
  banner?: string | null | undefined;
  accentColor?: number | null | undefined;
  avatarDecoration?: string | null;
  avatarDecorationData?: {
    asset: string;
    skuId: string;
  } | null;

  // Forced in User#toJSON(...) via Base#toJSON/flatten
  createdTimestamp: number; // always included
  defaultAvatarURL: string; // always included
  hexAccentColor: string | null; // always included
  tag: string | null; // always included

  // Appended after flatten in User#toJSON(...)
  avatarURL: string | null;
  displayAvatarURL: string;
  bannerURL: string | null | undefined;
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

export interface SqBadge {
  _id?: ObjectId;
  index: number;
  assetCode: string;
  assetIssuer: string;
  owner: string;
  balance: string;
  transactions: { badgeId: ObjectId; tx: string }[];
}

export interface SqAsset {
  code: string;
  issuer: string;
}

// Interface for the BadgeHolders collection
export interface SqBadgeHolder extends Document {
  _id?: ObjectId;
  owner: string;
  badges: { badgeId: ObjectId; tx: string }[];
}

// Interface for the Transaction collection
export interface SqTransaction {
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
