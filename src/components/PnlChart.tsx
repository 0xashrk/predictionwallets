import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PnlDataPoint } from "@/lib/mock-data";

interface PnlChartProps {
  data: PnlDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const isPositive = val >= 0;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono text-sm font-bold ${isPositive ? "text-gain" : "text-loss"}`}>
        {isPositive ? "+" : ""}${val.toLocaleString()}
      </p>
    </div>
  );
};

const PnlChart = ({ data }: PnlChartProps) => {
  const lastValue = data[data.length - 1]?.cumulative ?? 0;
  const isPositive = lastValue >= 0;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cumulative PnL</h3>
          <p className={`font-mono text-2xl font-bold mt-1 ${isPositive ? "text-gain" : "text-loss"}`}>
            {isPositive ? "+" : ""}${lastValue.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-1">
          {["1W", "1M", "3M", "ALL"].map((period) => (
            <button
              key={period}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors last:bg-secondary last:text-foreground"
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? "hsl(160, 60%, 45%)" : "hsl(0, 72%, 55%)"} stopOpacity={0.3} />
              <stop offset="100%" stopColor={isPositive ? "hsl(160, 60%, 45%)" : "hsl(0, 72%, 55%)"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 16%)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(215, 15%, 50%)" }}
            axisLine={{ stroke: "hsl(220, 14%, 16%)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(215, 15%, 50%)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={isPositive ? "hsl(160, 60%, 45%)" : "hsl(0, 72%, 55%)"}
            strokeWidth={2}
            fill="url(#pnlGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PnlChart;
