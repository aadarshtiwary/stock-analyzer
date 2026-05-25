import useSWR from "swr";
import { analyzeStock, getWatchlist, getSectorHeatmap } from "@/services/api";
import { AnalysisResponse, WatchlistItem } from "@/types";
import { SectorHeatmapItem } from "@/types/portfolio";

// Cache stock analysis for 5 minutes
export function useStockAnalysis(ticker: string | null) {
  const { data, error, isLoading, mutate } = useSWR<AnalysisResponse>(
    ticker ? `analyze-${ticker}` : null,
    () => analyzeStock(ticker!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000, // 5 min
      errorRetryCount: 1,
    }
  );
  return { data, error, isLoading, refresh: mutate };
}

// Watchlist with auto-refresh every 30s
export function useWatchlist() {
  const { data, error, isLoading, mutate } = useSWR<WatchlistItem[]>(
    "watchlist",
    getWatchlist,
    { refreshInterval: 30_000 }
  );
  return {
    items: data || [],
    error,
    isLoading,
    refresh: mutate,
  };
}

// Sector heatmap cached for 10 minutes
export function useSectorHeatmap() {
  const { data, error, isLoading, mutate } = useSWR<SectorHeatmapItem[]>(
    "sector-heatmap",
    getSectorHeatmap,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10 * 60 * 1000,
    }
  );
  return { data: data || [], error, isLoading, refresh: mutate };
}
