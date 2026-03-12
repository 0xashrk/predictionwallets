# Prediction Wallets

Track and compare Polymarket wallet performance.

## Features

- **Multi-wallet tracking** - Add, rename, reorder, remove wallets
- **Portfolio stats** - Value (positions + USDC.e), PnL, win rate, volume
- **PnL chart** - Filterable by 1H, 12H, 24H, 1W, 1M, 3M, ALL
- **Compare mode** - Aggregate or compare specific wallets
- **Drag-to-reorder** - Organize wallet order
- **On-chain USDC.e** - Live balance from Polygon
- **MCP wallet tools** - Fetch single-wallet and multi-wallet balances over stdio

## Architecture

```text
Browser → Supabase Edge Function → Polymarket Data API
                ↓
          CORS proxy + pagination

MCP Client → MCP Server → Polymarket Data API + Polygon RPC
```

The edge function (`supabase/functions/polymarket-proxy`) proxies requests to Polymarket's API, handling CORS and paginating through all closed positions/trades.

## Setup

```sh
npm install
cp .env.example .env
# Add Supabase credentials to .env
npm run dev
```

Runs on `http://localhost:3001`

## MCP Server

Start the stdio MCP server locally:

```sh
npm run mcp
```

Example client configuration:

```json
{
  "mcpServers": {
    "predictionwallets": {
      "command": "tsx",
      "args": ["mcp/server.ts"],
      "cwd": "/absolute/path/to/predictionwallets"
    }
  }
}
```

Use the MCP entrypoint directly for client configs so `StdioServerTransport` keeps stdout clean for JSON-RPC. If your client does not resolve local project binaries, point `command` to `/absolute/path/to/predictionwallets/node_modules/.bin/tsx` instead of wrapping the server with `npm run`.

Available tools:

```json
{
  "name": "get_wallet_balance",
  "arguments": {
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "chain": "polygon"
  }
}
```

```json
{
  "name": "get_multi_wallet_balances",
  "arguments": {
    "walletAddresses": [
      "0x1234567890abcdef1234567890abcdef12345678",
      "0xabcdef1234567890abcdef1234567890abcdef12",
      "0x1234567890ABCDEF1234567890ABCDEF12345678"
    ],
    "chain": "polygon"
  }
}
```

Response shape highlights:

- `chain` defaults to `polygon`.
- `wallets[*].totals.usd` returns the per-wallet total.
- `wallets[*].tokenBreakdown` returns normalized portfolio and token line items.
- `wallets[*].error` is populated for invalid addresses or upstream partial failures.
- Multi-wallet requests dedupe addresses case-insensitively and currently allow up to `25` unique wallets per call.

Example multi-wallet response excerpt:

```json
{
  "chain": "polygon",
  "timestamp": "2026-03-11T17:00:00.000Z",
  "wallets": [
    {
      "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "totals": { "usd": 135.75, "assetsTracked": 2 },
      "tokenBreakdown": [
        {
          "symbol": "POLYMARKET_PORTFOLIO",
          "assetType": "portfolio",
          "valueUsd": 125.5
        },
        {
          "symbol": "USDC.e",
          "assetType": "token",
          "valueUsd": 10.25
        }
      ],
      "error": null
    }
  ],
  "summary": {
    "requested": 3,
    "unique": 2,
    "duplicatesRemoved": 1,
    "successful": 1,
    "failed": 1
  }
}
```
