"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getWatchlist, removeFromWatchlist, analyzeStock } from "@/services/api";
import { WatchlistItem } from "@/types";
import toast from "react-hot-toast";
import { Bookmark, Trash2, TrendingUp, RefreshCw, Plus } from "lucide-react";
import Link from "next/link";

const VERDICT_STYLE = {
  BUY: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  WATCH: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  AVOID: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const data = await getWatchlist();
      setItems(data);
    } catch (e) {
      toast.error("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (ticker: string) => {
    try {
      await removeFromWatchlist(ticker);
      setItems((prev) => prev.filter((i) => i.ticker !== ticker));
      toast.success(`${ticker} removed`);
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleRefreshScore = async (ticker: string) => {
    setRefreshing(ticker);
    try {
      const result = await analyzeStock(ticker);
      setItems((prev) =>
        prev.map((i) =>
          i.ticker === ticker
            ? { ...i, last_score: result.score, last_verdict: result.verdict, last_analyzed: new Date().toISOString() }
            : i
        )
      );
      toast.success(`${ticker} updated: ${result.score}/10`);
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Watchlist</h1>
          <p className="text-muted-foreground mt-1">{items.length} stocks tracked</p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> Add Stock
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl shimmer" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">No stocks yet</h2>
          <p className="text-muted-foreground mb-6">Analyze a stock and click "Watch" to add it here.</p>
          <Link href="/" className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all">
            Analyze a Stock
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 flex items-center gap-4 hover:border-emerald-500/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-semibold text-foreground">{item.ticker}</span>
                  {item.company_name && (
                    <span className="text-sm text-muted-foreground truncate">{item.company_name}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {item.last_score != null && (
                    <span className="text-sm font-medium text-foreground">
                      Score: <span className="text-emerald-400">{item.last_score}/10</span>
                    </span>
                  )}
                  {item.last_verdict && (
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${VERDICT_STYLE[item.last_verdict as keyof typeof VERDICT_STYLE] || ""}`}>
                      {item.last_verdict}
                    </span>
                  )}
                  {item.last_analyzed && (
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(item.last_analyzed).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleRefreshScore(item.ticker)}
                  disabled={refreshing === item.ticker}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-400 transition-all disabled:opacity-50"
                  title="Refresh score"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing === item.ticker ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => router.push(`/analyze/${item.ticker}`)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  title="View analysis"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemove(item.ticker)}
                  className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-all"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
