"use client";

import { useState } from "react";
import { analyzeStock } from "@/services/api";
import { AnalysisResponse } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeftRight, Search, Check, X, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

type CompareMetric = {
  label: string;
  keyA: keyof AnalysisResponse["metrics"];
  format: (v: number) => string;
  higherIsBetter: boolean;
  unit?: string;
};

const COMPARE_METRICS: CompareMetric[] = [
  { label: "Current Price", keyA: "current_price", format: (v) => `₹${v.toLocaleString("en-IN")}`, higherIsBetter: false },
  { label: "P/E Ratio", keyA: "pe_ratio", format: (v) => `${v.toFixed(1)}x`, higherIsBetter: false },
  { label: "P/B Ratio", keyA: "pb_ratio", format: (v) => `${v.toFixed(2)}x`, higherIsBetter: false },
  { label: "ROE", keyA: "roe", format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { label: "Debt / Equity", keyA: "debt_to_equity", format: (v) => `${v.toFixed(2)}x`, higherIsBetter: false },
  { label: "Revenue Growth", keyA: "revenue_growth", format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { label: "Profit Growth", keyA: "profit_growth", format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { label: "RSI", keyA: "rsi", format: (v) => v.toFixed(1), higherIsBetter: false },
  { label: "Beta", keyA: "beta", format: (v) => v.toFixed(2), higherIsBetter: false },
  { label: "Dividend Yield", keyA: "dividend_yield", format: (v) => `${v.toFixed(2)}%`, higherIsBetter: true },
  { label: "Current Ratio", keyA: "current_ratio", format: (v) => `${v.toFixed(2)}x`, higherIsBetter: true },
  { label: "Volume Ratio", keyA: "volume_ratio", format: (v) => `${v.toFixed(2)}x`, higherIsBetter: true },
];

function winner(valA: number | null | undefined, valB: number | null | undefined, higherIsBetter: boolean): "A" | "B" | "tie" | null {
  if (valA == null || valB == null) return null;
  if (Math.abs(valA - valB) < 0.001) return "tie";
  if (higherIsBetter) return valA > valB ? "A" : "B";
  return valA < valB ? "A" : "B";
}

function ScoreBar({ score, verdict }: { score: number; verdict: string }) {
  const color = verdict === "BUY" ? "#10b981" : verdict === "WATCH" ? "#f59e0b" : "#f43f5e";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="font-mono font-bold text-sm" style={{ color }}>{score}/10</span>
    </div>
  );
}

export default function ComparePage() {
  const [tickerA, setTickerA] = useState("INFY.NS");
  const [tickerB, setTickerB] = useState("TCS.NS");
  const [dataA, setDataA] = useState<AnalysisResponse | null>(null);
  const [dataB, setDataB] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const compare = async () => {
    if (!tickerA.trim() || !tickerB.trim()) {
      toast.error("Enter both tickers");
      return;
    }
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        analyzeStock(tickerA.trim().toUpperCase()),
        analyzeStock(tickerB.trim().toUpperCase()),
      ]);
      setDataA(a);
      setDataB(b);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const winsA = dataA && dataB
    ? COMPARE_METRICS.filter((m) => {
        const w = winner(
          dataA.metrics[m.keyA] as number,
          dataB.metrics[m.keyA] as number,
          m.higherIsBetter
        );
        return w === "A";
      }).length
    : 0;

  const winsB = dataA && dataB
    ? COMPARE_METRICS.filter((m) => {
        const w = winner(
          dataA.metrics[m.keyA] as number,
          dataB.metrics[m.keyA] as number,
          m.higherIsBetter
        );
        return w === "B";
      }).length
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Compare Stocks</h1>
        <p className="text-muted-foreground mt-1">Side-by-side fundamental & technical comparison</p>
      </div>

      {/* Input */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={tickerA}
            onChange={(e) => setTickerA(e.target.value.toUpperCase())}
            placeholder="INFY.NS"
            className="flex-1 min-w-[140px] px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono uppercase"
          />
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border border-border">
            <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <input
            value={tickerB}
            onChange={(e) => setTickerB(e.target.value.toUpperCase())}
            placeholder="TCS.NS"
            className="flex-1 min-w-[140px] px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono uppercase"
          />
          <button
            onClick={compare}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {dataA && dataB && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Header cards */}
            <div className="grid grid-cols-2 gap-4">
              {[dataA, dataB].map((d, i) => {
                const isWinner = i === 0 ? winsA > winsB : winsB > winsA;
                return (
                  <div
                    key={d.ticker}
                    className={`glass-card p-5 relative ${isWinner ? "border-emerald-500/40" : ""}`}
                  >
                    {isWinner && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        Winner
                      </div>
                    )}
                    <div className="font-mono font-bold text-lg text-foreground">{d.ticker}</div>
                    <div className="text-sm text-muted-foreground mt-0.5 mb-4 truncate">{d.company_name}</div>
                    <ScoreBar score={d.score} verdict={d.verdict} />
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        d.verdict === "BUY" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" :
                        d.verdict === "WATCH" ? "text-amber-400 bg-amber-500/10 border-amber-500/25" :
                        "text-rose-400 bg-rose-500/10 border-rose-500/25"
                      }`}>{d.verdict}</span>
                      <span className="text-xs text-muted-foreground">{d.metrics.sector || "—"}</span>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Won <span className="text-foreground font-semibold">{i === 0 ? winsA : winsB}</span> of {COMPARE_METRICS.filter(m => winner(dataA.metrics[m.keyA] as number, dataB.metrics[m.keyA] as number, m.higherIsBetter) !== null && winner(dataA.metrics[m.keyA] as number, dataB.metrics[m.keyA] as number, m.higherIsBetter) !== "tie").length} metrics
                    </div>
                    <Link
                      href={`/analyze/${d.ticker}`}
                      className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Full analysis
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-semibold text-foreground">Metric Comparison</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Green = better value for that metric
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Metric</th>
                      <th className="text-center px-4 py-3 text-xs text-emerald-400 font-semibold">{dataA.ticker}</th>
                      <th className="text-center px-4 py-3 text-xs text-cyan-400 font-semibold">{dataB.ticker}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {COMPARE_METRICS.map((m) => {
                      const vA = dataA.metrics[m.keyA] as number | undefined;
                      const vB = dataB.metrics[m.keyA] as number | undefined;
                      const w = winner(vA, vB, m.higherIsBetter);
                      return (
                        <tr key={m.label} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3 text-muted-foreground text-sm">{m.label}</td>
                          <td className={`px-4 py-3 text-center font-mono text-sm font-medium ${w === "A" ? "text-emerald-400" : w === "B" ? "text-rose-400/70" : "text-foreground"}`}>
                            {vA != null ? m.format(vA) : "—"}
                            {w === "A" && <span className="ml-1.5 text-xs">✓</span>}
                          </td>
                          <td className={`px-4 py-3 text-center font-mono text-sm font-medium ${w === "B" ? "text-emerald-400" : w === "A" ? "text-rose-400/70" : "text-foreground"}`}>
                            {vB != null ? m.format(vB) : "—"}
                            {w === "B" && <span className="ml-1.5 text-xs">✓</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI summaries side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[dataA, dataB].map((d) => (
                <div key={d.ticker} className="glass-card p-5">
                  <div className="font-mono font-semibold text-foreground text-sm mb-3">{d.ticker} — AI Summary</div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{d.ai_analysis.summary}</p>
                  <div className="space-y-2">
                    {d.ai_analysis.strengths.slice(0, 2).map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{s}</span>
                      </div>
                    ))}
                    {d.ai_analysis.weaknesses.slice(0, 1).map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <X className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
