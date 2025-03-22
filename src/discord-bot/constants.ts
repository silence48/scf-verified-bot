// constants.ts
//import { rpc as StellarRpc } from "@stellar/stellar-sdk";


//export const rpcServer = new StellarRpc.Server(RPC_URL, { allowHttp: true });

/** Map<threadId, Map<voterId,true>> for local caching */

export const RPC_URL = "https://soroban-rpc.mainnet.stellar.gateway.fm";
export const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "248918075922055168";
export const BOT_READONLY_MODE = process.env.BOT_READONLY_MODE === "true" ? process.env.BOT_READONLY_MODE : false;
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
export const RUN_DATABASE_MIGRATION = process.env.RUN_DATABASE_MIGRATION === "true" ? process.env.RUN_DATABASE_MIGRATION : false;
export const BOT_IS_LOGGED_IN: { value: boolean } = { value: false };
console.log(`constants was imported and BOT_READONLY_MODE is ${BOT_READONLY_MODE}`);
if (!DISCORD_BOT_TOKEN) {
  console.error(
    "No bot token found in environment variables. Please set DISCORD_BOT_TOKEN."
  );
  process.exit(1);
}

export const GUILD_ID = "897514728459468821"; // Stellar Developers Server ID.
export const PATHFINDER_ROLE = "SCF Pathfinder";
export const VERIFIED_ROLE = "SCF Verified";
