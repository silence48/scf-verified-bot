import { BadgeAsset } from "@/types/discord-bot";
import { TierRole } from "./roles";

// User type
export interface User {
    id: string;
    username: string;
    publicKey: string;
    badges: BadgeAsset[];
    roles: TierRole[];
    createdAt: Date;
    updatedAt: Date;
}

// User activity related types
export interface UserLog {
    timestamp: Date;
    status: number;
    message?: string;
    error?: string;
    role?: string;
}

export interface UserNomination {
    id: string;
    roleName: string;
    nominatedUser: string;
    status: "open" | "closed" | "pending" | "approved" | "rejected";
    date: Date;
    voteCount?: number;
}

export interface UserVote {
    id: string;
    threadId?: string;
    roleName: string;
    nominatedUser: string;
    date: Date;
}

export interface UserBadge {
    name: string;
    description: string;
    image: string;
}


// User details response type
export interface UserDetailsResponse {
    badges: UserBadge[];
    logs: UserLog[];
    nominations: UserNomination[];
    votes: UserVote[];
}


