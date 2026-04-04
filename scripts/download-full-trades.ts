import {
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";

import {
  buildChunkFileName,
  buildLogKey,
  buildTradeRow,
  buildWalletTopic,
  decodeOrderFilledLog,
  ORDER_FILLED_TOPIC,
  parseGammaStringList,
  POLYMARKET_EXCHANGE_ADDRESSES,
  type FullTradeRow,
  type RpcLog,
} from "../src/lib/fullTradeHistory";

interface CliOptions {
  wallet: string;
  output: string;
  rpcUrl: string;
  chunkSize: number;
  fromBlock?: number;
  toBlock?: number;
  metadata: boolean;
}

interface RpcPayload {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown[];
}

interface TokenMetadata {
  conditionId?: string;
  title?: string;
  slug?: string;
  eventSlug?: string;
  outcome?: string;
  icon?: string;
}

const DEFAULT_RPC_URL = "";
const DEFAULT_FETCH_TIMEOUT_MS = 60_000;
const DEFAULT_RETRIES = 4;
const DEFAULT_BLOCK_TIMESTAMP_CONCURRENCY = 24;

let rpcId = 0;

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  let wallet = "";
  let output = "";
  let rpcUrl = process.env.POLYGON_RPC_URL || DEFAULT_RPC_URL;
  let chunkSize = 250_000;
  let fromBlock: number | undefined;
  let toBlock: number | undefined;
  let metadata = true;

  while (args.length > 0) {
    const arg = args.shift();
    switch (arg) {
      case "--wallet":
      case "-w":
        wallet = args.shift() || "";
        break;
      case "--output":
      case "-o":
        output = args.shift() || "";
        break;
      case "--rpc":
        rpcUrl = args.shift() || rpcUrl;
        break;
      case "--chunk-size":
        chunkSize = Number(args.shift() || chunkSize);
        break;
      case "--from-block":
        fromBlock = Number(args.shift());
        break;
      case "--to-block":
        toBlock = Number(args.shift());
        break;
      case "--no-metadata":
        metadata = false;
        break;
      case "--help":
      case "-h":
        printUsage();
        return process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!wallet) {
    throw new Error("Missing required --wallet argument");
  }

  if (!rpcUrl) {
    throw new Error(
      "Missing archive-capable Polygon RPC URL. Set POLYGON_RPC_URL or pass --rpc.",
    );
  }

  const normalizedWallet = wallet.toLowerCase();
  const normalizedOutput =
    output ||
    `./artifacts/${normalizedWallet}-full-trades-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw new Error("Chunk size must be a positive number");
  }

  return {
    wallet: normalizedWallet,
    output: normalizedOutput,
    rpcUrl,
    chunkSize,
    fromBlock,
    toBlock,
    metadata,
  };
}

function printUsage() {
  console.log(`Usage: npm run download:full-trades -- --wallet <address> [options]

Options:
  --wallet, -w       Proxy wallet address to scan
  --output, -o       Output path (.json or .csv)
  --rpc              Archive-capable Polygon RPC URL
  --chunk-size       Block range per scan request (default: 250000)
  --from-block       Override start block
  --to-block         Override end block
  --no-metadata      Skip Gamma token metadata enrichment`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseProviderHint(error: unknown): { fromBlock: number; toBlock: number } | null {
  const match = extractErrorMessage(error).match(
    /Try with this block range \[(0x[0-9a-fA-F]+), (0x[0-9a-fA-F]+)\]/,
  );
  if (!match) {
    return null;
  }

  return {
    fromBlock: Number(BigInt(match[1])),
    toBlock: Number(BigInt(match[2])),
  };
}

async function rpcCall<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
  attempt = 1,
): Promise<T> {
  const payload: RpcPayload = {
    jsonrpc: "2.0",
    id: ++rpcId,
    method,
    params,
  };

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`RPC HTTP ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as { error?: unknown; result?: T };
    if (body.error) {
      const message =
        typeof body.error === "string"
          ? body.error
          : body.error &&
              typeof body.error === "object" &&
              "message" in body.error &&
              typeof body.error.message === "string"
            ? body.error.message
            : JSON.stringify(body.error);
      throw new Error(`RPC ${method} failed: ${message}`);
    }

    return body.result as T;
  } catch (error) {
    if (attempt >= DEFAULT_RETRIES) {
      throw error;
    }

    await delay(500 * 2 ** (attempt - 1));
    return rpcCall<T>(rpcUrl, method, params, attempt + 1);
  }
}

