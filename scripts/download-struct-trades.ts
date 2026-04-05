import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import { StructClient, type Trade } from "@structbuild/sdk";

import {
  collectOffsetPages,
  normalizeStructTrade,
  toStructTradeCsv,
} from "../src/lib/structTradeHistory";

interface CliOptions {
  wallet: string;
  output: string;
  apiKey: string;
  timeoutMs: number;
  limit: number;
  from?: number;
  to?: number;
  all: boolean;
  sortDesc: boolean;
}

async function readEnvFileValue(key: string): Promise<string | undefined> {
  for (const path of [".env.local", ".env"]) {
    try {
      await access(path);
    } catch {
      continue;
    }

    const contents = await readFile(path, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }

      const name = trimmed.slice(0, separator).trim();
      if (name !== key) {
        continue;
      }

      const rawValue = trimmed.slice(separator + 1).trim();
      return rawValue.replace(/^"(.*)"$/, "$1");
    }
  }

  return undefined;
}

async function parseArgs(argv: string[]): Promise<CliOptions> {
  const args = [...argv];
  let wallet = "";
  let output = "";
  let limit = 250;
  let from: number | undefined;
  let to: number | undefined;
  let all = true;
  let sortDesc = false;

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
      case "--limit":
        limit = Number(args.shift() || limit);
        break;
      case "--from":
        from = Number(args.shift());
        break;
      case "--to":
        to = Number(args.shift());
        break;
      case "--recent-only":
        all = false;
        break;
      case "--sort-desc":
        sortDesc = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        return process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const apiKey =
    process.env.STRUCTBUILD_API_KEY ||
    (await readEnvFileValue("STRUCTBUILD_API_KEY")) ||
    "";
  const timeoutMs = Number(
    process.env.STRUCTBUILD_TIMEOUT_MS ||
      (await readEnvFileValue("STRUCTBUILD_TIMEOUT_MS")) ||
      "10000",
  );

  if (!wallet) {
    throw new Error("Missing required --wallet argument");
  }

  if (!apiKey) {
    throw new Error(
      "Missing STRUCTBUILD_API_KEY. Export it in your shell or add it to .env before running this downloader.",
    );
  }

  if (!Number.isFinite(limit) || limit <= 0 || limit > 250) {
    throw new Error("Limit must be a positive number up to 250");
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("STRUCTBUILD_TIMEOUT_MS must be a positive number");
  }

  const normalizedWallet = wallet.toLowerCase();
  const normalizedOutput =
    output ||
    `./artifacts/${normalizedWallet}-struct-trades-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

  return {
    wallet: normalizedWallet,
    output: normalizedOutput,
    apiKey,
    timeoutMs,
    limit,
    from,
    to,
    all,
    sortDesc,
  };
}

function printUsage() {
  console.log(`Usage: npm run download:struct-trades -- --wallet <address> [options]

Options:
  --wallet, -w       Proxy wallet address to export
  --output, -o       Output path (.json or .csv)
  --limit            Page size per Struct request (default: 250, max: 250)
  --from             Start timestamp in milliseconds
  --to               End timestamp in milliseconds
  --recent-only      Use Struct's default recent window instead of all-time history
  --sort-desc        Download newest-first instead of oldest-first`);
}

async function writeOutput(outputPath: string, trades: ReturnType<typeof normalizeStructTrade>[]) {
  const absolutePath = resolve(outputPath);
  await mkdir(dirname(absolutePath), { recursive: true });

  if (extname(absolutePath).toLowerCase() === ".csv") {
    await writeFile(absolutePath, toStructTradeCsv(trades), "utf8");
    return absolutePath;
  }

  await writeFile(absolutePath, JSON.stringify(trades, null, 2), "utf8");
  return absolutePath;
}

async function main() {
  const options = await parseArgs(process.argv.slice(2));
  const client = new StructClient({
    apiKey: options.apiKey,
    timeout: options.timeoutMs,
    retry: {
      maxRetries: 3,
      initialDelayMs: 500,
    },
  });

  console.log(
    `Downloading Struct trade history for ${options.wallet} with limit ${options.limit}...`,
  );

  const trades = await collectOffsetPages<Trade>({
    limit: options.limit,
    getKey: (trade) => trade.id,
    fetchPage: async (offset, limit) => {
      const response = await client.trader.getTraderTrades({
        address: options.wallet,
        all: options.all,
        limit,
        offset,
        sort_desc: options.sortDesc,
        ...(options.from != null ? { from: options.from } : {}),
        ...(options.to != null ? { to: options.to } : {}),
      });
      console.log(`  offset ${offset}: ${response.data.length} trades`);
      return response.data;
    },
  });

  const normalizedTrades = trades.map((trade) => normalizeStructTrade(trade));
  const outputPath = await writeOutput(options.output, normalizedTrades);

  console.log(`Saved ${normalizedTrades.length} Struct trades to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
