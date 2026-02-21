import { useState, useMemo, useEffect, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import { Activity, Moon, Sun, Pencil } from "lucide-react";

const ResponsiveGridLayout = WidthProvider(Responsive);
import { useMultiWalletData } from "@/hooks/useMultiWalletData";
import { useWidgetLayout } from "@/hooks/useWidgetLayout";
import type { PolymarketPosition } from "@/lib/polymarket-api";
import type { WidgetType } from "@/lib/widgets";
import { GRID_CONFIG, WIDGET_REGISTRY } from "@/lib/widgets";
import WidgetWrapper from "@/components/WidgetWrapper";
import WidgetFAB from "@/components/WidgetFAB";
import {
  PortfolioWidget,
  NetPnlWidget,
  WonWidget,
  LostWidget,
  WinRateWidget,
  VolumeWidget,
  TradesWidget,
} from "@/components/widgets/StatWidgets";
import WalletsWidget from "@/components/widgets/WalletsWidget";
import ChartWidget from "@/components/widgets/ChartWidget";
import PositionsWidget from "@/components/widgets/PositionsWidget";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const DEFAULT_WALLETS: { address: string; label: string }[] = [];

function loadWallets() {
  try {
    const saved = localStorage.getItem("polytracker-wallets");
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_WALLETS;
}

function loadTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem("polytracker-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function loadTitle(): string {
  try {
    const saved = localStorage.getItem("polytracker-title");
    if (saved) return saved;
  } catch {}
  return "Prediction Wallets";
}

type ViewMode = "single" | "all" | "compare";

const Index = () => {
  const [wallets, setWallets] = useState(loadWallets);
  const [selectedWallet, setSelectedWallet] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [compareWallets, setCompareWallets] = useState<Set<number>>(new Set());
  const [theme, setTheme] = useState<"light" | "dark">(loadTheme);
  const [title, setTitle] = useState(loadTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const {
    layouts,
    activeWidgets,
    onLayoutChange,
    onBreakpointChange,
    addWidget,
    removeWidget,
    resetToDefault,
    exportLayout,
    importLayout,
    getAvailableWidgets,
  } = useWidgetLayout();

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("polytracker-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const { walletsData, isLoading } = useMultiWalletData(wallets);

  const selectedIndices = useMemo(() => {
    if (viewMode === "single") return [selectedWallet];
    if (viewMode === "all") return wallets.map((_: unknown, i: number) => i);
    return Array.from(compareWallets);
  }, [viewMode, selectedWallet, wallets, compareWallets]);

  const aggregatedData = useMemo(() => {
    const selected = selectedIndices.map((i) => walletsData[i]).filter(Boolean);

    let totalValue = 0;
    let totalRealizedPnl = 0;
    let totalOpenPnl = 0;
    let totalClosedPositions = 0;
    let totalWinning = 0;
    let totalVolume = 0;
    let totalUsdcBalance = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    const allPositions: PolymarketPosition[] = [];

    for (const w of selected) {
      totalValue += w.value;
      totalOpenPnl += w.positions.reduce((s, p) => s + (p.cashPnl ?? 0), 0);
      totalClosedPositions += w.closedPositions.length;
      totalVolume += w.trades.reduce((s, t) => s + t.size * t.price, 0);
      totalUsdcBalance += w.usdcBalance;
      allPositions.push(...w.positions);

      for (const p of w.closedPositions) {
        const pnl = p.realizedPnl ?? 0;
        totalRealizedPnl += pnl;
        if (pnl > 0) {
          grossProfit += pnl;
          totalWinning++;
        } else {
          grossLoss += Math.abs(pnl);
        }
      }
    }

    const totalPnl = totalRealizedPnl + totalOpenPnl;
    const winRate = totalClosedPositions > 0 ? Math.round((totalWinning / totalClosedPositions) * 100) : 0;

    return {
      totalValue,
      totalPnl,
      totalClosedPositions,
      winRate,
      totalVolume,
      totalUsdcBalance,
      grossProfit,
      grossLoss,
      positions: allPositions,
    };
  }, [selectedIndices, walletsData]);

  const pnlHistories = useMemo(() => {
    const selected = selectedIndices.map((i) => ({ index: i, data: walletsData[i] })).filter((x) => x.data);
    const histories: { label: string; color: string; data: { date: string; pnl: number; cumulative: number; timestamp: number }[] }[] = [];

    const colors = ["hsl(160, 60%, 45%)", "hsl(200, 70%, 50%)", "hsl(280, 60%, 55%)", "hsl(30, 80%, 55%)", "hsl(340, 65%, 55%)"];

    for (let idx = 0; idx < selected.length; idx++) {
      const { index, data } = selected[idx];
      const w = wallets[index];
      const closed = data.closedPositions;
      const sorted = [...closed].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

      const byDate = new Map<string, { pnl: number; timestamp: number }>();
      for (const p of sorted) {
        const ts = (p.timestamp ?? 0) * 1000;
        const date = new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const existing = byDate.get(date);
        byDate.set(date, {
          pnl: (existing?.pnl ?? 0) + (p.realizedPnl ?? 0),
          timestamp: ts,
        });
      }

      const history: { date: string; pnl: number; cumulative: number; timestamp: number }[] = [];
      let cumulative = 0;
      for (const [date, { pnl: pnlVal, timestamp }] of byDate) {
        cumulative += pnlVal;
        history.push({
          date,
          pnl: Math.round(pnlVal * 100) / 100,
          cumulative: Math.round(cumulative * 100) / 100,
          timestamp,
        });
      }

      histories.push({
        label: w.label,
        color: colors[idx % colors.length],
        data: history,
      });
    }

    return histories;
  }, [selectedIndices, walletsData, wallets]);

  const combinedPnlHistory = useMemo(() => {
    if (pnlHistories.length === 0) return [];
    if (pnlHistories.length === 1) return pnlHistories[0].data;

    const allDates = new Map<string, { pnl: number; timestamp: number }>();
    for (const h of pnlHistories) {
      for (const d of h.data) {
        const existing = allDates.get(d.date);
        allDates.set(d.date, {
          pnl: (existing?.pnl ?? 0) + d.pnl,
          timestamp: Math.max(existing?.timestamp ?? 0, d.timestamp),
        });
      }
    }

    const sorted = Array.from(allDates.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const history: { date: string; pnl: number; cumulative: number; timestamp: number }[] = [];
    let cumulative = 0;
    for (const [date, { pnl, timestamp }] of sorted) {
      cumulative += pnl;
      history.push({
        date,
        pnl: Math.round(pnl * 100) / 100,
        cumulative: Math.round(cumulative * 100) / 100,
        timestamp,
      });
    }
    return history;
  }, [pnlHistories]);

  const mappedPositions = useMemo(() => {
    return aggregatedData.positions.map((p: PolymarketPosition, i: number) => ({
      id: String(i),
      market: p.title || p.conditionId?.slice(0, 20) || "Unknown",
      outcome: p.outcome || (p.outcomeIndex === 0 ? "Yes" : "No"),
      shares: Math.round(p.size * 100) / 100,
      avgPrice: p.avgPrice ?? 0,
      currentPrice: p.curPrice ?? 0,
      pnl: p.cashPnl ?? 0,
      pnlPercent: p.percentPnl ?? 0,
      category: "Market",
    }));
  }, [aggregatedData.positions]);

  const persistWallets = (updated: typeof wallets) => {
    setWallets(updated);
    localStorage.setItem("polytracker-wallets", JSON.stringify(updated));
  };

  const handleAddWallet = (address: string, label: string) => {
    persistWallets([...wallets, { address, label }]);
  };

  const handleRemoveWallet = (index: number) => {
    const updated = wallets.filter((_: { address: string; label: string }, i: number) => i !== index);
    persistWallets(updated);
    if (updated.length === 0) {
      setSelectedWallet(0);
      setViewMode("single");
    } else if (selectedWallet >= updated.length) {
      setSelectedWallet(updated.length - 1);
    } else if (selectedWallet === index) {
      setSelectedWallet(0);
    }
    setCompareWallets((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleRenameWallet = (index: number, newLabel: string) => {
    const updated = wallets.map((w: { address: string; label: string }, i: number) =>
      i === index ? { ...w, label: newLabel } : w
    );
    persistWallets(updated);
  };

  const handleRemoveAllWallets = () => {
    persistWallets([]);
    setSelectedWallet(0);
    setViewMode("single");
    setCompareWallets(new Set());
  };

  const handleReorderWallets = (fromIndex: number, toIndex: number) => {
    const updated = [...wallets];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    persistWallets(updated);

    if (selectedWallet === fromIndex) {
      setSelectedWallet(toIndex);
    } else if (fromIndex < selectedWallet && toIndex >= selectedWallet) {
      setSelectedWallet(selectedWallet - 1);
    } else if (fromIndex > selectedWallet && toIndex <= selectedWallet) {
      setSelectedWallet(selectedWallet + 1);
    }
  };

  const toggleCompareWallet = (index: number) => {
    setCompareWallets((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleWalletClick = (index: number) => {
    if (viewMode === "compare") {
      toggleCompareWallet(index);
    } else {
      setSelectedWallet(index);
      setViewMode("single");
    }
  };

  const handleToggleViewMode = (mode: ViewMode) => {
    if (mode === "compare" && viewMode !== "compare") {
      setCompareWallets(new Set([selectedWallet]));
    } else if (mode !== "compare") {
      setCompareWallets(new Set());
    }
    setViewMode(mode);
  };

  const getViewModeLabel = () => {
    if (viewMode === "all") return "All Wallets";
    if (viewMode === "compare") return `Comparing ${compareWallets.size} wallets`;
    return wallets[selectedWallet]?.label ?? "Wallet";
  };

  const renderWidget = (widgetType: WidgetType) => {
    const config = WIDGET_REGISTRY[widgetType];
    const isStatWidget = config.category === "stat";

    const content = (() => {
      switch (widgetType) {
        case "stat-portfolio":
          return <PortfolioWidget data={aggregatedData} isLoading={isLoading} />;
        case "stat-netpnl":
          return <NetPnlWidget data={aggregatedData} isLoading={isLoading} />;
        case "stat-won":
          return <WonWidget data={aggregatedData} isLoading={isLoading} />;
        case "stat-lost":
          return <LostWidget data={aggregatedData} isLoading={isLoading} />;
        case "stat-winrate":
          return <WinRateWidget data={aggregatedData} isLoading={isLoading} />;
        case "stat-volume":
          return <VolumeWidget data={aggregatedData} isLoading={isLoading} />;
        case "stat-trades":
          return <TradesWidget data={aggregatedData} isLoading={isLoading} />;
        case "wallets":
          return (
            <WalletsWidget
              wallets={wallets}
              selectedWallet={selectedWallet}
              viewMode={viewMode}
              compareWallets={compareWallets}
              onWalletClick={handleWalletClick}
              onAddWallet={handleAddWallet}
              onRemoveWallet={handleRemoveWallet}
              onRenameWallet={handleRenameWallet}
              onRemoveAllWallets={handleRemoveAllWallets}
              onReorderWallets={handleReorderWallets}
              onToggleViewMode={handleToggleViewMode}
              onToggleCompareWallet={toggleCompareWallet}
            />
          );
        case "pnl-chart":
          return (
            <ChartWidget
              data={combinedPnlHistory}
              multiData={viewMode !== "single" && pnlHistories.length > 1 ? pnlHistories : undefined}
              isLoading={isLoading}
            />
          );
        case "positions":
          return <PositionsWidget positions={mappedPositions} isLoading={isLoading} />;
        default:
          return null;
      }
    })();

    if (isStatWidget) {
      return content;
    }

    return (
      <div className="stat-card h-full overflow-hidden">
        {content}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setEditingTitle(false);
                  localStorage.setItem("polytracker-title", title);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingTitle(false);
                    localStorage.setItem("polytracker-title", title);
                  }
                }}
                className="text-base sm:text-lg font-bold tracking-tight bg-transparent border-b border-primary outline-none"
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight">{title}</h1>
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Viewing:</span>
              <span className="font-medium">{getViewModeLabel()}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-2 w-2 rounded-full bg-gain animate-pulse-glow" />
              <span className="text-xs text-muted-foreground font-mono">Live</span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <ResponsiveGridLayout
          layouts={layouts}
          breakpoints={GRID_CONFIG.breakpoints}
          cols={GRID_CONFIG.cols}
          rowHeight={GRID_CONFIG.rowHeight}
          margin={GRID_CONFIG.margin}
          containerPadding={GRID_CONFIG.containerPadding}
          onLayoutChange={onLayoutChange}
          onBreakpointChange={onBreakpointChange}
          draggableHandle=".widget-drag-handle"
          isResizable={true}
          isDraggable={true}
          useCSSTransforms={true}
        >
          {activeWidgets.map((widgetType) => (
            <div key={widgetType} className="widget-item">
              <WidgetWrapper widgetType={widgetType} onRemove={removeWidget}>
                {renderWidget(widgetType)}
              </WidgetWrapper>
            </div>
          ))}
        </ResponsiveGridLayout>
      </main>

      <footer className="border-t border-border px-6 py-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          vibed by{" "}
          <a
            href="https://x.com/0xashrk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
          >
            0xashrk
          </a>
        </div>
      </footer>

      <WidgetFAB
        availableWidgets={getAvailableWidgets()}
        onAddWidget={addWidget}
        onExport={exportLayout}
        onImport={importLayout}
        onReset={resetToDefault}
      />
    </div>
  );
};

export default Index;
