import { DollarSign, TrendingUp, TrendingDown, BarChart3, Target, ArrowLeftRight, Wallet, LineChart, Table2 } from "lucide-react";

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

export type WidgetType =
  | "stat-portfolio"
  | "stat-netpnl"
  | "stat-won"
  | "stat-lost"
  | "stat-winrate"
  | "stat-volume"
  | "stat-trades"
  | "wallets"
  | "pnl-chart"
  | "positions";

export interface WidgetConfig {
  id: WidgetType;
  label: string;
  description: string;
  icon: typeof DollarSign;
  category: "stat" | "panel";
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetConfig> = {
  "stat-portfolio": {
    id: "stat-portfolio",
    label: "Portfolio",
    description: "Total portfolio value including USDC balance",
    icon: DollarSign,
    category: "stat",
    defaultW: 2,
    defaultH: 2,
    minW: 1,
    minH: 2,
    maxW: 4,
    maxH: 3,
  },
  "stat-netpnl": {
    id: "stat-netpnl",
    label: "Net PnL",
    description: "Total realized + unrealized profit/loss",
    icon: TrendingUp,
    category: "stat",
    defaultW: 2,
    defaultH: 2,
    minW: 1,
    minH: 2,
    maxW: 4,
    maxH: 3,
  },
  "stat-won": {
    id: "stat-won",
    label: "Won",
    description: "Total gross profit from winning trades",
    icon: TrendingUp,
    category: "stat",
    defaultW: 2,
    defaultH: 2,
    minW: 1,
    minH: 2,
    maxW: 4,
    maxH: 3,
  },
  "stat-lost": {
    id: "stat-lost",
    label: "Lost",
    description: "Total gross loss from losing trades",
    icon: TrendingDown,
    category: "stat",
    defaultW: 2,
    defaultH: 2,
    minW: 1,
    minH: 2,
    maxW: 4,
    maxH: 3,
  },
  "stat-winrate": {
    id: "stat-winrate",
    label: "Win Rate",
    description: "Percentage of winning trades",
    icon: Target,
    category: "stat",
    defaultW: 2,
    defaultH: 2,
    minW: 1,
    minH: 2,
    maxW: 4,
    maxH: 3,
  },
  "stat-volume": {
    id: "stat-volume",
    label: "Volume",
    description: "Total trading volume",
    icon: ArrowLeftRight,
    category: "stat",
    defaultW: 2,
    defaultH: 2,
    minW: 1,
    minH: 2,
    maxW: 4,
    maxH: 3,
  },
  "stat-trades": {
    id: "stat-trades",
    label: "Trades",
    description: "Total number of closed trades",
    icon: BarChart3,
    category: "stat",
    defaultW: 2,
    defaultH: 2,
    minW: 1,
    minH: 2,
    maxW: 4,
    maxH: 3,
  },
  wallets: {
    id: "wallets",
    label: "Wallets",
    description: "Wallet list with add/remove/rename",
    icon: Wallet,
    category: "panel",
    defaultW: 4,
    defaultH: 8,
    minW: 3,
    minH: 4,
    maxW: 6,
  },
  "pnl-chart": {
    id: "pnl-chart",
    label: "PnL Chart",
    description: "Profit/loss visualization over time",
    icon: LineChart,
    category: "panel",
    defaultW: 8,
    defaultH: 8,
    minW: 4,
    minH: 5,
  },
  positions: {
    id: "positions",
    label: "Positions",
    description: "Active positions table",
    icon: Table2,
    category: "panel",
    defaultW: 12,
    defaultH: 6,
    minW: 6,
    minH: 4,
  },
};

export const ALL_WIDGET_TYPES = Object.keys(WIDGET_REGISTRY) as WidgetType[];

export type WidgetLayouts = { lg: LayoutItem[]; md: LayoutItem[]; sm: LayoutItem[] };

export const DEFAULT_LAYOUTS: WidgetLayouts = {
  lg: [
    { i: "stat-portfolio", x: 0, y: 0, w: 2, h: 2 },
    { i: "stat-netpnl", x: 2, y: 0, w: 2, h: 2 },
    { i: "stat-won", x: 4, y: 0, w: 2, h: 2 },
    { i: "stat-lost", x: 6, y: 0, w: 2, h: 2 },
    { i: "stat-winrate", x: 8, y: 0, w: 2, h: 2 },
    { i: "stat-volume", x: 10, y: 0, w: 2, h: 2 },
    { i: "stat-trades", x: 12, y: 0, w: 2, h: 2 },
    { i: "wallets", x: 0, y: 2, w: 4, h: 10 },
    { i: "pnl-chart", x: 4, y: 2, w: 10, h: 10 },
    { i: "positions", x: 0, y: 12, w: 14, h: 6 },
  ],
  md: [
    { i: "stat-portfolio", x: 0, y: 0, w: 3, h: 2 },
    { i: "stat-netpnl", x: 3, y: 0, w: 3, h: 2 },
    { i: "stat-won", x: 6, y: 0, w: 3, h: 2 },
    { i: "stat-lost", x: 9, y: 0, w: 3, h: 2 },
    { i: "stat-winrate", x: 0, y: 2, w: 3, h: 2 },
    { i: "stat-volume", x: 3, y: 2, w: 3, h: 2 },
    { i: "stat-trades", x: 6, y: 2, w: 3, h: 2 },
    { i: "wallets", x: 0, y: 4, w: 4, h: 10 },
    { i: "pnl-chart", x: 4, y: 4, w: 8, h: 10 },
    { i: "positions", x: 0, y: 14, w: 12, h: 6 },
  ],
  sm: [
    { i: "stat-portfolio", x: 0, y: 0, w: 3, h: 2 },
    { i: "stat-netpnl", x: 3, y: 0, w: 3, h: 2 },
    { i: "stat-won", x: 0, y: 2, w: 3, h: 2 },
    { i: "stat-lost", x: 3, y: 2, w: 3, h: 2 },
    { i: "stat-winrate", x: 0, y: 4, w: 3, h: 2 },
    { i: "stat-volume", x: 3, y: 4, w: 3, h: 2 },
    { i: "stat-trades", x: 0, y: 6, w: 6, h: 2 },
    { i: "wallets", x: 0, y: 8, w: 6, h: 8 },
    { i: "pnl-chart", x: 0, y: 16, w: 6, h: 8 },
    { i: "positions", x: 0, y: 24, w: 6, h: 6 },
  ],
};

export const GRID_CONFIG = {
  breakpoints: { lg: 1200, md: 996, sm: 768 },
  cols: { lg: 14, md: 12, sm: 6 },
  rowHeight: 40,
  margin: [12, 12] as [number, number],
  containerPadding: [0, 0] as [number, number],
};

export const WIDGET_STORAGE_KEY = "polytracker-widget-layout";

export interface WidgetLayoutExport {
  version: 1;
  layouts: WidgetLayouts;
  activeWidgets: WidgetType[];
  exportedAt: string;
}
