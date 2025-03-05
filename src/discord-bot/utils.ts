// src/discord-bot/utils.ts
//'use server';

import { RPC_URL } from "./constants";
export async function getStellarRpc() {
  'use server';
const stellar = await import("@stellar/stellar-sdk");
const { Server } = stellar.rpc;
  return new Server(RPC_URL, { allowHttp: true });
}
/**
 * Checks if an address on Stellar is funded.
 */
export async function checkAccount(address: string): Promise<boolean> {
    try {
      const rpc = await getStellarRpc();
        await rpc.getAccount(address);
        return true; // Account exists and is funded
    } catch (error: unknown) {
        if (error instanceof Error && 'response' in error && 
            typeof error.response === 'object' && error.response &&
            'status' in error.response && error.response.status === 404) {
            return false; // Account doesn't exist or isn't funded
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to check account: ${errorMessage}`);
    }
}

