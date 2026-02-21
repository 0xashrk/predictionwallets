import { useQuery } from "@tanstack/react-query";
import { fetchPositions, fetchClosedPositions, fetchValue, fetchTrades } from "@/lib/polymarket-api";
import type { PolymarketClosedPosition } from "@/lib/polymarket-api";

export function usePositions(address: string) {
  return useQuery({
    queryKey: ["polymarket", "positions", address],
    queryFn: () => fetchPositions(address),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useClosedPositions(address: string) {
  return useQuery<PolymarketClosedPosition[]>({
    queryKey: ["polymarket", "closed-positions", address],
    queryFn: () => fetchClosedPositions(address),
    enabled: !!address,
    staleTime: 60_000,
  });
}

export function usePortfolioValue(address: string) {
  return useQuery({
    queryKey: ["polymarket", "value", address],
    queryFn: () => fetchValue(address),
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useTrades(address: string) {
  return useQuery({
    queryKey: ["polymarket", "trades", address],
    queryFn: () => fetchTrades(address),
    enabled: !!address,
    staleTime: 60_000,
  });
}
