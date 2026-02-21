import { useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PnlDataPoint } from "@/lib/mock-data";

interface PnlChartProps {
  data: PnlDataPoint[];
}

type Period = "1H" | "12H" | "24H" | "1W" | "1M" | "3M" | "ALL";

const PERIODS: Period[] = ["1H", "12H", "24H", "1W", "1M", "3M", "ALL"];

const PERIOD_MS: Record<Period, number> = {
  "1H": 60 * 60 * 1000,
  "12H": 12 * 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "3M": 90 * 24 * 60 * 60 * 1000,
  "ALL": Infinity,
};

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
  const [period, setPeriod] = useState<Period>("ALL");

  const filteredData = useMemo(() => {
    if (period === "ALL" || data.length === 0) return data;

    const now = Date.now();
    const cutoff = now - PERIOD_MS[period];
    
    const filtered = data.filter(d => d.timestamp >= cutoff);
    
    if (filtered.length === 0) return data;

    const startCumulative = filtered[0].cumulative - filtered[0].pnl;
    return filtered.map(d => ({
      ...d,
      cumulative: Math.round((d.cumulative - startCumulative) * 100) / 100,
    }));
  }, [data, period]);

  const lastValue = filteredData[filteredData.length - 1]?.cumulative ?? 0;
  const isPositive = lastValue >= 0;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {period === "ALL" ? "Cumulative PnL" : `PnL (${period})`}
          </h3>
          <p className={`font-mono text-2xl font-bold mt-1 ${isPositive ? "text-gain" : "text-loss"}`}>
            {isPositive ? "+" : ""}${lastValue.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={filteredData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
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
