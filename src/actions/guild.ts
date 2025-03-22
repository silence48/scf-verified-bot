"use server";

import { getClient } from "@/discord-bot/client";
import { getMongoDatabase, getRoleCounts } from "@/discord-bot/mongo-db";
import { getAllPrecomputedBadges } from "@/lib/BadgeWatcher";
import { getAllMembersAgg } from "@/lib/MemberWatcher";
import type { LoadGuildData, RoleStats, MemberInfo, NominationThread, NominationVote, PrecomputedBadge } from "@/types/discord-bot";

export async function getAllVotes(): Promise<NominationVote[]> {
    try {
        const db = await getMongoDatabase();
        const nomination_votes = await db.collection<NominationVote>("nomination_votes").find().toArray();
        return nomination_votes;
    } catch (error) {
        throw new Error(`Failed to fetch nomination votes ${error}`);
    }
};

export async function getAllNominations(): Promise<NominationThread[]> {
    try {
        const db = await getMongoDatabase();
        const nomination_threads = await db.collection<NominationThread>("nomination_threads").find().toArray();
        return nomination_threads;
    } catch (error) {
        throw new Error(`Failed to fetch nomination threads ${error}`);
    }
};

export async function roleStats() {

}
export async function loadGuildData(guildId: string): Promise<LoadGuildData> {
    console.log(`[loadGuildData] Loading data for guild ${guildId}`);
     const client = await getClient(`[loadGuildData] for ${guildId}`);
      const guild = await client.guilds.fetch(guildId);
      const roles = await guild.roles.fetch();
    const counts = await getRoleCounts(guild);
 
    const members: MemberInfo[] = await getAllMembersAgg(guildId);
    const userbadges: PrecomputedBadge[] = await getAllPrecomputedBadges();

    const uservotes: NominationVote[] = await getAllVotes();
      const threads: NominationThread[] = await getAllNominations();
return {
        roleStats: counts,
        members,
        userbadges,
        uservotes,
        threads,
    };
}



/*
[
  {
    _id: "user-1",
    username: "alice",
    discordId: "123456789012345678",
    memberSince: new Date("2023-01-01T00:00:00Z"),
    joinedDiscord: new Date("2023-01-01T00:00:00Z"),
    joinedStellarDevelopers: new Date("2023-01-01T00:00:00Z"),
    profileDescription: "Stellar developer and community member",
    avatar: "",
    roles: [
      { name: "SCF Verified", shortname: "Verified", obtained: new Date("2023-01-01T00:00:00Z") },
      { name: "SCF Pathfinder", shortname: "Pathfinder", obtained: new Date("2023-02-01T00:00:00Z") },
    ],
    guildId: guildId,
  },
  {
    _id: "user-2",
    username: "bob",
    discordId: "234567890123456789",
    memberSince: new Date("2023-01-02T00:00:00Z"),
    joinedDiscord: new Date("2023-01-02T00:00:00Z"),
    joinedStellarDevelopers: new Date("2023-01-02T00:00:00Z"),
    profileDescription: "Blockchain enthusiast",
    avatar: "",
    roles: [{ name: "SCF Verified", shortname: "Verified", obtained: new Date("2023-01-02T00:00:00Z") }],
    guildId: guildId,
  },
  {
    _id: "user-3",
    username: "charlie",
    discordId: "345678901234567890",
    memberSince: new Date("2023-01-02T00:00:00Z"),
    joinedDiscord: new Date("2023-01-03T00:00:00Z"),
    joinedStellarDevelopers: new Date("2023-01-03T00:00:00Z"),
    profileDescription: "Soroban developer",
    avatar: "",
    roles: [
      { name: "SCF Verified", shortname: "Verified", obtained: new Date("2023-01-03T00:00:00Z") },
      { name: "SCF Navigator", shortname: "Navigator", obtained: new Date("2023-03-01T00:00:00Z") },
    ],
    guildId: guildId,
  },
  {
    _id: "user-4",
    username: "dave",
    discordId: "456789012345678901",
    memberSince: new Date("2023-01-04T00:00:00Z"),
    joinedDiscord: new Date("2023-01-04T00:00:00Z"),
    joinedStellarDevelopers: new Date("2023-01-04T00:00:00Z"),
    profileDescription: "Stellar community advocate",
    avatar: "",
    roles: [
      { name: "SCF Verified", shortname: "Verified", obtained: new Date("2023-01-04T00:00:00Z") },
      { name: "SCF Pilot", shortname: "Pilot", obtained: new Date("2023-04-01T00:00:00Z") },
    ],
    guildId: guildId,
  },
  {
    _id: "user-5",
    username: "eve",
    discordId: "567890123456789012",
    memberSince: new Date("2023-01-05T00:00:00Z"),
    joinedDiscord: new Date("2023-01-05T00:00:00Z"),
    joinedStellarDevelopers: new Date("2023-01-05T00:00:00Z"),
    profileDescription: "New to Stellar",
    avatar: "",
    roles: [{ name: "SCF Verified", shortname: "Verified", obtained: new Date("2023-01-05T00:00:00Z") }],
    guildId: guildId,
  },
];

// Mock badges
const badge1: Badge ={
  "_id": new ObjectId("6660e92a59145bf118c31ced"),
  "code": "SQ0502",
  "issuer": "GCMOPDUBGJZ6IZSD4WRCGAC3VUFHQNRZEPHM2UB2V3QWVAJ7NDGHOOG7",
  "difficulty": "",
  "subDifficulty": "",
  "category_broad": "",
  "category_narrow": "",
  "description_short": "",
  "description_long": "",
  "current": 1,
  "instructions": "",
  "issue_date": new Date("2024-06-05T22:39:38.129Z"),
  "type": "",
  "aliases": [],
  "image": "https://api.stellar.quest/badge/GCMOPDUBGJZ6IZSD4WRCGAC3VUFHQNRZEPHM2UB2V3QWVAJ7NDGHOOG7?v=4",
  "lastMarkUrlHolders": "/explorer/public/asset/SQ0502-GCMOPDUBGJZ6IZSD4WRCGAC3VUFHQNRZEPHM2UB2V3QWVAJ7NDGHOOG7/holders?order=desc&limit=200&cursor=AAAAAAAAAAEAkHAK"
};

const badge2: Badge ={
  "_id": new ObjectId("6660e92a59145bf118c31cee"),
  "code": "SQ0503",
  "issuer": "GATRDOIZ24ZOQR2VILU4ZED3NTMZCWSW3KI47QXT7LFZIGTIXFBTYCAA",
  "difficulty": "",
  "subDifficulty": "",
  "category_broad": "",
  "category_narrow": "",
  "description_short": "",
  "description_long": "",
  "current": 1,
  "instructions": "",
  "issue_date": new Date("2024-06-05T22:39:38.135Z"),
  "type": "",
  "aliases": [],
  "image": "https://api.stellar.quest/badge/GATRDOIZ24ZOQR2VILU4ZED3NTMZCWSW3KI47QXT7LFZIGTIXFBTYCAA?v=4",
  "lastMarkUrlHolders": "/explorer/public/asset/SQ0503-GATRDOIZ24ZOQR2VILU4ZED3NTMZCWSW3KI47QXT7LFZIGTIXFBTYCAA/holders?order=desc&limit=200&cursor=AAAAAAAAAAEAjxB5"
};
*/



