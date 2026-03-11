export const DEFAULT_WALLET_CHAIN = "polygon";
export const MAX_WALLET_BATCH_SIZE = 25;
export const USDC_E_TOKEN_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

const WALLET_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const POLYMARKET_DATA_API = "https://data-api.polymarket.com";
const POLYGON_RPC = "https://polygon-bor-rpc.publicnode.com";

export type SupportedWalletChain = typeof DEFAULT_WALLET_CHAIN;
export type WalletBalanceSource = "polymarket-value" | "polygon-usdc";
export type WalletBalanceErrorCode =
  | "INVALID_ADDRESS"
  | "PARTIAL_UPSTREAM_FAILURE"
  | "UPSTREAM_FAILURE"
  | "BATCH_LIMIT_EXCEEDED"
  | "UNSUPPORTED_CHAIN";

export interface WalletBalanceLineItem {
  symbol: string;
  name: string;
  assetType: "portfolio" | "token";
  source: WalletBalanceSource;
  amount: number;
  valueUsd: number;
  decimals: number;
  tokenAddress: string | null;
}

export interface WalletBalanceErrorSource {
  source: WalletBalanceSource;
  message: string;
}

export interface WalletBalanceError {
  code: Extract<WalletBalanceErrorCode, "INVALID_ADDRESS" | "PARTIAL_UPSTREAM_FAILURE" | "UPSTREAM_FAILURE">;
  message: string;
  sources?: WalletBalanceErrorSource[];
}

export interface WalletBalanceResult {
  walletAddress: string;
  chain: SupportedWalletChain;
  timestamp: string;
  totals: {
    usd: number;
    assetsTracked: number;
  };
  tokenBreakdown: WalletBalanceLineItem[];
  error: WalletBalanceError | null;
}

export interface SingleWalletBalanceResponse {
  chain: SupportedWalletChain;
  timestamp: string;
  wallet: WalletBalanceResult;
}

export interface MultiWalletBalancesResponse {
  chain: SupportedWalletChain;
  timestamp: string;
  wallets: WalletBalanceResult[];
  summary: {
    requested: number;
    unique: number;
    duplicatesRemoved: number;
    successful: number;
    failed: number;
  };
}

export interface WalletBalanceDependencies {
  fetchPortfolioValue: (walletAddress: string, chain: SupportedWalletChain) => Promise<number>;
  fetchUsdcBalance: (walletAddress: string, chain: SupportedWalletChain) => Promise<number>;
  now: () => Date;
}

const defaultDependencies: WalletBalanceDependencies = {
  fetchPortfolioValue: (walletAddress) => fetchPortfolioValue(walletAddress),
  fetchUsdcBalance: (walletAddress) => fetchPolygonUsdcBalance(walletAddress),
  now: () => new Date(),
};

export class WalletBalanceValidationError extends Error {
  code: Extract<WalletBalanceErrorCode, "BATCH_LIMIT_EXCEEDED" | "UNSUPPORTED_CHAIN">;

  constructor(
    code: Extract<WalletBalanceErrorCode, "BATCH_LIMIT_EXCEEDED" | "UNSUPPORTED_CHAIN">,
    message: string,
  ) {
    super(message);
    this.name = "WalletBalanceValidationError";
    this.code = code;
  }
}

export async function getWalletBalance(
  input: { walletAddress: string; chain?: string },
  dependencies: Partial<WalletBalanceDependencies> = {},
): Promise<SingleWalletBalanceResponse> {
  const chain = resolveChain(input.chain);
  const deps = resolveDependencies(dependencies);
  const timestamp = deps.now().toISOString();

  return {
    chain,
    timestamp,
    wallet: await buildWalletBalanceResult(input.walletAddress, chain, timestamp, deps),
  };
}

export async function getMultiWalletBalances(
  input: { walletAddresses: string[]; chain?: string },
  dependencies: Partial<WalletBalanceDependencies> = {},
): Promise<MultiWalletBalancesResponse> {
  const chain = resolveChain(input.chain);
  const deps = resolveDependencies(dependencies);
  const timestamp = deps.now().toISOString();
  const walletAddresses = dedupeWalletAddresses(input.walletAddresses);

  if (walletAddresses.length > MAX_WALLET_BATCH_SIZE) {
    throw new WalletBalanceValidationError(
      "BATCH_LIMIT_EXCEEDED",
      `A maximum of ${MAX_WALLET_BATCH_SIZE} unique wallet addresses can be requested at once.`,
    );
  }

  const wallets = await Promise.all(
    walletAddresses.map((walletAddress) => buildWalletBalanceResult(walletAddress, chain, timestamp, deps)),
  );
  const successful = wallets.filter((wallet) => wallet.error === null).length;

  return {
    chain,
    timestamp,
    wallets,
    summary: {
      requested: input.walletAddresses.length,
      unique: walletAddresses.length,
      duplicatesRemoved: input.walletAddresses.length - walletAddresses.length,
      successful,
      failed: wallets.length - successful,
    },
  };
}

export function isValidWalletAddress(walletAddress: string): boolean {
  return WALLET_ADDRESS_REGEX.test(walletAddress.trim());
}

function resolveDependencies(dependencies: Partial<WalletBalanceDependencies>): WalletBalanceDependencies {
  return {
    fetchPortfolioValue: dependencies.fetchPortfolioValue ?? defaultDependencies.fetchPortfolioValue,
    fetchUsdcBalance: dependencies.fetchUsdcBalance ?? defaultDependencies.fetchUsdcBalance,
    now: dependencies.now ?? defaultDependencies.now,
  };
}

