import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/discord-bot/mongo-db";
// import { fetchTransactionsForHolder } from "@/lib/stellarQuest";
import { checkAccount } from "@/discord-bot/utils";
import { getClient } from "@/discord-bot/client";
import { grantRoleWithChecks } from "@/discord-bot/roles";
// import { GUILD_ID, PATHFINDER_ROLE, VERIFIED_ROLE } from "@/discord-bot/constants";
// import { DiscordAPIError } from "discord.js";
import { logger } from "@/discord-bot/logger";
import { PrecomputedBadge } from "@/types/discord-bot";
import { ObjectId } from "mongodb";
// import { TierRole } from "@/types/roles";
import { extractRoleName, getBadgesForKeys, getMember, getMemberHighestCurrentTierRole } from "./utils";
import { getHighestEligibleRole } from "@/actions/roles";
import { processedUserResponse, SCFUser } from "@/discord-bot/types";

// Authorized tokens – using the environment variable SCF_AUTH_TOKEN.
const AUTH_TOKENS = new Set([process.env.SCF_AUTH_TOKEN]);
//const tierOrder = ["SCF Verified", "SCF Pathfinder", "SCF Navigator", "SCF Pilot"];

// Request body interface.
interface VerifyPathfinderRequestBody {
  authentication: string;
  address: string;
  discordId: string;
}

