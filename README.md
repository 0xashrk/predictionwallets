# Prediction Wallets

Track and compare Polymarket wallet performance.

## Features

- **Multi-wallet tracking** - Add, rename, reorder, remove wallets
- **Portfolio stats** - Value (positions + USDC.e), PnL, win rate, volume
- **PnL chart** - Filterable by 1H, 12H, 24H, 1W, 1M, 3M, ALL
- **Compare mode** - Aggregate or compare specific wallets
- **Drag-to-reorder** - Organize wallet order
- **On-chain USDC.e** - Live balance from Polygon

## Architecture

```
Browser → Supabase Edge Function → Polymarket Data API
                ↓
          CORS proxy + pagination
```

The edge function (`supabase/functions/polymarket-proxy`) proxies requests to Polymarket's API, handling CORS and paginating through all closed positions/trades.

## Setup

```sh
bun install
cp .env.example .env
# Add Supabase credentials to .env
bun run dev
```

Runs on `http://localhost:3001`
