import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import type {
  MultiWalletBalancesResponse,
  SingleWalletBalanceResponse,
  WalletBalanceDependencies,
} from "@/lib/wallet-balances";
import {
  MAX_WALLET_BATCH_SIZE,
  WalletBalanceValidationError,
  getMultiWalletBalances,
  getWalletBalance,
} from "@/lib/wallet-balances";

const chainSchema = z.literal("polygon").optional();

const walletBalanceErrorSourceSchema = z.object({
  source: z.enum(["polymarket-value", "polygon-usdc"]),
  message: z.string(),
});

const walletBalanceErrorSchema = z.object({
  code: z.enum(["INVALID_ADDRESS", "PARTIAL_UPSTREAM_FAILURE", "UPSTREAM_FAILURE"]),
  message: z.string(),
  sources: z.array(walletBalanceErrorSourceSchema).optional(),
});

const walletBalanceLineItemSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  assetType: z.enum(["portfolio", "token"]),
  source: z.enum(["polymarket-value", "polygon-usdc"]),
  amount: z.number(),
  valueUsd: z.number(),
  decimals: z.number().int(),
  tokenAddress: z.string().nullable(),
});

const walletBalanceResultSchema = z.object({
  walletAddress: z.string(),
  chain: z.literal("polygon"),
  timestamp: z.string(),
  totals: z.object({
    usd: z.number(),
    assetsTracked: z.number().int(),
  }),
  tokenBreakdown: z.array(walletBalanceLineItemSchema),
  error: walletBalanceErrorSchema.nullable(),
});

const singleWalletBalanceResponseSchema = z.object({
  chain: z.literal("polygon"),
  timestamp: z.string(),
  wallet: walletBalanceResultSchema,
});

const multiWalletBalancesResponseSchema = z.object({
  chain: z.literal("polygon"),
  timestamp: z.string(),
  wallets: z.array(walletBalanceResultSchema),
  summary: z.object({
    requested: z.number().int(),
    unique: z.number().int(),
    duplicatesRemoved: z.number().int(),
    successful: z.number().int(),
    failed: z.number().int(),
  }),
});

const validationErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(["BATCH_LIMIT_EXCEEDED", "UNSUPPORTED_CHAIN"]),
    message: z.string(),
  }),
});

const singleWalletBalanceToolOutputSchema = z.union([
  singleWalletBalanceResponseSchema,
  validationErrorResponseSchema,
]);

const multiWalletBalancesToolOutputSchema = z.union([
  multiWalletBalancesResponseSchema,
  validationErrorResponseSchema,
]);

export const getWalletBalanceInputSchema = {
  walletAddress: z.string().describe("The EVM wallet address to inspect."),
  chain: chainSchema.describe('Optional chain name. Only "polygon" is currently supported.'),
};

export const getMultiWalletBalancesInputSchema = {
  walletAddresses: z
    .array(z.string())
    .min(1)
    .describe("A list of wallet addresses. Duplicates are removed case-insensitively before fetching."),
  chain: chainSchema.describe('Optional chain name. Only "polygon" is currently supported.'),
};

export type McpToolResponse<TStructuredContent> = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: TStructuredContent;
  isError?: true;
};

export function createWalletBalanceToolHandlers(dependencies: Partial<WalletBalanceDependencies> = {}) {
  return {
    async getWalletBalance(args: { walletAddress: string; chain?: string }) {
      try {
        const response = await getWalletBalance(args, dependencies);
        return createSingleWalletToolResponse(response);
      } catch (error) {
        if (error instanceof WalletBalanceValidationError) {
          return createValidationErrorResponse(error);
        }

        throw error;
      }
    },

    async getMultiWalletBalances(args: { walletAddresses: string[]; chain?: string }) {
      try {
        const response = await getMultiWalletBalances(args, dependencies);
        return createMultiWalletToolResponse(response);
      } catch (error) {
        if (error instanceof WalletBalanceValidationError) {
          return createValidationErrorResponse(error);
        }

        throw error;
      }
    },
  };
}

export function registerWalletBalanceTools(
  server: McpServer,
  dependencies: Partial<WalletBalanceDependencies> = {},
) {
  const handlers = createWalletBalanceToolHandlers(dependencies);

  server.registerTool(
    "get_wallet_balance",
    {
      title: "Get Wallet Balance",
      description:
        "Fetch the normalized Polymarket portfolio value plus Polygon USDC.e balance for a single wallet.",
      inputSchema: getWalletBalanceInputSchema,
      outputSchema: singleWalletBalanceToolOutputSchema,
    },
    handlers.getWalletBalance,
  );

  server.registerTool(
    "get_multi_wallet_balances",
    {
      title: "Get Multi Wallet Balances",
      description:
        `Fetch normalized balances for up to ${MAX_WALLET_BATCH_SIZE} unique wallets. Duplicate addresses are removed automatically.`,
      inputSchema: getMultiWalletBalancesInputSchema,
      outputSchema: multiWalletBalancesToolOutputSchema,
    },
    handlers.getMultiWalletBalances,
  );

  return handlers;
}

function createValidationErrorResponse(error: WalletBalanceValidationError) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: error.message,
      },
    ],
    structuredContent: {
      error: {
        code: error.code,
        message: error.message,
      },
    },
  } satisfies McpToolResponse<z.infer<typeof validationErrorResponseSchema>>;
}

function createSingleWalletToolResponse(response: SingleWalletBalanceResponse) {
  const walletError = response.wallet.error;

  if (walletError === null) {
    return createTextToolResponse(
      response,
      `Fetched wallet balance for ${response.wallet.walletAddress} on ${response.chain}.`,
    );
  }

  if (walletError.code === "PARTIAL_UPSTREAM_FAILURE") {
    return createTextToolResponse(
      response,
      `Fetched partial wallet balance for ${response.wallet.walletAddress} on ${response.chain}. ${walletError.message}`,
    );
  }

  return createTextToolResponse(
    response,
    `Failed to fetch wallet balance for ${response.wallet.walletAddress} on ${response.chain}. ${walletError.message}`,
    true,
  );
}

function createMultiWalletToolResponse(response: MultiWalletBalancesResponse) {
  if (response.summary.failed === 0) {
    return createTextToolResponse(
      response,
      `Fetched balances for ${response.wallets.length} wallet(s) on ${response.chain}.`,
    );
  }

  if (response.summary.successful === 0) {
    return createTextToolResponse(
      response,
      `Failed to fetch balances for ${response.wallets.length} wallet(s) on ${response.chain}. Every wallet result included an error.`,
      true,
    );
  }

  return createTextToolResponse(
    response,
    `Fetched balances for ${response.wallets.length} wallet(s) on ${response.chain} with errors for ${response.summary.failed} wallet(s).`,
  );
}

function createTextToolResponse<TStructuredContent>(
  structuredContent: TStructuredContent,
  text: string,
  isError = false,
): McpToolResponse<TStructuredContent> {
  return {
    ...(isError ? { isError: true as const } : {}),
    content: [
      {
        type: "text",
        text,
      },
    ],
    structuredContent,
  };
}