// SCF Verified => funded account, fewer than 4 badges, and no SCF Project
// SCF Pathfinder => funded account + (≥4 badges OR user has SCF Project)

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyPathfinderRequestBody;
    const { authentication, address, discordId } = body;

    // Validate required fields
    if (!authentication || !address || !discordId) {
      console.warn("Missing required fields in request:", body);
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check authentication
    if (!AUTH_TOKENS.has(authentication)) {
      console.warn("Unauthorized attempt with auth:", authentication);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const client = await getClient();
    const { guild, member } = await getMember(client, discordId);
    // Ensure that the new address is not already associated with another user
    // Check both publicKey field and publicKeys array
    const conflictingUsers = await db
      .collection("SCF_Users")
      .find({
        $or: [{ publicKey: address }, { publicKeys: { $in: [address] } }],
        discordId: { $ne: discordId }, // Exclude the current user
      })
      .toArray();
    if (conflictingUsers.length > 0) {
      logger(`Public key ${address} is already associated with other users: ${conflictingUsers.map((user) => user.discordId).join(", ")}`, client);

      console.warn(`Public key ${address} is already associated with other users: ${conflictingUsers.map((user) => user.discordId).join(", ")}`);
      return NextResponse.json(
        {
          error: "Public key is already associated with other users.",
          conflictingUsers: conflictingUsers.map((user) => user.discordId),
        },
        { status: 400 },
      );
    }

    // Fetch the existing user record (if any)
    const userRecord = await db.collection<SCFUser>("SCF_Users").findOne({ discordId });
    const responseLog: processedUserResponse = { status: 200, date: new Date(), message: "User not found, creating new record.", role: "no-role-new-user" };
    const user = userRecord
      ? userRecord
      : {
          _id: new ObjectId(),
          discordId: discordId,
          publicKey: address,
          publicKeys: [address],
          lastProcessed: new Date().toISOString(),
          processResponse: responseLog,
          processedResponses: [responseLog],
        };

    const publicKey = user.publicKey ? user.publicKey : address;
    logger(`User ${discordId} has registered publicKey: ${publicKey}`, client);
    // Ensure publicKeys avoid duplicates
    const publicKeys: string[] = Array.from(new Set([...(userRecord?.publicKeys || []), address]));

    const funded = await checkAccount(publicKeys);
    const userbadges: PrecomputedBadge[] = await getBadgesForKeys(publicKeys, db);
    const currentRole = await getMemberHighestCurrentTierRole(member);
    const hasProjectRole = member.roles.cache.some((r) => r.name === "SCF Project");
    if (!funded) {
      if (hasProjectRole) {
        const message = `${member.user.tag} did not link a funded account, but they have the scf project role and they could at least qualify for "SCF Pathfinder" role if they fund it.`;
        console.warn(message);
        return NextResponse.json({ error: message, roleAssigned: "notfunded-scfproject" }, { status: 406 });
      }
      console.warn(`${member.user.tag}'s account ${address} is not funded, thus there is nothing to check. their current role is: ${currentRole?.roleName ?? "none"}`);
      return NextResponse.json({ error: `user ${discordId}, none of these keys: ${publicKeys} are funded on the network.`, roleAssigned: "notfunded-noexisting" }, { status: 406 });
    }
    // if (userbadges.length > 0) {
    const roleEligibilityResult = await getHighestEligibleRole(discordId);
    if (!roleEligibilityResult.role) {
      return NextResponse.json({ error: `Failed to determine role eligibility for user ${discordId}`, roleAssigned: "error" }, { status: 500 });
    }
    if (roleEligibilityResult.role?.roleName !== currentRole?.roleName) {
      try {
        const grantresult = await grantRoleWithChecks(guild, discordId, roleEligibilityResult.role.roleName, client);

        // Create new process response
        const newProcessResponse: processedUserResponse = {
          status: grantresult.statusCode,
          date: new Date(),
          message: grantresult.success ? `Role ${grantresult.finalRoleName} granted successfully.` : `Failed to grant role: ${grantresult.error || "Unknown error"}`,
          role: grantresult.finalRoleName ? grantresult.finalRoleName : roleEligibilityResult.role.roleName ? roleEligibilityResult.role.roleName : "unknown-error",
        };
        const oldProcessResponse: processedUserResponse = {
          status: user.processResponse.status,
          date: new Date(user.lastProcessed),
          message: user.processResponse.message ? user.processResponse.message : user.processResponse.error ? user.processResponse.error : "unknown user event",
          role:
            user.processResponse.message && user.processResponse.status === 200 && !user.processResponse.role
              ? await extractRoleName(user.processResponse.message)
              : user.processResponse.role
                ? user.processResponse.role
                : "no-role-error",
        };
        // Update the user's processResponse and processedResponses
        const currentProcessedResponses = user.processedResponses || [];

        // Add the current processResponse to processedResponses if it exists
        const updatedProcessedResponses = user.processResponse ? [...currentProcessedResponses, oldProcessResponse, newProcessResponse] : [...currentProcessedResponses, newProcessResponse];

        // Update the current processResponse with the new one
        user.processResponse = newProcessResponse;

        // Create a unique key based on both message and timestamp to preserve entries
        // with the same message but different timestamps
        const uniqueResponses = Array.from(new Map(updatedProcessedResponses.map((item) => [`${item.message ? item.message : item.error}_${item.date}`, item])).values());

        // Update the user in the database
        await db.collection("SCF_Users").updateOne(
          { discordId },
          {
            $set: {
              publicKey: address,
              publicKeys,
              lastProcessed: new Date(),
              processResponse: newProcessResponse,
              processResponses: uniqueResponses,
            },
          },
          { upsert: true },
        );

        if (!grantresult.success) {
          return NextResponse.json({ error: grantresult.error, roleAssigned: "role-grant-failed" }, { status: grantresult.statusCode || 500 });
        }
        // Calculate total reputation by counting all badges from all precomputed badges and multiplying by 5
        const totalReputation =
          userbadges.reduce((total, precomputedBadge) => {
            // Add the count of badges in this precomputed badge document
            return total + (precomputedBadge.badges?.length || 0);
          }, 0) * 5;

        return NextResponse.json({
          quests: userbadges,
          totalReputation: totalReputation.toString(),
          scfRole: roleEligibilityResult.role?.roleName,
          message: `Role ${grantresult.finalRoleName} granted successfully.`,
          roleAssigned: grantresult.finalRoleName,
        });
      } catch (error) {
        return NextResponse.json({ error: `Failed to assign role ${roleEligibilityResult.role?.roleName}, ${error}`, roleAssigned: "unknown-error" }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        {
          error: `user ${discordId}, stellar pubkeys ${JSON.stringify(publicKeys)} is not currently eligible for any role except that which they already have which is: ${currentRole.roleName}`,
          roleAssigned: "notfunded-otherkey-funded-not-enough-badges",
        },
        { status: 406 },
      );
    }
    //}
  } catch (error) {
    return NextResponse.json({ error: `unknown internal server error ${error}` }, { status: 500 });
  }
}

/*
const totalReputation = aggregatedBadges.length * 10;



// If the user has SCF Project and the new address is funded, they automatically get SCF Pathfinder
const hasProjectRole = member.roles.cache.some((r) => r.name === "SCF Project");
if (hasProjectRole) {
  console.log(
    `User ${member.user.tag} has SCF Project => auto-upgrade to SCF Pathfinder (funded check already passed).`
  );
  desiredRole = PATHFINDER_ROLE;
}

// Check if user already has the desired role => conflict
if (member.roles.cache.some((role) => role.name === desiredRole)) {
  console.warn(`User ${member.user.tag} already has the ${desiredRole} role.`);
  return NextResponse.json(
    { error: `Conflict: User already has ${desiredRole} role.`, role: desiredRole },
    { status: 409 }
  );
}

// Check if user already has a higher role => conflict
const roleWeights: Record<string, number> = {
  "SCF Verified": 1,
  "SCF Pathfinder": 2,
  "SCF Navigator": 3,
  "SCF Pilot": 4,
  // "SCF Project" isn't included in weighting => doesn't block SCF roles
};
const desiredWeight = roleWeights[desiredRole] || 0;
let existingHigherRole: string | null = null;
for (const role of member.roles.cache.values()) {
  const weight = roleWeights[role.name] || 0;
  if (weight > desiredWeight) {
    existingHigherRole = role.name;
    break;
  }
}
if (existingHigherRole) {
  console.warn(`User ${member.user.tag} already has a higher role: ${existingHigherRole}`);
  return NextResponse.json(
    { error: "Conflict: User already has a higher role.", role: existingHigherRole },
    { status: 409 }
  );
}

// Update the user's role
const success = await updateUserRole(guild, discordId, desiredRole, client);
if (!success) {
  console.warn(`Failed to grant role ${desiredRole} to ${member.user.tag}`);
  return NextResponse.json({ error: "Failed to grant role." }, { status: 500 });
}

// Upsert the user's record to store publicKeys and process info
await db.collection("SCF_Users").updateOne(
  { discordId },
  {
    $set: {
      publicKeys,
      lastProcessed: new Date().toISOString(),
      processResponse: { message: `Role ${desiredRole} granted successfully.` },
    },
  },
  { upsert: true }
);

console.log(`Role ${desiredRole} granted successfully to ${member.user.tag}`);
return NextResponse.json({
  message: `Role: ${desiredRole} granted successfully.`,
  quests: aggregatedBadges,
  totalReputation: totalReputation.toString(),
  scfRole: desiredRole,
  roleAssigned: true,
});
  } catch (error) {
  console.warn("Error in /api/discord/verifyPathfinder:", error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
}
*/
