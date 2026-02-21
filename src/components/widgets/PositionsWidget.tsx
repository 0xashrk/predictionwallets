import PositionsTable from "@/components/PositionsTable";

interface Position {
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

interface PositionsWidgetProps {
  positions: Position[];
  isLoading: boolean;
}

export default function PositionsWidget({ positions, isLoading }: PositionsWidgetProps) {
  if (isLoading) {
    return <div className="h-full w-full rounded-xl bg-secondary animate-pulse" />;
  }

  return (
    <div className="h-full overflow-auto">
      <PositionsTable positions={positions} />
    </div>
  );
}
