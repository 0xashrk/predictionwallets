import { toast } from "sonner";

interface Trade {
  market?: string;
  side?: string;
  size: number;
  price: number;
  timestamp: number;
}

interface ClosedPosition {
  title?: string;
  outcome?: string;
  size: number;
  avgPrice?: number;
  realizedPnl?: number;
  timestamp?: number;
}

interface Wallet {
  address: string;
  label: string;
}

type ExportType = "trades-csv" | "trades-json" | "positions-csv" | "positions-json";

export function exportWalletData(
  type: ExportType,
  wallets: Wallet[],
  walletsData: any[],
  selectedIndices: number[]
) {
  if (wallets.length === 0) {
    toast.error("No wallets to export");
    return;
  }

  const [dataType, format] = type.split("-") as ["trades" | "positions", "csv" | "json"];
  const data: any[] = [];

  for (const walletIndex of selectedIndices) {
    const wallet = wallets[walletIndex];
    const walletData = walletsData[walletIndex];
    
    if (!walletData) continue;

    if (dataType === "trades") {
      const trades = walletData.trades.map(t => ({
        wallet: wallet.label,
        address: wallet.address,
        market: t.market || "Unknown",
        side: t.side || "Unknown",
        size: t.size,
        price: t.price,
        timestamp: new Date(t.timestamp * 1000).toISOString(),
      }));
      data.push(...trades);
    } else {
      const positions = walletData.closedPositions.map(p => ({
        wallet: wallet.label,
        address: wallet.address,
        market: p.title || "Unknown",
        side: p.outcome || "Unknown",
        size: p.size,
        avgPrice: p.avgPrice || 0,
        realizedPnl: p.realizedPnl || 0,
        timestamp: new Date((p.timestamp || 0) * 1000).toISOString(),
      }));
      data.push(...positions);
    }
  }

  if (data.length === 0) {
    toast.error(`No ${dataType} to export`);
    return;
  }

  data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const scopeLabel = selectedIndices.length === 1 
    ? wallets[selectedIndices[0]].label 
    : `${selectedIndices.length}-wallets`;
  
  const filename = `polytracker-${scopeLabel}-${dataType}-${new Date().toISOString().split('T')[0]}`;

  if (format === "csv") {
    exportCSV(data, filename);
  } else {
    exportJSON(data, filename);
  }
}

function exportCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    )
  ].join("\n");

  downloadFile(csvContent, `${filename}.csv`, "text/csv");
  toast.success("CSV exported");
}

function exportJSON(data: any[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, "application/json");
  toast.success("JSON exported");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
