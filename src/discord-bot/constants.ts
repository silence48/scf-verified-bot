// constants.ts
//import { rpc as StellarRpc } from "@stellar/stellar-sdk";


//export const rpcServer = new StellarRpc.Server(RPC_URL, { allowHttp: true });

/** Map<threadId, Map<voterId,true>> for local caching */
export const voteCounts: Map<string, Map<string, boolean>> = new Map();
export const RPC_URL = "https://soroban-rpc.mainnet.stellar.gateway.fm";
export const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "248918075922055168";
export const BOT_READONLY_MODE = process.env.BOT_READONLY_MODE ? process.env.BOT_READONLY_MODE : false
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
export const BOT_IS_LOGGED_IN: { value: boolean } = { value: false };

if (!DISCORD_BOT_TOKEN) {
  console.error(
    "No bot token found in environment variables. Please set DISCORD_BOT_TOKEN."
  );
  process.exit(1);
}
