import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAX_WALLET_BATCH_SIZE,
  WalletBalanceValidationError,
  getMultiWalletBalances,
  getWalletBalance,
} from "./wallet-balances";

const WALLET_A = "0x1234567890abcdef1234567890abcdef12345678";
const WALLET_B = "0xabcdef1234567890abcdef1234567890abcdef12";
const FIXED_NOW = new Date("2026-03-11T16:45:00.000Z");

function createDeps(overrides?: Partial<Parameters<typeof getWalletBalance>[1]>) {
  return {
    fetchPortfolioValue: vi.fn(async (walletAddress: string) => (walletAddress === WALLET_A ? 125.5 : 42)),
    fetchUsdcBalance: vi.fn(async (walletAddress: string) => (walletAddress === WALLET_A ? 10.25 : 5)),
    now: () => FIXED_NOW,
    ...overrides,
  };
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("wallet balances", () => {
  it("returns a normalized balance response for a single wallet", async () => {
    const deps = createDeps();

    const result = await getWalletBalance({ walletAddress: WALLET_A }, deps);

    expect(result).toEqual({
      chain: "polygon",
      timestamp: FIXED_NOW.toISOString(),
      wallet: {
        walletAddress: WALLET_A,
        chain: "polygon",
        timestamp: FIXED_NOW.toISOString(),
        totals: {
          usd: 135.75,
          assetsTracked: 2,
        },
        tokenBreakdown: [
          {
            symbol: "POLYMARKET_PORTFOLIO",
            name: "Polymarket portfolio value",
            assetType: "portfolio",
            source: "polymarket-value",
            amount: 125.5,
            valueUsd: 125.5,
            decimals: 2,
            tokenAddress: null,
          },
          {
            symbol: "USDC.e",
            name: "USD Coin (PoS)",
            assetType: "token",
            source: "polygon-usdc",
            amount: 10.25,
            valueUsd: 10.25,
            decimals: 6,
            tokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
          },
        ],
        error: null,
      },
    });
  });

  it("returns unique wallet balances for a multi-wallet request", async () => {
    const deps = createDeps();

    const result = await getMultiWalletBalances(
      {
        walletAddresses: [WALLET_A, WALLET_B, WALLET_A.toUpperCase()],
      },
      deps,
    );

    expect(result.chain).toBe("polygon");
    expect(result.timestamp).toBe(FIXED_NOW.toISOString());
    expect(result.wallets).toHaveLength(2);
    expect(result.wallets.map((wallet) => wallet.walletAddress)).toEqual([WALLET_A, WALLET_B]);
    expect(result.summary).toEqual({
      requested: 3,
      unique: 2,
      duplicatesRemoved: 1,
      successful: 2,
      failed: 0,
    });
    expect(deps.fetchPortfolioValue).toHaveBeenCalledTimes(2);
    expect(deps.fetchUsdcBalance).toHaveBeenCalledTimes(2);
  });

  it("preserves partial failures per wallet in a multi-wallet request", async () => {
    const deps = createDeps({
      fetchPortfolioValue: vi.fn(async (walletAddress: string) => {
        if (walletAddress === WALLET_B) {
          throw new Error("Polymarket value request failed");
        }

        return 125.5;
      }),
    });

    const result = await getMultiWalletBalances(
      {
        walletAddresses: [WALLET_A, WALLET_B],
      },
      deps,
    );

    expect(result.summary).toEqual({
      requested: 2,
      unique: 2,
      duplicatesRemoved: 0,
      successful: 1,
      failed: 1,
    });

    expect(result.wallets[0].error).toBeNull();
    expect(result.wallets[1]).toMatchObject({
      walletAddress: WALLET_B,
      totals: {
        usd: 5,
        assetsTracked: 1,
      },
      tokenBreakdown: [
        {
          symbol: "USDC.e",
          valueUsd: 5,
        },
      ],
      error: {
        code: "PARTIAL_UPSTREAM_FAILURE",
        sources: [
          {
            source: "polymarket-value",
            message: "Polymarket value request failed",
          },
        ],
      },
    });
  });

  it("returns an invalid-address error without calling upstream fetchers", async () => {
    const deps = createDeps();

    const result = await getWalletBalance({ walletAddress: "not-an-address" }, deps);

    expect(result.wallet).toEqual({
      walletAddress: "not-an-address",
      chain: "polygon",
      timestamp: FIXED_NOW.toISOString(),
      totals: {
        usd: 0,
        assetsTracked: 0,
      },
      tokenBreakdown: [],
      error: {
        code: "INVALID_ADDRESS",
        message: "Wallet address must be a 42-character 0x-prefixed hex string.",
      },
    });
    expect(deps.fetchPortfolioValue).not.toHaveBeenCalled();
    expect(deps.fetchUsdcBalance).not.toHaveBeenCalled();
  });

  it("returns an upstream failure error when all sources fail", async () => {
    const deps = createDeps({
      fetchPortfolioValue: vi.fn(async () => {
        throw new Error("Polymarket API unavailable");
      }),
      fetchUsdcBalance: vi.fn(async () => {
        throw new Error("Polygon RPC unavailable");
      }),
    });

    const result = await getWalletBalance({ walletAddress: WALLET_A }, deps);

    expect(result.wallet).toMatchObject({
      walletAddress: WALLET_A,
      totals: {
        usd: 0,
        assetsTracked: 0,
      },
      tokenBreakdown: [],
      error: {
        code: "UPSTREAM_FAILURE",
        sources: [
          {
            source: "polymarket-value",
            message: "Polymarket API unavailable",
          },
          {
            source: "polygon-usdc",
            message: "Polygon RPC unavailable",
          },
        ],
      },
    });
  });

  it("clears fetch timeout timers after successful upstream responses", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(async (input: string | URL) => {
      if (String(input).includes("/value")) {
        return {
          ok: true,
          json: async () => [{ value: 125.5 }],
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          result: "0x9c6710",
        }),
      } as Response;
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await getWalletBalance({ walletAddress: WALLET_A });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.wallet.error).toBeNull();
    expect(result.wallet.totals.usd).toBe(135.75);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("turns timed out upstream fetches into upstream failures without leaking timers", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(
      (_input: string | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;

          if (signal?.aborted) {
            reject(signal.reason instanceof Error ? signal.reason : createAbortError("Request aborted."));
            return;
          }

          signal?.addEventListener(
            "abort",
            () => {
              reject(signal.reason instanceof Error ? signal.reason : createAbortError("Request aborted."));
            },
            { once: true },
          );
        }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = getWalletBalance({ walletAddress: WALLET_A });

    await vi.advanceTimersByTimeAsync(20_000);

    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.wallet.error).toMatchObject({
      code: "UPSTREAM_FAILURE",
      message: "All upstream balance sources failed for this wallet.",
    });
    expect(result.wallet.error?.sources).toHaveLength(2);
    expect(result.wallet.error?.sources?.every((source) => source.message.includes("timed out"))).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects requests that exceed the maximum unique wallet batch size", async () => {
    const deps = createDeps();
    const walletAddresses = Array.from({ length: MAX_WALLET_BATCH_SIZE + 1 }, (_, index) =>
      `0x${index.toString(16).padStart(40, "0")}`,
    );

    await expect(
      getMultiWalletBalances(
        {
          walletAddresses,
        },
        deps,
      ),
    ).rejects.toEqual(
      new WalletBalanceValidationError(
        "BATCH_LIMIT_EXCEEDED",
        `A maximum of ${MAX_WALLET_BATCH_SIZE} unique wallet addresses can be requested at once.`,
      ),
    );
  });
});
