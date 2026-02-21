# Prediction Wallets

Track and compare Polymarket wallet performance.

## Features

- **Multi-wallet tracking** - Add, rename, reorder, and remove wallets
- **Portfolio stats** - Portfolio value (positions + USDC.e), PnL, win rate, volume
- **Cumulative PnL chart** - Filterable by 1H, 12H, 24H, 1W, 1M, 3M, ALL
- **Compare mode** - View aggregate stats across all wallets or compare specific ones
- **Drag-to-reorder** - Organize wallets in your preferred order
- **USDC.e balance** - Fetches on-chain balance from Polygon

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS
- TanStack Query
- Recharts
- Supabase (edge function proxy)

## Setup

```sh
bun install
cp .env.example .env
# Add Supabase credentials to .env
bun run dev
```

Runs on `http://localhost:3001`
