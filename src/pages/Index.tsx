import { useState, useMemo, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Target, Activity, Plus, X, Trash2, ArrowLeftRight, GripVertical, Layers, ChevronDown, ChevronUp, Moon, Sun, Pencil } from "lucide-react";
import StatCard from "@/components/StatCard";
import WalletCard from "@/components/WalletCard";
import PnlChart from "@/components/PnlChart";
import PositionsTable from "@/components/PositionsTable";
import { useMultiWalletData } from "@/hooks/useMultiWalletData";
import type { PolymarketPosition } from "@/lib/polymarket-api";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showPositions, setShowPositions] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(loadTheme);
  const [title, setTitle] = useState(loadTitle);
  const [editingTitle, setEditingTitle] = useState(false);

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

  const handleAddWallet = () => {
    if (newAddress && newAddress.startsWith("0x") && newAddress.length === 42) {
      const label = newLabel.trim() || `Wallet ${wallets.length + 1}`;
      persistWallets([...wallets, { address: newAddress, label }]);
      setNewAddress("");
      setNewLabel("");
      setShowAdd(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const updated = [...wallets];
      const [removed] = updated.splice(draggedIndex, 1);
      updated.splice(dragOverIndex, 0, removed);
      persistWallets(updated);

      if (selectedWallet === draggedIndex) {
        setSelectedWallet(dragOverIndex);
      } else if (draggedIndex < selectedWallet && dragOverIndex >= selectedWallet) {
        setSelectedWallet(selectedWallet - 1);
      } else if (draggedIndex > selectedWallet && dragOverIndex <= selectedWallet) {
        setSelectedWallet(selectedWallet + 1);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
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

  const getViewModeLabel = () => {
    if (viewMode === "all") return "All Wallets";
    if (viewMode === "compare") return `Comparing ${compareWallets.size} wallets`;
    return wallets[selectedWallet]?.label ?? "Wallet";
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
                autoFocus
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
          {isLoading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-20 sm:h-24 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                label="Portfolio"
                value={`$${(aggregatedData.totalValue + aggregatedData.totalUsdcBalance).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <StatCard
                label="Net PnL"
                value={`${aggregatedData.totalPnl >= 0 ? "+" : ""}$${aggregatedData.totalPnl.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                positive={aggregatedData.totalPnl >= 0}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                label="Won"
                value={`+$${aggregatedData.grossProfit.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                positive={true}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                label="Lost"
                value={`-$${aggregatedData.grossLoss.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                positive={false}
                icon={<TrendingDown className="h-4 w-4" />}
              />
              <StatCard
                label="Win Rate"
                value={`${aggregatedData.winRate}%`}
                icon={<Target className="h-4 w-4" />}
              />
              <StatCard
                label="Volume"
                value={`$${aggregatedData.totalVolume.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                icon={<ArrowLeftRight className="h-4 w-4" />}
              />
              <StatCard
                label="Trades"
                value={String(aggregatedData.totalClosedPositions)}
                icon={<BarChart3 className="h-4 w-4" />}
              />
            </>
          )}
        </div>

        {/* Wallets + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Wallets</h2>
              <div className="flex items-center gap-2">
                {wallets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode === "all") {
                        setViewMode("single");
                      } else {
                        setViewMode("all");
                        setCompareWallets(new Set());
                      }
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      viewMode === "all"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Layers className="h-3 w-3 inline mr-1" />
                    All
                  </button>
                )}
                {wallets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode === "compare") {
                        setViewMode("single");
                        setCompareWallets(new Set());
                      } else {
                        setViewMode("compare");
                        setCompareWallets(new Set([selectedWallet]));
                      }
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      viewMode === "compare"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    Compare
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAdd(!showAdd)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {showAdd && (
              <div className="stat-card space-y-2">
                <input
                  type="text"
                  placeholder="0x... (wallet address)"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-secondary rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="flex-1 bg-secondary rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddWallet}
                    className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {wallets.length === 0 && !showAdd && (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="stat-card flex flex-col items-center justify-center py-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Add your first wallet</p>
                <p className="text-xs text-muted-foreground mt-1">Track Polymarket positions and PnL</p>
              </button>
            )}

            {wallets.map((w: { address: string; label: string }, i: number) => (
              <div
                key={w.address}
                draggable={wallets.length > 1 && viewMode !== "compare"}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-1 transition-all ${
                  draggedIndex === i ? "opacity-50" : ""
                } ${dragOverIndex === i ? "border-t-2 border-primary" : ""}`}
              >
                {viewMode === "compare" && (
                  <input
                    type="checkbox"
                    checked={compareWallets.has(i)}
                    onChange={() => toggleCompareWallet(i)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                )}
                {wallets.length > 1 && viewMode !== "compare" && (
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
                    <GripVertical className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1">
                  <WalletCard
                    wallet={w}
                    selected={
                      viewMode === "single"
                        ? i === selectedWallet
                        : viewMode === "all"
                        ? true
                        : compareWallets.has(i)
                    }
                    onClick={() => handleWalletClick(i)}
                    onRemove={() => handleRemoveWallet(i)}
                    onRename={(label) => handleRenameWallet(i, label)}
                    removable
                  />
                </div>
              </div>
            ))}

            {wallets.length > 1 && (
              <button
                type="button"
                onClick={handleRemoveAllWallets}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Remove all wallets
              </button>
            )}
          </div>
          <div className="lg:col-span-2">
            {isLoading ? (
              <Skeleton className="h-[360px] rounded-xl" />
            ) : (
              <PnlChart
                data={combinedPnlHistory}
                multiData={viewMode !== "single" && pnlHistories.length > 1 ? pnlHistories : undefined}
              />
            )}
          </div>
        </div>

        {/* Positions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowPositions(!showPositions)}
            className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            {showPositions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Active Positions
          </button>
          {showPositions && (
            isLoading ? (
              <Skeleton className="h-[300px] rounded-xl" />
            ) : (
              <PositionsTable positions={mappedPositions} />
            )
          )}
        </div>
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
    </div>
  );
};

export default Index;