async function getLatestBlock(rpcUrl: string): Promise<number> {
  const hex = await rpcCall<string>(rpcUrl, "eth_blockNumber", []);
  return Number(BigInt(hex));
}

async function hasContractCode(
  rpcUrl: string,
  address: string,
  blockNumber: number,
): Promise<boolean> {
  const code = await rpcCall<string>(rpcUrl, "eth_getCode", [
    address,
    toHex(blockNumber),
  ]);
  return code !== "0x";
}

async function findDeploymentBlock(
  rpcUrl: string,
  address: string,
  latestBlock: number,
): Promise<number> {
  let low = 0;
  let high = latestBlock;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (await hasContractCode(rpcUrl, address, mid)) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

function toHex(value: number): string {
  return `0x${value.toString(16)}`;
}

async function fetchOrderFilledLogs(
  rpcUrl: string,
  exchange: string,
  fromBlock: number,
  toBlock: number,
  walletTopic: string,
): Promise<RpcLog[]> {
  try {
    return await rpcCall<RpcLog[]>(rpcUrl, "eth_getLogs", [
      {
        address: exchange,
        fromBlock: toHex(fromBlock),
        toBlock: toHex(toBlock),
        topics: [ORDER_FILLED_TOPIC, null, walletTopic],
      },
    ]);
  } catch (error) {
    if (fromBlock === toBlock) {
      throw error;
    }

    const providerHint = parseProviderHint(error);
    const midpoint =
      providerHint &&
      providerHint.fromBlock >= fromBlock &&
      providerHint.toBlock < toBlock
        ? providerHint.toBlock
        : Math.floor((fromBlock + toBlock) / 2);

    console.log(
      `  splitting ${exchange} blocks ${fromBlock}-${toBlock} after error: ${extractErrorMessage(
        error,
      )}`,
    );

    const left = await fetchOrderFilledLogs(
      rpcUrl,
      exchange,
      fromBlock,
      midpoint,
      walletTopic,
    );
    const right = await fetchOrderFilledLogs(
      rpcUrl,
      exchange,
      midpoint + 1,
      toBlock,
      walletTopic,
    );
    return left.concat(right);
  }
}

async function getBlockTimestamp(
  rpcUrl: string,
  blockNumber: number,
  cache: Map<number, number>,
): Promise<number> {
  const cached = cache.get(blockNumber);
  if (cached != null) {
    return cached;
  }

  const block = await rpcCall<{ timestamp: string }>(
    rpcUrl,
    "eth_getBlockByNumber",
    [toHex(blockNumber), false],
  );
  const timestamp = Number(BigInt(block.timestamp));
  cache.set(blockNumber, timestamp);
  return timestamp;
}

async function populateBlockTimestamps(
  rpcUrl: string,
  blockNumbers: number[],
  cache: Map<number, number>,
): Promise<void> {
  const pending = Array.from(new Set(blockNumbers)).filter(
    (blockNumber) => !cache.has(blockNumber),
  );
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < pending.length) {
      const blockNumber = pending[nextIndex];
      nextIndex += 1;
      await getBlockTimestamp(rpcUrl, blockNumber, cache);
    }
  }

  const workerCount = Math.min(
    DEFAULT_BLOCK_TIMESTAMP_CONCURRENCY,
    pending.length,
  );
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

