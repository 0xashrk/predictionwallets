import { useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Legend } from "recharts";
import type { PnlDataPoint } from "@/lib/mock-data";

interface MultiWalletData {
  label: string;
  color: string;
  data: PnlDataPoint[];
}

interface PnlChartProps {
  data: PnlDataPoint[];
  multiData?: MultiWalletData[];
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

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => {
        const val = entry.value;
        const isPositive = val >= 0;
        return (
          <div key={i} className="flex items-center gap-2">
            {payload.length > 1 && (
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            <p className={`font-mono text-sm font-bold ${isPositive ? "text-gain" : "text-loss"}`}>
              {isPositive ? "+" : ""}${val.toLocaleString()}
            </p>
          </div>
        );
      })}
    </div>
  );
};

const PnlChart = ({ data, multiData }: PnlChartProps) => {
  const [period, setPeriod] = useState<Period>("ALL");
  const isCompareMode = multiData && multiData.length > 1;

  const { filteredData, periodPnl, hasData } = useMemo(() => {
    if (data.length === 0) return { filteredData: [], periodPnl: 0, hasData: false };

    if (period === "ALL") {
      const lastValue = data[data.length - 1]?.cumulative ?? 0;
      return { filteredData: data, periodPnl: lastValue, hasData: true };
    }

    const now = Date.now();
    const cutoff = now - PERIOD_MS[period];
    const filtered = data.filter((d) => d.timestamp >= cutoff);

    if (filtered.length === 0) {
      return { filteredData: [], periodPnl: 0, hasData: false };
    }

    const startCumulative = filtered[0].cumulative - filtered[0].pnl;
    const adjusted = filtered.map((d) => ({
      ...d,
      cumulative: Math.round((d.cumulative - startCumulative) * 100) / 100,
    }));

    return { filteredData: adjusted, periodPnl: adjusted[adjusted.length - 1]?.cumulative ?? 0, hasData: true };
  }, [data, period]);

  const multiFilteredData = useMemo(() => {
    if (!isCompareMode || !multiData) return null;

    const filterByPeriod = (inputData: PnlDataPoint[]) => {
      if (inputData.length === 0) return [];
      if (period === "ALL") return inputData;

      const now = Date.now();
      const cutoff = now - PERIOD_MS[period];
      const filtered = inputData.filter((d) => d.timestamp >= cutoff);
      if (filtered.length === 0) return [];

      const startCumulative = filtered[0].cumulative - filtered[0].pnl;
      return filtered.map((d) => ({
        ...d,
        cumulative: Math.round((d.cumulative - startCumulative) * 100) / 100,
      }));
    };

    const allDates = new Set<string>();
    const walletData: { label: string; color: string; dataMap: Map<string, number> }[] = [];

    for (const w of multiData) {
      const filtered = filterByPeriod(w.data);
      const dataMap = new Map<string, number>();
      for (const d of filtered) {
        allDates.add(d.date);
        dataMap.set(d.date, d.cumulative);
      }
      walletData.push({ label: w.label, color: w.color, dataMap });
    }

    const sortedDates = Array.from(allDates).sort((a, b) => {
      const dateA = new Date(a + ", 2024").getTime();
      const dateB = new Date(b + ", 2024").getTime();
      return dateA - dateB;
    });

    const chartData = sortedDates.map((date) => {
      const point: Record<string, string | number> = { date };
      for (const w of walletData) {
        point[w.label] = w.dataMap.get(date) ?? 0;
      }
      return point;
    });

    return { chartData, wallets: walletData };
  }, [multiData, period, isCompareMode]);

  const isPositive = periodPnl >= 0;

  return (
    <div className="stat-card h-full min-h-[280px] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {isCompareMode ? "Comparing PnL" : period === "ALL" ? "Cumulative PnL" : `PnL (${period})`}
          </h3>
          {!isCompareMode && (
            <p className={`font-mono text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 ${isPositive ? "text-gain" : "text-loss"}`}>
              {isPositive ? "+" : ""}${periodPnl.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-0.5 sm:gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-md text-xs font-medium transition-colors ${
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

      {isCompareMode && multiFilteredData && multiFilteredData.chartData.length >= 2 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={multiFilteredData.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
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
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            {multiFilteredData.wallets.map((w) => (
              <Line
                key={w.label}
                type="monotone"
                dataKey={w.label}
                stroke={w.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : hasData && filteredData.length >= 2 ? (
        <ResponsiveContainer width="100%" height="100%">
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
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {isCompareMode
            ? "Not enough data to compare"
            : hasData && filteredData.length === 1
            ? `Only 1 data point for ${period}`
            : `No closed positions in the last ${period}`}
        </div>
      )}
    </div>
  );
};

export default PnlChart;
