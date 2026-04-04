import { describe, expect, it } from "vitest";

import {
  buildChunkFileName,
  buildLogKey,
  buildTradeRow,
  buildWalletTopic,
  decodeOrderFilledLog,
  ORDER_FILLED_TOPIC,
  parseGammaStringList,
} from "./fullTradeHistory";

describe("fullTradeHistory", () => {
  it("builds stable log keys for dedupe", () => {
    expect(buildLogKey("0xABC", 7)).toBe("0xabc:7");
    expect(buildLogKey("0xdef", "0x09")).toBe("0xdef:0x09");
  });

  it("builds chunk filenames from exchange and block range", () => {
    expect(
      buildChunkFileName("0x4BfB41d5B3570dEFd03C39A9A4D8dE6BD8B8982E", 100, 250),
    ).toBe("0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e-100-250.json");
  });

  it("pads a wallet into an indexed topic", () => {
    expect(buildWalletTopic("0xd0d6053c3c37e727402d84c14069780d360993aa")).toBe(
      "0x000000000000000000000000d0d6053c3c37e727402d84c14069780d360993aa",
    );
  });

  it("decodes a real buy fill into the raw on-chain trade shape", () => {
    const decoded = decodeOrderFilledLog({
      address: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
      blockNumber: "0x4ed928c",
      transactionHash: "0x9b5bae41f2e3f754cea415318f418a407ddd78cea7ef6107bab2b7030cd25053",
      logIndex: "0x1d",
      topics: [
        ORDER_FILLED_TOPIC,
        "0xd1255fb2a31271f66fc423b477d4112042aa0555acdd8559e4bae02e506ad712",
        "0x000000000000000000000000d0d6053c3c37e727402d84c14069780d360993aa",
        "0x0000000000000000000000004bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
      ],
      data: "0x000000000000000000000000000000000000000000000000000000000000000006a293400f7e3987fb37cac11787f349045eabd0a01135b6cc9f14b3355952230000000000000000000000000000000000000000000000000000000000fab3b00000000000000000000000000000000000000000000000000000000001d905c0000000000000000000000000000000000000000000000000000000000029f280",
    });

    const trade = buildTradeRow(decoded, 1774354221);

    expect(trade.proxyWallet).toBe("0xd0d6053c3c37e727402d84c14069780d360993aa");
    expect(trade.side).toBe("BUY");
    expect(trade.asset).toBe(
      "3001122599774871719771217659422417276145740147746151603625973587736643850787",
    );
    expect(trade.size).toBe(31);
    expect(trade.price).toBe(0.53);
    expect(trade.fee).toBe("2749056");
  });

  it("derives sell size and price from a sell-side fill", () => {
    const trade = buildTradeRow(
      {
        exchange: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
        orderHash: "0xabc",
        maker: "0x1111111111111111111111111111111111111111",
        taker: "0x2222222222222222222222222222222222222222",
        makerAssetId: 123n,
        takerAssetId: 0n,
        makerAmountFilled: 100_000_000n,
        takerAmountFilled: 60_000_000n,
        fee: 0n,
        blockNumber: 1,
        logIndex: 2,
        transactionHash: "0xhash",
      },
      1700000000,
    );

    expect(trade.side).toBe("SELL");
    expect(trade.asset).toBe("123");
    expect(trade.size).toBe(100);
    expect(trade.price).toBe(0.6);
  });

  it("parses gamma string arrays safely", () => {
    expect(parseGammaStringList('["Yes","No"]')).toEqual(["Yes", "No"]);
    expect(parseGammaStringList(["A", "B"])).toEqual(["A", "B"]);
    expect(parseGammaStringList("not-json")).toEqual([]);
  });
});
