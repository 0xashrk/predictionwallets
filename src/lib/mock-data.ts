export interface Position {
  id: string;
  market: string;
  outcome: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  category: string;
}

export interface WalletSummary {
  address: string;
  label: string;
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  positions: number;
  winRate: number;
}

export interface PnlDataPoint {
  date: string;
  pnl: number;
  cumulative: number;
}

export const wallets: WalletSummary[] = [
  {
    address: "0x1a2b...3c4d",
    label: "Main",
    totalValue: 14832.50,
    totalPnl: 3241.20,
    totalPnlPercent: 27.9,
    positions: 12,
    winRate: 68,
  },
  {
    address: "0x5e6f...7g8h",
    label: "Degen",
    totalValue: 4210.80,
    totalPnl: -892.30,
    totalPnlPercent: -17.5,
    positions: 8,
    winRate: 38,
  },
  {
    address: "0x9i0j...1k2l",
    label: "Conservative",
    totalValue: 22150.00,
    totalPnl: 5430.60,
    totalPnlPercent: 32.5,
    positions: 5,
    winRate: 80,
  },
];

export const positions: Position[] = [
  { id: "1", market: "Will BTC hit $150k by June 2026?", outcome: "Yes", shares: 450, avgPrice: 0.42, currentPrice: 0.61, pnl: 85.50, pnlPercent: 45.2, category: "Crypto" },
  { id: "2", market: "US GDP growth > 3% in Q1 2026?", outcome: "No", shares: 300, avgPrice: 0.55, currentPrice: 0.72, pnl: 51.00, pnlPercent: 30.9, category: "Economics" },
  { id: "3", market: "Will AI pass bar exam by 2026?", outcome: "Yes", shares: 200, avgPrice: 0.78, currentPrice: 0.91, pnl: 26.00, pnlPercent: 16.7, category: "Tech" },
  { id: "4", market: "SpaceX Starship orbital by March?", outcome: "Yes", shares: 600, avgPrice: 0.65, currentPrice: 0.52, pnl: -78.00, pnlPercent: -20.0, category: "Science" },
  { id: "5", market: "Fed rate cut in February 2026?", outcome: "No", shares: 350, avgPrice: 0.30, currentPrice: 0.45, pnl: 52.50, pnlPercent: 50.0, category: "Economics" },
  { id: "6", market: "Ethereum ETF net inflows > $5B?", outcome: "Yes", shares: 500, avgPrice: 0.48, currentPrice: 0.39, pnl: -45.00, pnlPercent: -18.8, category: "Crypto" },
  { id: "7", market: "Trump approval > 50% by March?", outcome: "No", shares: 250, avgPrice: 0.62, currentPrice: 0.71, pnl: 22.50, pnlPercent: 14.5, category: "Politics" },
  { id: "8", market: "Netflix hits 350M subscribers?", outcome: "Yes", shares: 180, avgPrice: 0.35, currentPrice: 0.58, pnl: 41.40, pnlPercent: 65.7, category: "Tech" },
];

export const pnlHistory: PnlDataPoint[] = [
  { date: "Jan 1", pnl: 0, cumulative: 0 },
  { date: "Jan 8", pnl: 120, cumulative: 120 },
  { date: "Jan 15", pnl: -45, cumulative: 75 },
  { date: "Jan 22", pnl: 310, cumulative: 385 },
  { date: "Jan 29", pnl: -180, cumulative: 205 },
  { date: "Feb 5", pnl: 520, cumulative: 725 },
  { date: "Feb 12", pnl: 280, cumulative: 1005 },
  { date: "Feb 19", pnl: -90, cumulative: 915 },
  { date: "Feb 26", pnl: 440, cumulative: 1355 },
  { date: "Mar 5", pnl: 620, cumulative: 1975 },
  { date: "Mar 12", pnl: -350, cumulative: 1625 },
  { date: "Mar 19", pnl: 780, cumulative: 2405 },
  { date: "Mar 26", pnl: 150, cumulative: 2555 },
  { date: "Apr 2", pnl: -220, cumulative: 2335 },
  { date: "Apr 9", pnl: 890, cumulative: 3225 },
  { date: "Apr 16", pnl: -410, cumulative: 2815 },
  { date: "Apr 23", pnl: 560, cumulative: 3375 },
  { date: "Apr 30", pnl: 404, cumulative: 3779 },
];
