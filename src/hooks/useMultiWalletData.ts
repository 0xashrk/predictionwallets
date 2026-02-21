import { useQueries } from "@tanstack/react-query";
import { fetchPositions, fetchClosedPositions, fetchValue, fetchTrades } from "@/lib/polymarket-api";
import type { PolymarketPosition, PolymarketClosedPosition, PolymarketTrade } from "@/lib/polymarket-api";

interface WalletData {
  address: string;
  label: string;
  positions: PolymarketPosition[];
  closedPositions: PolymarketClosedPosition[];
  value: number;
  trades: PolymarketTrade[];
  isLoading: boolean;
}

export function useMultiWalletData(wallets: { address: string; label: string }[]) {
  const positionsQueries = useQueries({
    queries: wallets.map((w) => ({
      queryKey: ["polymarket", "positions", w.address],
      queryFn: () => fetchPositions(w.address),
      enabled: !!w.address,
      staleTime: 30_000,
    })),
  });

  const closedQueries = useQueries({
    queries: wallets.map((w) => ({
      queryKey: ["polymarket", "closed-positions", w.address],
      queryFn: () => fetchClosedPositions(w.address),
      enabled: !!w.address,
      staleTime: 60_000,
    })),
  });

  const valueQueries = useQueries({
    queries: wallets.map((w) => ({
      queryKey: ["polymarket", "value", w.address],
      queryFn: () => fetchValue(w.address),
      enabled: !!w.address,
      staleTime: 30_000,
    })),
  });

  const tradesQueries = useQueries({
    queries: wallets.map((w) => ({
      queryKey: ["polymarket", "trades", w.address],
      queryFn: () => fetchTrades(w.address),
      enabled: !!w.address,
      staleTime: 60_000,
    })),
  });

  const walletsData: WalletData[] = wallets.map((w, i) => ({
    address: w.address,
    label: w.label,
    positions: positionsQueries[i]?.data ?? [],
    closedPositions: closedQueries[i]?.data ?? [],
    value: valueQueries[i]?.data ?? 0,
    trades: tradesQueries[i]?.data ?? [],
    isLoading:
      positionsQueries[i]?.isLoading ||
      closedQueries[i]?.isLoading ||
      valueQueries[i]?.isLoading ||
      tradesQueries[i]?.isLoading ||
      false,
  }));

  const isLoading = walletsData.some((w) => w.isLoading);

  return { walletsData, isLoading };
}