async function fetchTokenMetadata(
  tokenIds: string[],
): Promise<Map<string, TokenMetadata>> {
  const tokenMetadata = new Map<string, TokenMetadata>();

  for (let index = 0; index < tokenIds.length; index += 50) {
    const chunk = tokenIds.slice(index, index + 50);
    const url = new URL("https://gamma-api.polymarket.com/markets");
    url.searchParams.set("clob_token_ids", chunk.join(","));
    url.searchParams.set("limit", String(chunk.length));

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Gamma metadata request failed: HTTP ${response.status}`,
      );
    }

    const markets = (await response.json()) as Array<Record<string, unknown>>;
    for (const market of markets) {
      const marketTokenIds = parseGammaStringList(market.clobTokenIds);
      const outcomes = parseGammaStringList(market.outcomes);

      marketTokenIds.forEach((tokenId, offset) => {
        tokenMetadata.set(tokenId, {
          conditionId:
            typeof market.conditionId === "string"
              ? market.conditionId
              : undefined,
          title:
            typeof market.question === "string"
              ? market.question
              : typeof market.title === "string"
                ? market.title
                : undefined,
          slug: typeof market.slug === "string" ? market.slug : undefined,
          eventSlug: typeof market.slug === "string" ? market.slug : undefined,
          outcome: outcomes[offset],
          icon: typeof market.icon === "string" ? market.icon : undefined,
        });
      });
    }
  }

  return tokenMetadata;
}

function enrichTrades(
  trades: FullTradeRow[],
  metadata: Map<string, TokenMetadata>,
): FullTradeRow[] {
  return trades.map((trade) => ({
    ...trade,
    ...metadata.get(trade.asset),
  }));
}

function sortTrades(trades: FullTradeRow[]): FullTradeRow[] {
  return trades.sort((left, right) => {
    if (left.blockNumber !== right.blockNumber) {
      return left.blockNumber - right.blockNumber;
    }

    return left.logIndex - right.logIndex;
  });
}

function toCsv(trades: FullTradeRow[]): string {
  const headers = [
    "proxyWallet",
    "side",
    "asset",
    "size",
    "price",
    "timestamp",
    "blockNumber",
    "transactionHash",
    "logIndex",
    "makerAmountFilled",
    "takerAmountFilled",
    "fee",
    "conditionId",
    "title",
    "slug",
    "eventSlug",
    "outcome",
    "icon",
  ] as const;

  const escape = (value: unknown) => {
    const stringValue = value == null ? "" : String(value);
    if (
      stringValue.includes(",") ||
      stringValue.includes("\"") ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replaceAll("\"", "\"\"")}"`;
    }
    return stringValue;
  };

  return [
    headers.join(","),
    ...trades.map((trade) =>
      headers.map((header) => escape(trade[header])).join(","),
    ),
  ].join("\n");
}

