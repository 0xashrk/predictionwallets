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
  timestamp: number;
}
