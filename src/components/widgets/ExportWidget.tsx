import { useState } from "react";
import { Download, FileJson, FileText } from "lucide-react";
import { toast } from "sonner";

interface Wallet {
  address: string;
  label: string;
}

interface Trade {
  market: string;
  side: string;
  size: number;
  price: number;
  timestamp: number;
  pnl?: number;
}

interface WalletData {
  trades: Trade[];
  closedPositions: any[];
}

interface ExportWidgetProps {
  wallets: Wallet[];
  walletsData: WalletData[];
  selectedWallet: number;
}

export default function ExportWidget({ wallets, walletsData, selectedWallet }: ExportWidgetProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [scope, setScope] = useState<"current" | "all">("current");

  const exportData = () => {
    if (wallets.length === 0) {
      toast.error("No wallets to export");
      return;
    }

    const walletsToExport = scope === "all" 
      ? wallets.map((_, i) => i)
      : [selectedWallet];

    const allTrades: any[] = [];

    for (const walletIndex of walletsToExport) {
      const wallet = wallets[walletIndex];
      const data = walletsData[walletIndex];
      
      if (!data) continue;

      // Combine trades and closed positions
      const trades = data.trades.map(t => ({
        wallet: wallet.label,
        address: wallet.address,
        market: t.market || "Unknown",
        side: t.side || "Unknown",
        size: t.size,
        price: t.price,
        timestamp: new Date(t.timestamp * 1000).toISOString(),
        type: "trade",
      }));

      const positions = data.closedPositions.map(p => ({
        wallet: wallet.label,
        address: wallet.address,
        market: p.title || "Unknown",
        side: p.outcome || "Unknown",
        size: p.size,
        avgPrice: p.avgPrice,
        realizedPnl: p.realizedPnl,
        timestamp: new Date((p.timestamp || 0) * 1000).toISOString(),
        type: "position",
      }));

      allTrades.push(...trades, ...positions);
    }

    if (allTrades.length === 0) {
      toast.error("No trade data to export");
      return;
    }

    // Sort by timestamp
    allTrades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (format === "csv") {
      exportCSV(allTrades);
    } else {
      exportJSON(allTrades);
    }
  };

  const exportCSV = (data: any[]) => {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      )
    ].join("\n");

    downloadFile(csvContent, `polymarket-trades-${Date.now()}.csv`, "text/csv");
    toast.success("CSV exported successfully");
  };

  const exportJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `polymarket-trades-${Date.now()}.json`, "application/json");
    toast.success("JSON exported successfully");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col justify-center items-center p-4 space-y-3">
      <div className="flex gap-2 w-full">
        <button
          type="button"
          onClick={() => {
            setFormat("csv");
            setScope("current");
            exportData();
          }}
          className="flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-md bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">CSV</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setFormat("json");
            setScope("current");
            exportData();
          }}
          className="flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-md bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <FileJson className="h-5 w-5" />
          <span className="text-xs">JSON</span>
        </button>
      </div>

      <div className="w-full h-px bg-border" />

      <div className="flex gap-2 w-full">
        <button
          type="button"
          onClick={() => {
            setScope("all");
            exportData();
          }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Download className="h-4 w-4" />
          All Wallets
        </button>
      </div>
    </div>
  );
}
