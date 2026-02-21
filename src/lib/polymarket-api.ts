const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const BASE = `${SUPABASE_URL}/functions/v1/polymarket-proxy`;

async function fetchPolymarket(endpoint: string, user: string) {
  const url = `${BASE}?endpoint=${endpoint}&user=${encodeURIComponent(user)}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Polymarket API error (${res.status}): ${err}`);
  }
  return res.json();
}

export interface PolymarketPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  outcomeIndex: number;
  oppositeAsset: string;
  endDate: string;
  curPrice: number;
  redeemable: boolean;
  mergeable: boolean;
  negRisk: boolean;
}

export interface PolymarketClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;
  curPrice: number;
  endDate: string;
  eventSlug: string;
  icon: string;
  oppositeAsset: string;
  oppositeOutcome: string;
  outcome: string;
  outcomeIndex: number;
  realizedPnl: number;
  slug: string;
  timestamp: number;
  title: string;
  totalBought: number;
}

export async function fetchPositions(address: string): Promise<PolymarketPosition[]> {
  return fetchPolymarket("positions", address);
}

export async function fetchClosedPositions(address: string): Promise<PolymarketClosedPosition[]> {
  return fetchPolymarket("closed-positions", address);
}

export async function fetchValue(address: string): Promise<number> {
  const data = await fetchPolymarket("value", address);
  // API returns [{ user, value }]
  if (Array.isArray(data) && data.length > 0) return data[0].value ?? 0;
  if (typeof data === "number") return data;
  return 0;
}

export interface PolymarketTrade {
  id: string;
  taker: string;
  maker: string;
  market: string;
  asset: string;
  conditionId: string;
  side: string;
  size: number;
  price: number;
  timestamp: number;
  title: string;
  outcome: string;
}

export async function fetchTrades(address: string): Promise<PolymarketTrade[]> {
  return fetchPolymarket("trades", address);
}
