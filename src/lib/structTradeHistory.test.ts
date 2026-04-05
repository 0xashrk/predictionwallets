import { describe, expect, it } from "vitest";
import type { Trade } from "@structbuild/sdk";

import {
  collectOffsetPages,
  normalizeStructTrade,
  toStructTradeCsv,
} from "./structTradeHistory";

describe("structTradeHistory", () => {
  it("collects offset pages until the final short page and dedupes by key", async () => {
    const offsets: number[] = [];
    const rows = await collectOffsetPages({
      limit: 2,
      getKey: (item: { id: string }) => item.id,
      fetchPage: async (offset: number) => {
        offsets.push(offset);
        if (offset === 0) {
          return [{ id: "1" }, { id: "2" }];
        }
        if (offset === 2) {
          return [{ id: "2" }, { id: "3" }];
        }
        return [{ id: "4" }];
      },
    });

    expect(offsets).toEqual([0, 2, 4]);
    expect(rows).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }]);
  });

  it("flattens a Struct trade for export", () => {
    const row = normalizeStructTrade({
      id: "trade-1",
      hash: "0xhash",
      block: 123,
      confirmed_at: 1_700_000_000,
      trader: {
        address: "0xabc",
        name: "Vidar",
        pseudonym: "vidarx",
        x_username: "vidarx",
        verified_badge: true,
      },
      taker: "0xdef",
      side: "0",
      condition_id: "0xcondition",
      outcome: "Yes",
      outcome_index: 0,
      question: "Will BTC go up?",
      image_url: "https://example.com/image.png",
      slug: "btc-up-or-down-5m",
      usd_amount: 42.5,
      shares_amount: 50,
      price: 0.85,
      probability: 0.86,
      fee: 0.1,
      exchange: "0xexchange",
      trade_type: "0",
      log_index: 7,
      order_hash: "0xorder",
      position_id: "0xposition",
    } as Trade);

    expect(row.confirmedAtIso).toBe("2023-11-14T22:13:20.000Z");
    expect(row.traderAddress).toBe("0xabc");
    expect(row.tradeType).toBe("0");
    expect(row.question).toBe("Will BTC go up?");
  });

  it("renders CSV output with escaping", () => {
    const csv = toStructTradeCsv([
      {
        id: "1",
        hash: "0xhash",
        block: 1,
        confirmedAt: 2,
        confirmedAtIso: "2024-01-01T00:00:00.000Z",
        traderAddress: "0xabc",
        traderName: "A, B",
        traderPseudonym: "quote\"name",
        traderXUsername: null,
        traderVerifiedBadge: true,
        taker: "0xdef",
        side: "buy",
        tradeType: "0",
        conditionId: null,
        outcome: "Yes",
        outcomeIndex: 0,
        question: "Question",
        imageUrl: null,
        slug: "slug",
        usdAmount: 10,
        sharesAmount: 20,
        price: 0.5,
        probability: null,
        fee: 0,
        exchange: "0xexchange",
        logIndex: 3,
        orderHash: "0xorder",
        positionId: "0xposition",
      },
    ]);

    expect(csv).toContain('"A, B"');
    expect(csv).toContain('"quote""name"');
  });
});
