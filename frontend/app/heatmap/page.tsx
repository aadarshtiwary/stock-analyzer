"use client";

import { useEffect, useState } from "react";
import { getSectorHeatmap } from "@/services/api";
import { SectorHeatmapItem } from "@/types/portfolio";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Layers, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

const SECTOR_TICKERS: Record<string, string> = {
  "Information Technology": "TCS.NS",
  "Banking & Finance": "HDFCBANK.NS",
  "FMCG": "HINDUNILVR.NS",
  "Automobiles": "MARUTI.NS",
  "Pharma": "SUNPHARMA.NS",
  "Energy": "RELIANCE.NS",
  "Metals": "TATASTEEL.NS",
  "Capital Goods": "LT.NS",
  "Telecom": "BHARTIARTL.NS",
  "Real Estate": "DLF.NS",
};

function scoreColor(score: number) {
  if (score >= 7) return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "#10b981" };
  if (score >= 5) return { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#f59e0b" };
  return { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.3)", text: "#f43f5e" };
}

function changeColor(pct: number) {
  if (pct > 0.3) return "text-emerald-400";
  if (pct < -0.3) return "text-rose-400";
  return "text-amber-400";
}

const SENTIMENT_ICON = {
  Bullish: TrendingUp,
  Bearish: TrendingDown,
  Neutral: Minus,
};

export default function HeatmapPage() {
  const [data, setData] = useState<SectorHeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try {
      const result = await getSectorHeatmap();
      setData(result);
    } catch {
      toast.error("Failed to load sector data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Sector Heatmap</h1>
          <p className="text-muted-foreground mt-1">
            NSE sector scores based on representative stock analysis
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-emerald-500/30 text-muted-foreground hover:text-emerald-400 transition-all text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-6 text-xs text-muted-foreground">
        {[
          { label: "Strong (7+)", color: "#10b981" },
          { label: "Fair (5–7)", color: "#f59e0b" },
          { label: "Weak (<5)", color: "#f43f5e" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: l.color + "33", border: `1px solid ${l.color}88` }}
            />
            {l.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((sector, i) => {
            const colors = scoreColor(sector.avg_score);
            const SentimentIcon = SENTIMENT_ICON[sector.sentiment] || Minus;
            const representativeTicker = SECTOR_TICKERS[sector.sector];

            return (
              <motion.div
                key={sector.sector}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => representativeTicker && router.push(`/analyze/${representativeTicker}`)}
                className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] border"
                style={{
                  background: colors.bg,
                  borderColor: colors.border,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" style={{ color: colors.text }} />
                    <SentimentIcon className="w-3 h-3" style={{ color: colors.text }} />
                  </div>
                  <span
                    className="text-2xl font-bold font-mono"
                    style={{ color: colors.text }}
                  >
                    {sector.avg_score}
                  </span>
                </div>

                <div className="font-semibold text-foreground text-sm mb-1 leading-snug">
                  {sector.sector}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-muted-foreground">
                    {sector.stocks_analyzed} stocks
                  </div>
                  <div className={`text-xs font-medium ${changeColor(sector.avg_change_pct)}`}>
                    {sector.avg_change_pct >= 0 ? "+" : ""}{sector.avg_change_pct.toFixed(2)}%
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-3 h-1.5 bg-black/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sector.avg_score * 10}%` }}
                    transition={{ delay: i * 0.07 + 0.3, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: colors.text }}
                  />
                </div>

                {sector.avg_pe && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Sector P/E: <span className="text-foreground">{sector.avg_pe.toFixed(1)}x</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs text-muted-foreground/50 mt-8">
        Sector scores are averages based on 2–3 representative NSE stocks.
        Not a comprehensive sector index. For educational purposes only.
      </p>
    </div>
  );
}