/*
  // Mock process responses
const processResponse1: ProcessResponse = {
  status: 200,
  message: "Role: SCF Verified granted successfully.",
  role: "SCF Verified",
};

const processResponse2: ProcessResponse = {
  status: 200,
  message: "Role: SCF Verified granted successfully.",
  role: "SCF Verified",
};
[
  {
    _id: "GBFGUZM7RCMH6YWVLKBPLSQYJ5QFGCMBBQBF6UVPGDIFNRQIO7BXNKKJ",
    badges: [badge1],
    discordId: "123456789012345678",
    lastProcessed: new Date("2024-09-19T14:50:06.520Z"),
    processResponse: processResponse1,
    publicKey: "GBFGUZM7RCMH6YWVLKBPLSQYJ5QFGCMBBQBF6UVPGDIFNRQIO7BXNKKJ",
    useroid: "user1",
  },
  {
    _id: "GDNSSYSCNFMRPRWJBXQPGJFWJ7KTVDCECTZH7YANZ4LZXJL7WLKFNLXP",
    badges: [badge2],
    discordId: "234567890123456789",
    lastProcessed: new Date("2024-09-19T14:50:06.520Z"),
    processResponse: processResponse2,
    publicKey: "GDNSSYSCNFMRPRWJBXQPGJFWJ7KTVDCECTZH7YANZ4LZXJL7WLKFNLXP",
    useroid: "user2",
  },
];
*/
// Mock nomination votes
/*
const uservotes: NominationVote[] = 
[
  {
    _id: 1,
    threadId: "1219306764281974795",
    voterId: "123456789012345678",
    voteTimestamp: new Date("2024-03-18T20:40:46.733Z"),
    createdAt: new Date("2025-03-08T07:35:14.473Z"),
  },
  {
    _id: 2,
    threadId: "1219306764281974795",
    voterId: "345678901234567890",
    voteTimestamp: new Date("2024-03-19T10:15:22.123Z"),
    createdAt: new Date("2025-03-08T07:35:14.473Z"),
  },
];
*/
/*
  // Mock nomination threads
  const threads: NominationThread[] = [
    {
      _id: "1219306764281974795",
      createdAt: new Date("2024-03-18T20:35:12.456Z"),
      nominatorId: "456789012345678901",
      nomineeId: "567890123456789012",
      roleId: "1082331251899379762",
      roleName: "SCF Navigator",
      voteCount: 2,
      status: null,
      updatedAt: new Date("2025-03-08T07:35:17.279Z"),
    },
  ];
*/
/*
  // Return the complete guild data
  return {
    roleStats,
    members,
    userbadges,
    uservotes,
    threads,
  };
}

*/