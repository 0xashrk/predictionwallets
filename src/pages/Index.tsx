import { useState, useMemo } from "react";
import { DollarSign, TrendingUp, BarChart3, Target, Activity, Plus, X, Trash2, ArrowLeftRight } from "lucide-react";
import StatCard from "@/components/StatCard";
import WalletCard from "@/components/WalletCard";
import PnlChart from "@/components/PnlChart";
import PositionsTable from "@/components/PositionsTable";
import { usePositions, useClosedPositions, usePortfolioValue, useTrades } from "@/hooks/usePolymarket";
import type { PolymarketPosition } from "@/lib/polymarket-api";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_WALLETS = [
  { address: "0xd121F678E88074a00886C2dDAb3a27be46EA495D", label: "Tracked" },
];

function loadWallets() {
  try {
    const saved = localStorage.getItem("polytracker-wallets");
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_WALLETS;
}

const Index = () => {
  const [wallets, setWallets] = useState(loadWallets);
  const [selectedWallet, setSelectedWallet] = useState(0);
  const [newAddress, setNewAddress] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const currentAddress = wallets[selectedWallet]?.address ?? "";

  const { data: positions, isLoading: posLoading } = usePositions(currentAddress);
  const { data: closedPositions, isLoading: closedPosLoading } = useClosedPositions(currentAddress);
  const { data: valueData, isLoading: valLoading } = usePortfolioValue(currentAddress);
  const { data: trades, isLoading: tradesLoading } = useTrades(currentAddress);
  

  const totalValue = valueData ?? 0;

  const { totalPnl, winRate, pnlHistory } = useMemo(() => {
    const closed = closedPositions ?? [];

    // Use realizedPnl from closed positions (the authoritative source from Polymarket)
    const realizedPnl = closed.reduce((s, p) => s + (p.realizedPnl ?? 0), 0);

    // Add unrealized PnL from open positions
    const openPnl = (positions ?? []).reduce((s: number, p: PolymarketPosition) => s + (p.cashPnl ?? 0), 0);

    const pnl = realizedPnl + openPnl;

    // Win/loss rate based on per-position realizedPnl
    const winning = closed.filter(p => (p.realizedPnl ?? 0) > 0).length;
    const rate = closed.length > 0 ? Math.round((winning / closed.length) * 100) : 0;

    // Build cumulative PnL history from closed positions sorted by timestamp
    const sorted = [...closed].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    const byDate = new Map<string, { pnl: number; timestamp: number }>();
    for (const p of sorted) {
      const ts = (p.timestamp ?? 0) * 1000;
      const date = new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const existing = byDate.get(date);
      byDate.set(date, { 
        pnl: (existing?.pnl ?? 0) + (p.realizedPnl ?? 0), 
        timestamp: ts 
      });
    }

    const history: { date: string; pnl: number; cumulative: number; timestamp: number }[] = [];
    let cumulative = 0;
    for (const [date, { pnl: pnlVal, timestamp }] of byDate) {
      cumulative += pnlVal;
      history.push({ date, pnl: Math.round(pnlVal * 100) / 100, cumulative: Math.round(cumulative * 100) / 100, timestamp });
    }

    return { totalPnl: pnl, winRate: rate, pnlHistory: history };
  }, [positions, closedPositions]);

  const totalVolume = useMemo(() => {
    if (!trades?.length) return 0;
    return trades.reduce((sum, t) => sum + (t.size * t.price), 0);
  }, [trades]);

  const mappedPositions = useMemo(() => {
    if (!positions?.length) return [];
    return positions.map((p: PolymarketPosition, i: number) => ({
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
  }, [positions]);

  const isLoading = posLoading || valLoading || closedPosLoading || tradesLoading;

  const persistWallets = (updated: typeof wallets) => {
    setWallets(updated);
    localStorage.setItem("polytracker-wallets", JSON.stringify(updated));
  };

  const handleAddWallet = () => {
    if (newAddress && newAddress.startsWith("0x") && newAddress.length === 42) {
      persistWallets([...wallets, { address: newAddress, label: `Wallet ${wallets.length + 1}` }]);
      setNewAddress("");
      setShowAdd(false);
    }
  };

  const handleRemoveWallet = (index: number) => {
    const updated = wallets.filter((_: { address: string; label: string }, i: number) => i !== index);
    persistWallets(updated);
    if (updated.length === 0) {
      setSelectedWallet(0);
    } else if (selectedWallet >= updated.length) {
      setSelectedWallet(updated.length - 1);
    } else if (selectedWallet === index) {
      setSelectedWallet(0);
    }
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
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Ash's Prediction Wallets</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gain animate-pulse-glow" />
            <span className="text-xs text-muted-foreground font-mono">Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                label="Portfolio Value"
                value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <StatCard
                label="All-Time PnL"
                value={`$${totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                change={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                positive={totalPnl >= 0}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                label="Closed Positions"
                value={String(closedPositions?.length ?? 0)}
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <StatCard
                label="Win Rate"
                value={`${winRate}%`}
                icon={<Target className="h-4 w-4" />}
              />
              <StatCard
                label="Total Volume"
                value={`$${totalVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={<ArrowLeftRight className="h-4 w-4" />}
              />
            </>
          )}
        </div>

        {/* Wallets + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Wallets</h2>
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>

            {showAdd && (
              <div className="stat-card flex gap-2">
                <input
                  type="text"
                  placeholder="0x..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="flex-1 bg-secondary rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  onClick={handleAddWallet}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Add
                </button>
              </div>
            )}

            {wallets.map((w: { address: string; label: string }, i: number) => (
              <WalletCard
                key={w.address}
                wallet={w}
                selected={i === selectedWallet}
                onClick={() => setSelectedWallet(i)}
                onRemove={() => handleRemoveWallet(i)}
                onRename={(newLabel) => handleRenameWallet(i, newLabel)}
                removable
              />
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
            {closedPosLoading ? (
              <Skeleton className="h-[360px] rounded-xl" />
            ) : (
              <PnlChart data={pnlHistory} />
            )}
          </div>
        </div>

        {/* Positions */}
        {posLoading ? (
          <Skeleton className="h-[300px] rounded-xl" />
        ) : (
          <PositionsTable positions={mappedPositions} />
        )}
      </main>
    </div>
  );
};

export default Index;
