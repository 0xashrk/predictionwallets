import PnlChart from "@/components/PnlChart";

interface PnlHistoryItem {
  date: string;
  pnl: number;
  cumulative: number;
  timestamp: number;
}

interface PnlHistorySeries {
  label: string;
  color: string;
  data: PnlHistoryItem[];
}

interface ChartWidgetProps {
  data: PnlHistoryItem[];
  multiData?: PnlHistorySeries[];
  isLoading: boolean;
}

export default function ChartWidget({ data, multiData, isLoading }: ChartWidgetProps) {
  if (isLoading) {
    return <div className="h-full w-full rounded-xl bg-secondary animate-pulse" />;
  }

  return (
    <div className="h-full">
      <PnlChart data={data} multiData={multiData} />
    </div>
  );
}