function resolveChain(chain?: string): SupportedWalletChain {
  const resolvedChain = chain?.trim().toLowerCase() || DEFAULT_WALLET_CHAIN;

  if (resolvedChain !== DEFAULT_WALLET_CHAIN) {
    throw new WalletBalanceValidationError(
      "UNSUPPORTED_CHAIN",
      `Unsupported chain "${chain}". Only "${DEFAULT_WALLET_CHAIN}" is currently supported.`,
    );
  }

  return DEFAULT_WALLET_CHAIN;
}

function dedupeWalletAddresses(walletAddresses: string[]): string[] {
  const seen = new Set<string>();
  const uniqueWalletAddresses: string[] = [];

  for (const walletAddress of walletAddresses) {
    const normalizedWalletAddress = walletAddress.trim();
    const dedupeKey = normalizedWalletAddress.toLowerCase();

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    uniqueWalletAddresses.push(normalizedWalletAddress);
  }

  return uniqueWalletAddresses;
}

async function buildWalletBalanceResult(
  walletAddress: string,
  chain: SupportedWalletChain,
  timestamp: string,
  dependencies: WalletBalanceDependencies,
): Promise<WalletBalanceResult> {
  const normalizedWalletAddress = walletAddress.trim();

  if (!isValidWalletAddress(normalizedWalletAddress)) {
    return buildEmptyWalletBalanceResult(normalizedWalletAddress, chain, timestamp, {
      code: "INVALID_ADDRESS",
      message: "Wallet address must be a 42-character 0x-prefixed hex string.",
    });
  }

  const [portfolioResult, usdcResult] = await Promise.all([
    resolveLineItem("polymarket-value", () =>
      dependencies.fetchPortfolioValue(normalizedWalletAddress, chain),
    ),
    resolveLineItem("polygon-usdc", () => dependencies.fetchUsdcBalance(normalizedWalletAddress, chain)),
  ]);

  const tokenBreakdown = [portfolioResult.item, usdcResult.item].filter(Boolean) as WalletBalanceLineItem[];
  const sourceErrors = [portfolioResult.error, usdcResult.error].filter(Boolean) as WalletBalanceErrorSource[];
  const totalUsd = roundUsd(tokenBreakdown.reduce((sum, item) => sum + item.valueUsd, 0));

  return {
    walletAddress: normalizedWalletAddress,
    chain,
    timestamp,
    totals: {
      usd: totalUsd,
      assetsTracked: tokenBreakdown.length,
    },
    tokenBreakdown,
    error: buildWalletError(sourceErrors),
  };
}

async function resolveLineItem(
  source: WalletBalanceSource,
  fetcher: () => Promise<number>,
): Promise<{ item?: WalletBalanceLineItem; error?: WalletBalanceErrorSource }> {
  try {
    const amount = roundUsd(assertFiniteNumber(await fetcher(), source));

    if (source === "polymarket-value") {
      return {
        item: {
          symbol: "POLYMARKET_PORTFOLIO",
          name: "Polymarket portfolio value",
          assetType: "portfolio",
          source,
          amount,
          valueUsd: amount,
          decimals: 2,
          tokenAddress: null,
        },
      };
    }

    return {
      item: {
        symbol: "USDC.e",
        name: "USD Coin (PoS)",
        assetType: "token",
        source,
        amount,
        valueUsd: amount,
        decimals: 6,
        tokenAddress: USDC_E_TOKEN_ADDRESS,
      },
    };
  } catch (error) {
    return {
      error: {
        source,
        message: getErrorMessage(error),
      },
    };
  }
}

function buildEmptyWalletBalanceResult(
  walletAddress: string,
  chain: SupportedWalletChain,
  timestamp: string,
  error: WalletBalanceError,
): WalletBalanceResult {
  return {
    walletAddress,
    chain,
    timestamp,
    totals: {
      usd: 0,
      assetsTracked: 0,
    },
    tokenBreakdown: [],
    error,
  };
}

function buildWalletError(sourceErrors: WalletBalanceErrorSource[]): WalletBalanceError | null {
  if (sourceErrors.length === 0) {
    return null;
  }

  if (sourceErrors.length === 2) {
    return {
      code: "UPSTREAM_FAILURE",
      message: "All upstream balance sources failed for this wallet.",
      sources: sourceErrors,
    };
  }

  return {
    code: "PARTIAL_UPSTREAM_FAILURE",
    message: "Some upstream balance sources failed for this wallet.",
    sources: sourceErrors,
  };
}

function assertFiniteNumber(value: number, source: WalletBalanceSource): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Upstream ${source} balance was not a finite number.`);
  }

  return value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown upstream error.";
}

function roundUsd(value: number): number {
  return Number(value.toFixed(6));
}

async function fetchPortfolioValue(walletAddress: string): Promise<number> {
  const url = new URL(`${POLYMARKET_DATA_API}/value`);
  url.searchParams.set("user", walletAddress);

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Polymarket API error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();

  if (Array.isArray(data) && data.length > 0) {
    return assertFiniteNumber(Number(data[0]?.value ?? 0), "polymarket-value");
  }

  if (typeof data === "number") {
    return assertFiniteNumber(data, "polymarket-value");
  }

  return 0;
}

async function fetchPolygonUsdcBalance(walletAddress: string): Promise<number> {
  const paddedAddress = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
  const data = `0x70a08231${paddedAddress}`;

  const response = await fetch(POLYGON_RPC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to: USDC_E_TOKEN_ADDRESS, data }, "latest"],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Polygon RPC error (${response.status}): ${await response.text()}`);
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(json.error.message ?? "Polygon RPC returned an error.");
  }

  if (typeof json.result !== "string") {
    throw new Error("Polygon RPC returned an invalid balance response.");
  }

  return parseInt(json.result, 16) / 1e6;
}
