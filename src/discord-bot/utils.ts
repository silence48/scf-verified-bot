// src/discord-bot/utils.ts
//'use server';

import { RPC_URL } from "./constants";
export async function getStellarRpc() {
  const stellar = await import("@stellar/stellar-sdk");
  const { Server } = stellar.rpc;
  return new Server(RPC_URL, { allowHttp: true });
}
/**
 * Checks if an address on Stellar is funded.
 */
export async function checkAccount(address: string | string[]): Promise<boolean> {
  const rpc = await getStellarRpc();
  if (Array.isArray(address)) {
    // Check if any address in the array is funded
    let atLeastOneFunded = false;
    for (const addr of address) {
      try {
        await rpc.getAccount(addr);
        atLeastOneFunded = true;
        break; // Exit loop once a funded account is found
      } catch (err) {
        // Continue checking other addresses if this one fails
        if (!(err instanceof Error && "response" in err && typeof err.response === "object" && err.response && "status" in err.response && err.response.status === 404)) {
          // If error is not a 404, propagate it
          throw err;
        }
      }
    }
    return atLeastOneFunded;
  } else {
    try {
      await rpc.getAccount(address);
      return true; // Account exists and is funded
    } catch (error: unknown) {
      if (error instanceof Error && "response" in error && typeof error.response === "object" && error.response && "status" in error.response && error.response.status === 404) {
        return false; // Account doesn't exist or isn't funded
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check account: ${errorMessage}`);
    }
  }
}
