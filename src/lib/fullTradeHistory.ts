export const ORDER_FILLED_TOPIC =
  "0xd0a08e8c493f9c94f29311604c9de1b4e8c8d4c06bd0c789af57f2d65bfec0f6";

export const POLYMARKET_EXCHANGE_ADDRESSES = [
  "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  "0xc5d563a36ae78145c45a50134d48a1215220f80a",
] as const;

export const DECIMAL_SCALE = 1_000_000n;

export interface RpcLog {
  address: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  topics: string[];
  data: string;
}

export interface DecodedOrderFilledLog {
  exchange: string;
  orderHash: string;
  maker: string;
  taker: string;
  makerAssetId: bigint;
  takerAssetId: bigint;
  makerAmountFilled: bigint;
  takerAmountFilled: bigint;
  fee: bigint;
  blockNumber: number;
  logIndex: number;
  transactionHash: string;
}

export interface FullTradeRow {
  proxyWallet: string;
  side: "BUY" | "SELL";
  asset: string;
  size: number;
  price: number;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  makerAmountFilled: string;
  takerAmountFilled: string;
  fee: string;
  conditionId?: string;
  title?: string;
  slug?: string;
  eventSlug?: string;
  outcome?: string;
  icon?: string;
}

export function buildLogKey(transactionHash: string, logIndex: string | number): string {
  return `${transactionHash.toLowerCase()}:${String(logIndex).toLowerCase()}`;
}

export function buildChunkFileName(
  exchange: string,
  fromBlock: number,
  toBlock: number,
): string {
  return `${exchange.toLowerCase()}-${fromBlock}-${toBlock}.json`;
}

function ensureHexAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Invalid wallet address: ${address}`);
  }

  return address.toLowerCase();
}

function decodeTopicAddress(topic: string): string {
  if (!/^0x[0-9a-fA-F]{64}$/.test(topic)) {
    throw new Error(`Invalid indexed address topic: ${topic}`);
  }

  return `0x${topic.slice(-40)}`.toLowerCase();
}

function readHexWord(data: string, index: number): bigint {
  const body = data.startsWith("0x") ? data.slice(2) : data;
  const start = index * 64;
  const word = body.slice(start, start + 64);

  if (word.length !== 64) {
    throw new Error(`Missing data word ${index} in log payload`);
  }

  return BigInt(`0x${word}`);
}

function roundRatio(numerator: bigint, denominator: bigint, decimals: number): number {
  if (denominator === 0n) {
    return 0;
  }

  const scale = 10n ** BigInt(decimals);
  const scaled = (numerator * scale + denominator / 2n) / denominator;
  return Number(scaled) / Number(scale);
}

export function buildWalletTopic(address: string): string {
  const normalized = ensureHexAddress(address);
  return `0x000000000000000000000000${normalized.slice(2)}`;
}

export function decodeOrderFilledLog(log: RpcLog): DecodedOrderFilledLog {
  if (log.topics.length < 4) {
    throw new Error("OrderFilled log is missing indexed topics");
  }

  if (log.topics[0].toLowerCase() !== ORDER_FILLED_TOPIC) {
    throw new Error(`Unexpected log topic: ${log.topics[0]}`);
  }

  return {
    exchange: log.address.toLowerCase(),
    orderHash: log.topics[1].toLowerCase(),
    maker: decodeTopicAddress(log.topics[2]),
    taker: decodeTopicAddress(log.topics[3]),
    makerAssetId: readHexWord(log.data, 0),
    takerAssetId: readHexWord(log.data, 1),
    makerAmountFilled: readHexWord(log.data, 2),
    takerAmountFilled: readHexWord(log.data, 3),
    fee: readHexWord(log.data, 4),
    blockNumber: Number(BigInt(log.blockNumber)),
    logIndex: Number(BigInt(log.logIndex)),
    transactionHash: log.transactionHash.toLowerCase(),
  };
}

export function buildTradeRow(decoded: DecodedOrderFilledLog, timestamp: number): FullTradeRow {
  const isBuy = decoded.makerAssetId === 0n;
  const side = isBuy ? "BUY" : "SELL";
  const assetId = isBuy ? decoded.takerAssetId : decoded.makerAssetId;
  const sizeRaw = isBuy ? decoded.takerAmountFilled : decoded.makerAmountFilled;
  const notionalRaw = isBuy ? decoded.makerAmountFilled : decoded.takerAmountFilled;

  return {
    proxyWallet: decoded.maker,
    side,
    asset: assetId.toString(),
    size: roundRatio(sizeRaw, DECIMAL_SCALE, 6),
    price: roundRatio(notionalRaw, sizeRaw, 6),
    timestamp,
    blockNumber: decoded.blockNumber,
    transactionHash: decoded.transactionHash,
    logIndex: decoded.logIndex,
    makerAmountFilled: decoded.makerAmountFilled.toString(),
    takerAmountFilled: decoded.takerAmountFilled.toString(),
    fee: decoded.fee.toString(),
  };
}

export function parseGammaStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  if (typeof value !== "string" || value.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    return [];
  }
}
