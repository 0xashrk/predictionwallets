import { TrendingUp, TrendingDown } from "lucide-react";
import type { Position } from "@/lib/mock-data";

interface PositionsTableProps {
  positions: Position[];
}

const categoryColors: Record<string, string> = {
  Crypto: "bg-chart-2/15 text-chart-2",
  Economics: "bg-chart-4/15 text-chart-4",
  Tech: "bg-primary/15 text-primary",
  Science: "bg-chart-3/15 text-chart-3",
  Politics: "bg-chart-5/15 text-chart-5",
};

const PositionsTable = ({ positions }: PositionsTableProps) => (
  <div className="stat-card overflow-hidden p-0">
    <div className="px-5 py-4 border-b border-border">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Positions</h3>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left px-5 py-3 font-medium">Market</th>
            <th className="text-left px-3 py-3 font-medium">Side</th>
            <th className="text-right px-3 py-3 font-medium">Shares</th>
            <th className="text-right px-3 py-3 font-medium">Avg</th>
            <th className="text-right px-3 py-3 font-medium">Current</th>
            <th className="text-right px-5 py-3 font-medium">PnL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const isPositive = pos.pnl >= 0;
            const colorClass = categoryColors[pos.category] || "bg-muted text-muted-foreground";

            return (
              <tr key={pos.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                      {pos.category}
                    </span>
                    <span className="font-medium text-foreground truncate max-w-[260px]">{pos.market}</span>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                    pos.outcome === "Yes" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                  }`}>
                    {pos.outcome}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-right font-mono text-muted-foreground">{pos.shares}</td>
                <td className="px-3 py-3.5 text-right font-mono text-muted-foreground">${pos.avgPrice.toFixed(2)}</td>
                <td className="px-3 py-3.5 text-right font-mono font-medium">${pos.currentPrice.toFixed(2)}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className={`flex items-center justify-end gap-1 font-mono font-semibold ${isPositive ? "text-gain" : "text-loss"}`}>
                    {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {isPositive ? "+" : ""}${pos.pnl.toFixed(2)}
                    <span className="text-xs opacity-70">({isPositive ? "+" : ""}{pos.pnlPercent}%)</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default PositionsTable;
