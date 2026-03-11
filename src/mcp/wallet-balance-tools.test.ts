import { describe, expect, it, vi } from "vitest";

import { MAX_WALLET_BATCH_SIZE } from "@/lib/wallet-balances";

import { createWalletBalanceToolHandlers } from "./wallet-balance-tools";

const WALLET_A = "0x1234567890abcdef1234567890abcdef12345678";
const FIXED_NOW = new Date("2026-03-11T17:00:00.000Z");

function createDeps() {
  return {
    fetchPortfolioValue: vi.fn(async () => 125.5),
    fetchUsdcBalance: vi.fn(async () => 10.25),
    now: () => FIXED_NOW,
  };
}

describe("wallet balance MCP tools", () => {
  it("returns structured single-wallet content for MCP clients", async () => {
    const handlers = createWalletBalanceToolHandlers(createDeps());

    const result = await handlers.getWalletBalance({
      walletAddress: WALLET_A,
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      chain: "polygon",
      timestamp: FIXED_NOW.toISOString(),
      wallet: {
        walletAddress: WALLET_A,
        totals: {
          usd: 135.75,
        },
      },
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: `Fetched wallet balance for ${WALLET_A} on polygon.`,
      },
    ]);
  });

  it("returns a request-level MCP error for oversized wallet batches", async () => {
    const handlers = createWalletBalanceToolHandlers(createDeps());
    const walletAddresses = Array.from({ length: MAX_WALLET_BATCH_SIZE + 1 }, (_, index) =>
      `0x${index.toString(16).padStart(40, "0")}`,
    );

    const result = await handlers.getMultiWalletBalances({
      walletAddresses,
    });

    expect(result).toEqual({
      isError: true,
      structuredContent: {
        error: {
          code: "BATCH_LIMIT_EXCEEDED",
          message: `A maximum of ${MAX_WALLET_BATCH_SIZE} unique wallet addresses can be requested at once.`,
        },
      },
      content: [
        {
          type: "text",
          text: `A maximum of ${MAX_WALLET_BATCH_SIZE} unique wallet addresses can be requested at once.`,
        },
      ],
    });
  });
});
