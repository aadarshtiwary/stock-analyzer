"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTopStocks, triggerScan } from "@/services/api";
import toast from "react-hot-toast";
import { Star, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function TopStocksPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTopStocks();
      setStocks(data);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await triggerScan();
      toast.success("Scan triggered! Results will appear here once complete.");
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Top Picks</h1>
          <p className="text-muted-foreground mt-1">Best-scoring stocks from latest scan</p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
        >
          <Zap className={`w-4 h-4 ${scanning ? "animate-pulse" : ""}`} />
          {scanning ? "Scanning..." : "Trigger Scan"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl shimmer" />
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-24">
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">No data yet</h2>
          <p className="text-muted-foreground mb-6">Trigger a scan to populate top stock picks.</p>
          <button onClick={handleScan} className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all">
            Run Scan Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {stocks.map((s, i) => (
            <motion.div
              key={s.ticker}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => router.push(`/analyze/${s.ticker}`)}
              className="glass-card p-5 flex items-center gap-5 hover:border-emerald-500/30 cursor-pointer transition-all group"
            >
              <div className="text-2xl font-bold font-mono text-muted-foreground w-8">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-mono font-semibold text-foreground">{s.ticker}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{s.sector || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold font-mono text-lg">{s.score}/10</div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{s.verdict}</span>
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
