import { DollarSign, TrendingUp, TrendingDown, BarChart3, Target, ArrowLeftRight } from "lucide-react";
import StatCard from "@/components/StatCard";

interface AggregatedData {
  totalValue: number;
  totalPnl: number;
  totalClosedPositions: number;
  winRate: number;
  totalVolume: number;
  totalUsdcBalance: number;
  grossProfit: number;
  grossLoss: number;
}

interface StatWidgetProps {
  data: AggregatedData;
  isLoading: boolean;
}

export function PortfolioWidget({ data, isLoading }: StatWidgetProps) {
  if (isLoading) return <StatWidgetSkeleton />;
  return (
    <StatCard
      label="Portfolio"
      value={`$${(data.totalValue + data.totalUsdcBalance).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
      icon={<DollarSign className="h-4 w-4" />}
    />
  );
}

export function NetPnlWidget({ data, isLoading }: StatWidgetProps) {
  if (isLoading) return <StatWidgetSkeleton />;
  return (
    <StatCard
      label="Net PnL"
      value={`${data.totalPnl >= 0 ? "+" : ""}$${data.totalPnl.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
      positive={data.totalPnl >= 0}
      icon={<TrendingUp className="h-4 w-4" />}
    />
  );
}

export function WonWidget({ data, isLoading }: StatWidgetProps) {
  if (isLoading) return <StatWidgetSkeleton />;
  return (
    <StatCard
      label="Won"
      value={`+$${data.grossProfit.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
      positive={true}
      icon={<TrendingUp className="h-4 w-4" />}
    />
  );
}

export function LostWidget({ data, isLoading }: StatWidgetProps) {
  if (isLoading) return <StatWidgetSkeleton />;
  return (
    <StatCard
      label="Lost"
      value={`-$${data.grossLoss.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
      positive={false}
      icon={<TrendingDown className="h-4 w-4" />}
    />
  );
}

export function WinRateWidget({ data, isLoading }: StatWidgetProps) {
  if (isLoading) return <StatWidgetSkeleton />;
  return (
    <StatCard
      label="Win Rate"
      value={`${data.winRate}%`}
      icon={<Target className="h-4 w-4" />}
    />
  );
}

export function VolumeWidget({ data, isLoading }: StatWidgetProps) {
  if (isLoading) return <StatWidgetSkeleton />;
  return (
    <StatCard
      label="Volume"
      value={`$${data.totalVolume.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
      icon={<ArrowLeftRight className="h-4 w-4" />}
    />
  );
}

export function TradesWidget({ data, isLoading }: StatWidgetProps) {
  if (isLoading) return <StatWidgetSkeleton />;
  return (
    <StatCard
      label="Trades"
      value={String(data.totalClosedPositions)}
      icon={<BarChart3 className="h-4 w-4" />}
    />
  );
}

function StatWidgetSkeleton() {
  return <div className="h-full w-full rounded-xl bg-secondary animate-pulse" />;
}