async function writeOutput(outputPath: string, trades: FullTradeRow[]) {
  const absolutePath = resolve(outputPath);
  await mkdir(dirname(absolutePath), { recursive: true });

  if (extname(absolutePath).toLowerCase() === ".csv") {
    await writeFile(absolutePath, toCsv(trades), "utf8");
    return absolutePath;
  }

  await writeFile(absolutePath, JSON.stringify(trades, null, 2), "utf8");
  return absolutePath;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function getPartsDirectory(outputPath: string): string {
  return `${resolve(outputPath)}.parts`;
}

async function scanChunkTrades(
  options: CliOptions,
  exchange: string,
  fromBlock: number,
  toBlock: number,
  walletTopic: string,
  blockTimestampCache: Map<number, number>,
): Promise<FullTradeRow[]> {
  const logs = await fetchOrderFilledLogs(
    options.rpcUrl,
    exchange,
    fromBlock,
    toBlock,
    walletTopic,
  );

  console.log(`  ${exchange} blocks ${fromBlock}-${toBlock}: ${logs.length} fills`);

  const sortedLogs = [...logs].sort((left, right) => {
    const leftBlock = Number(BigInt(left.blockNumber));
    const rightBlock = Number(BigInt(right.blockNumber));
    if (leftBlock !== rightBlock) {
      return leftBlock - rightBlock;
    }

    return Number(BigInt(left.logIndex)) - Number(BigInt(right.logIndex));
  });

  const decodedLogs = sortedLogs.map((log) => decodeOrderFilledLog(log));
  await populateBlockTimestamps(
    options.rpcUrl,
    decodedLogs.map((decoded) => decoded.blockNumber),
    blockTimestampCache,
  );

  const trades: FullTradeRow[] = [];
  for (const decoded of decodedLogs) {
    const timestamp = blockTimestampCache.get(decoded.blockNumber);
    if (timestamp == null) {
      throw new Error(
        `Missing timestamp for block ${decoded.blockNumber} after cache population`,
      );
    }
    trades.push(buildTradeRow(decoded, timestamp));
  }

  return trades;
}

async function writeChunkTrades(
  partPath: string,
  trades: FullTradeRow[],
): Promise<void> {
  const tempPath = `${partPath}.tmp`;
  await writeFile(tempPath, JSON.stringify(trades), "utf8");
  await rename(tempPath, partPath);
}

async function scanToChunkFiles(
  options: CliOptions,
  startBlock: number,
  latestBlock: number,
  walletTopic: string,
): Promise<string[]> {
  const partsDir = getPartsDirectory(options.output);
  await mkdir(partsDir, { recursive: true });

  const blockTimestampCache = new Map<number, number>();
  const partPaths: string[] = [];

  for (const exchange of POLYMARKET_EXCHANGE_ADDRESSES) {
    for (let from = startBlock; from <= latestBlock; from += options.chunkSize) {
      const to = Math.min(latestBlock, from + options.chunkSize - 1);
      const partPath = join(partsDir, buildChunkFileName(exchange, from, to));
      partPaths.push(partPath);

      if (await fileExists(partPath)) {
        console.log(
          `  skipping ${exchange} blocks ${from}-${to}: chunk already saved`,
        );
        continue;
      }

      const trades = await scanChunkTrades(
        options,
        exchange,
        from,
        to,
        walletTopic,
        blockTimestampCache,
      );
      await writeChunkTrades(partPath, trades);
      console.log(`  wrote ${trades.length} trades to ${partPath}`);
    }
  }

  return partPaths;
}

async function loadTradesFromParts(
  partPaths: string[],
): Promise<FullTradeRow[]> {
  const tradeMap = new Map<string, FullTradeRow>();

  for (const partPath of partPaths) {
    if (!(await fileExists(partPath))) {
      throw new Error(`Missing chunk file: ${partPath}`);
    }

    const trades = JSON.parse(
      await readFile(partPath, "utf8"),
    ) as FullTradeRow[];
    for (const trade of trades) {
      tradeMap.set(buildLogKey(trade.transactionHash, trade.logIndex), trade);
    }
  }

  return sortTrades(Array.from(tradeMap.values()));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const latestBlock = options.toBlock ?? (await getLatestBlock(options.rpcUrl));
  const deploymentBlocks =
    options.fromBlock == null
      ? await Promise.all(
          POLYMARKET_EXCHANGE_ADDRESSES.map((address) =>
            findDeploymentBlock(options.rpcUrl, address, latestBlock),
          ),
        )
      : [];
  const startBlock = options.fromBlock ?? Math.min(...deploymentBlocks);
  const walletTopic = buildWalletTopic(options.wallet);

  console.log(
    `Scanning Polymarket fills for ${options.wallet} from block ${startBlock} to ${latestBlock}...`,
  );

  const partPaths = await scanToChunkFiles(
    options,
    startBlock,
    latestBlock,
    walletTopic,
  );
  const trades = await loadTradesFromParts(partPaths);
  const enrichedTrades = options.metadata
    ? enrichTrades(
        trades,
        await fetchTokenMetadata(
          Array.from(new Set(trades.map((trade) => trade.asset))),
        ),
      )
    : trades;
  const outputPath = await writeOutput(options.output, enrichedTrades);

  console.log(`Saved ${enrichedTrades.length} trades to ${outputPath}`);
  console.log(`Chunk cache retained in ${getPartsDirectory(options.output)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
