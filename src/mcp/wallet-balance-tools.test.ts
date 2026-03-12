import { describe, expect, it, vi } from "vitest";

import { MAX_WALLET_BATCH_SIZE } from "@/lib/wallet-balances";

import { createWalletBalanceToolHandlers } from "./wallet-balance-tools";

const WALLET_A = "0x1234567890abcdef1234567890abcdef12345678";
const FIXED_NOW = new Date("2026-03-11T17:00:00.000Z");
const INVALID_WALLET = "not-an-address";

type TestDependencies = {
  fetchPortfolioValue: (walletAddress: string) => Promise<number>;
  fetchUsdcBalance: (walletAddress: string) => Promise<number>;
  now: () => Date;
};

function createDeps(overrides: Partial<TestDependencies> = {}) {
  return {
    fetchPortfolioValue: vi.fn(async () => 125.5),
    fetchUsdcBalance: vi.fn(async () => 10.25),
    now: () => FIXED_NOW,
    ...overrides,
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

  it("marks invalid single-wallet requests as MCP errors", async () => {
    const handlers = createWalletBalanceToolHandlers(createDeps());

    const result = await handlers.getWalletBalance({
      walletAddress: INVALID_WALLET,
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      chain: "polygon",
      wallet: {
        walletAddress: INVALID_WALLET,
        error: {
          code: "INVALID_ADDRESS",
          message: "Wallet address must be a 42-character 0x-prefixed hex string.",
        },
      },
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: `Failed to fetch wallet balance for ${INVALID_WALLET} on polygon. Wallet address must be a 42-character 0x-prefixed hex string.`,
      },
    ]);
  });

  it("keeps partial single-wallet upstream failures non-fatal for MCP clients", async () => {
    const handlers = createWalletBalanceToolHandlers(
      createDeps({
        fetchUsdcBalance: vi.fn(async () => {
          throw new Error("Polygon RPC unavailable");
        }),
      }),
    );

    const result = await handlers.getWalletBalance({
      walletAddress: WALLET_A,
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      wallet: {
        walletAddress: WALLET_A,
        error: {
          code: "PARTIAL_UPSTREAM_FAILURE",
          message: "Some upstream balance sources failed for this wallet.",
        },
      },
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: `Fetched partial wallet balance for ${WALLET_A} on polygon. Some upstream balance sources failed for this wallet.`,
      },
    ]);
  });

  it("marks batch responses as MCP errors when every wallet result includes an error", async () => {
    const handlers = createWalletBalanceToolHandlers(createDeps());

    const result = await handlers.getMultiWalletBalances({
      walletAddresses: [INVALID_WALLET, `${INVALID_WALLET}-2`],
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      summary: {
        requested: 2,
        unique: 2,
        successful: 0,
        failed: 2,
      },
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Failed to fetch balances for 2 wallet(s) on polygon. Every wallet result included an error.",
      },
    ]);
  });

  it("reports partial batch failures without marking the whole MCP call as failed", async () => {
    const handlers = createWalletBalanceToolHandlers(createDeps());

    const result = await handlers.getMultiWalletBalances({
      walletAddresses: [WALLET_A, INVALID_WALLET],
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      summary: {
        requested: 2,
        unique: 2,
        successful: 1,
        failed: 1,
      },
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Fetched balances for 2 wallet(s) on polygon with errors for 1 wallet(s).",
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
