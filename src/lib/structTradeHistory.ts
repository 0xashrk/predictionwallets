import type { Trade } from "@structbuild/sdk";

export interface StructTradeExportRow {
  id: string;
  hash: string;
  block: number;
  confirmedAt: number;
  confirmedAtIso: string;
  traderAddress: string;
  traderName: string | null;
  traderPseudonym: string | null;
  traderXUsername: string | null;
  traderVerifiedBadge: boolean | null;
  taker: string;
  side: string | null;
  tradeType: string;
  conditionId: string | null;
  outcome: string | null;
  outcomeIndex: number | null;
  question: string | null;
  imageUrl: string | null;
  slug: string | null;
  usdAmount: number;
  sharesAmount: number;
  price: number;
  probability: number | null;
  fee: number;
  exchange: string;
  logIndex: number;
  orderHash: string;
  positionId: string;
}

interface CollectOffsetPagesOptions<T> {
  limit: number;
  fetchPage: (offset: number, limit: number) => Promise<T[]>;
  getKey: (item: T) => string;
}

export async function collectOffsetPages<T>({
  limit,
  fetchPage,
  getKey,
}: CollectOffsetPagesOptions<T>): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let offset = 0;

  while (true) {
    const page = await fetchPage(offset, limit);
    for (const item of page) {
      const key = getKey(item);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      rows.push(item);
    }

    if (page.length < limit) {
      break;
    }

    offset += page.length;
  }

  return rows;
}

export function normalizeStructTrade(trade: Trade): StructTradeExportRow {
  return {
    id: trade.id,
    hash: trade.hash,
    block: trade.block,
    confirmedAt: trade.confirmed_at,
    confirmedAtIso: new Date(trade.confirmed_at * 1000).toISOString(),
    traderAddress: trade.trader.address,
    traderName: trade.trader.name ?? null,
    traderPseudonym: trade.trader.pseudonym ?? null,
    traderXUsername: trade.trader.x_username ?? null,
    traderVerifiedBadge: trade.trader.verified_badge ?? null,
    taker: trade.taker,
    side: trade.side ?? null,
    tradeType: trade.trade_type,
    conditionId: trade.condition_id ?? null,
    outcome: trade.outcome ?? null,
    outcomeIndex: trade.outcome_index ?? null,
    question: trade.question ?? null,
    imageUrl: trade.image_url ?? null,
    slug: trade.slug ?? null,
    usdAmount: trade.usd_amount,
    sharesAmount: trade.shares_amount,
    price: trade.price,
    probability: trade.probability ?? null,
    fee: trade.fee,
    exchange: trade.exchange,
    logIndex: trade.log_index,
    orderHash: trade.order_hash,
    positionId: trade.position_id,
  };
}

export function toStructTradeCsv(rows: StructTradeExportRow[]): string {
  const headers = [
    "id",
    "hash",
    "block",
    "confirmedAt",
    "confirmedAtIso",
    "traderAddress",
    "traderName",
    "traderPseudonym",
    "traderXUsername",
    "traderVerifiedBadge",
    "taker",
    "side",
    "tradeType",
    "conditionId",
    "outcome",
    "outcomeIndex",
    "question",
    "imageUrl",
    "slug",
    "usdAmount",
    "sharesAmount",
    "price",
    "probability",
    "fee",
    "exchange",
    "logIndex",
    "orderHash",
    "positionId",
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
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
