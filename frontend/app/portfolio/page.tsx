"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzePortfolioDirect } from "@/services/api";
import { PortfolioAnalysis, HoldingAnalysis } from "@/types/portfolio";
import toast from "react-hot-toast";
import {
  PlusCircle, Trash2, BarChart3, TrendingUp, TrendingDown,
  AlertTriangle, Lightbulb, PieChart, ChevronDown, ChevronUp
} from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const SECTOR_COLORS = [
  "#10b981","#06b6d4","#f59e0b","#818cf8","#f43f5e",
  "#34d399","#38bdf8","#fbbf24","#a78bfa","#fb7185",
];

type HoldingRow = { ticker: string; quantity: string; avg_buy_price: string };

function fmt(n?: number | null, prefix = "₹", dec = 0) {
  if (n == null) return "—";
  return `${prefix}${n.toLocaleString("en-IN", { maximumFractionDigits: dec })}`;
}

function DiversificationRing({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 10) * circ;
  const color = score >= 7 ? "#10b981" : score >= 5 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="hsl(220 15% 16%)" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">/10</span>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<HoldingRow[]>([
    { ticker: "INFY.NS", quantity: "50", avg_buy_price: "1750" },
    { ticker: "HDFCBANK.NS", quantity: "30", avg_buy_price: "1620" },
    { ticker: "RELIANCE.NS", quantity: "20", avg_buy_price: "2850" },
  ]);
  const [portfolioName, setPortfolioName] = useState("My Portfolio");
  const [result, setResult] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedHolding, setExpandedHolding] = useState<string | null>(null);

  const addRow = () =>
    setHoldings((prev) => [...prev, { ticker: "", quantity: "", avg_buy_price: "" }]);

  const removeRow = (i: number) =>
    setHoldings((prev) => prev.filter((_, idx) => idx !== i));

  const updateRow = (i: number, field: keyof HoldingRow, val: string) =>
    setHoldings((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: val } : row))
    );

  const analyze = async () => {
    const valid = holdings.filter(
      (h) => h.ticker.trim() && h.quantity && h.avg_buy_price
    );
    if (valid.length === 0) {
      toast.error("Add at least one holding");
      return;
    }
    setLoading(true);
    try {
      const data = await analyzePortfolioDirect({
        name: portfolioName,
        holdings: valid.map((h) => ({
          ticker: h.ticker.trim().toUpperCase(),
          quantity: parseFloat(h.quantity),
          avg_buy_price: parseFloat(h.avg_buy_price),
        })),
      });
      setResult(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Portfolio Analyzer</h1>
        <p className="text-muted-foreground mt-1">
          Enter your holdings to get diversification score, P&L, and AI rebalancing suggestions.
        </p>
      </div>

      {/* Input form */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <input
            value={portfolioName}
            onChange={(e) => setPortfolioName(e.target.value)}
            className="text-xl font-semibold bg-transparent border-none outline-none text-foreground w-full max-w-sm"
            placeholder="Portfolio name"
          />
        </div>

        <div className="space-y-2 mb-4">
          <div className="grid grid-cols-[2fr_1fr_1fr_40px] gap-2 text-xs text-muted-foreground uppercase tracking-wider px-1">
            <span>Ticker</span>
            <span>Quantity</span>
            <span>Avg Buy Price (₹)</span>
            <span />
          </div>
          {holdings.map((h, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_40px] gap-2">
              <input
                value={h.ticker}
                onChange={(e) => updateRow(i, "ticker", e.target.value)}
                placeholder="INFY.NS"
                className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 font-mono text-sm uppercase"
              />
              <input
                value={h.quantity}
                onChange={(e) => updateRow(i, "quantity", e.target.value)}
                type="number"
                placeholder="50"
                className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm"
              />
              <input
                value={h.avg_buy_price}
                onChange={(e) => updateRow(i, "avg_buy_price", e.target.value)}
                type="number"
                placeholder="1750"
                className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm"
              />
              <button
                onClick={() => removeRow(i)}
                className="flex items-center justify-center text-muted-foreground hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={addRow}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Add holding
          </button>
          <div className="flex-1" />
          <button
            onClick={analyze}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all disabled:opacity-50 active:scale-95"
          >
            <BarChart3 className="w-4 h-4" />
            {loading ? "Analyzing..." : "Analyze Portfolio"}
          </button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Invested",
                  value: fmt(result.total_invested),
                  color: "text-foreground",
                },
                {
                  label: "Current Value",
                  value: fmt(result.total_current_value),
                  color: "text-foreground",
                },
                {
                  label: "Total P&L",
                  value: `${result.total_pnl >= 0 ? "+" : ""}${fmt(result.total_pnl)}`,
                  color: result.total_pnl >= 0 ? "text-emerald-400" : "text-rose-400",
                },
                {
                  label: "P&L %",
                  value: `${result.total_pnl_pct >= 0 ? "+" : ""}${result.total_pnl_pct.toFixed(2)}%`,
                  color: result.total_pnl_pct >= 0 ? "text-emerald-400" : "text-rose-400",
                },
              ].map((c) => (
                <div key={c.label} className="glass-card p-4">
                  <div className="text-xs text-muted-foreground mb-1.5">{c.label}</div>
                  <div className={`text-xl font-bold font-mono ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Diversification */}
              <div className="glass-card p-5 flex flex-col items-center text-center gap-3">
                <div className="text-sm font-medium text-foreground">Diversification Score</div>
                <DiversificationRing score={result.diversification_score} />
                <div className={`text-sm px-3 py-1 rounded-full border font-medium ${
                  result.concentration_risk === "Low"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : result.concentration_risk === "Medium"
                    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                }`}>
                  {result.concentration_risk} Concentration Risk
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg stock score: <span className="text-foreground font-medium">{result.avg_stock_score}/10</span>
                </div>
              </div>

              {/* Sector allocation */}
              <div className="glass-card p-5">
                <div className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  Sector Allocation
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={result.sector_allocation}
                        dataKey="weight_pct"
                        nameKey="sector"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        innerRadius={30}
                      >
                        {result.sector_allocation.map((_, i) => (
                          <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [`${val.toFixed(1)}%`, "Weight"]}
                        contentStyle={{
                          background: "hsl(220 18% 10%)",
                          border: "1px solid hsl(220 15% 16%)",
                          borderRadius: "8px",
                          color: "hsl(220 15% 92%)",
                          fontSize: "12px",
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {result.sector_allocation.slice(0, 4).map((s, i) => (
                    <div key={s.sector} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
                      />
                      <span className="text-xs text-muted-foreground flex-1 truncate">{s.sector}</span>
                      <span className="text-xs font-mono text-foreground">{s.weight_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI suggestions */}
              <div className="glass-card p-5">
                <div className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  AI Suggestions
                </div>
                <ul className="space-y-3">
                  {result.ai_suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Holdings table */}
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-semibold text-foreground">Holdings Detail</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                      <th className="text-left px-5 py-3 font-medium">Stock</th>
                      <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Qty</th>
                      <th className="text-right px-4 py-3 font-medium">Invested</th>
                      <th className="text-right px-4 py-3 font-medium">Current</th>
                      <th className="text-right px-4 py-3 font-medium">P&L</th>
                      <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Score</th>
                      <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(result.holdings || []).map((h) => (
                      <tr
                        key={h.ticker}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedHolding(expandedHolding === h.ticker ? null : h.ticker)
                        }
                      >
                        <td className="px-5 py-3">
                          <div className="font-mono font-semibold text-foreground text-sm">{h.ticker}</div>
                          <div className="text-xs text-muted-foreground">{h.sector || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                          {h.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground text-sm">
                          {fmt(h.invested_value)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-foreground text-sm">
                          {fmt(h.current_value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {h.pnl != null ? (
                            <div>
                              <div className={`font-mono text-sm font-medium ${h.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {h.pnl >= 0 ? "+" : ""}{fmt(h.pnl, "₹")}
                              </div>
                              {h.pnl_pct != null && (
                                <div className={`text-xs ${h.pnl_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {h.pnl_pct >= 0 ? "+" : ""}{h.pnl_pct.toFixed(2)}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          {h.score != null ? (
                            <span className={`font-mono font-medium ${
                              h.score >= 7 ? "text-emerald-400" : h.score >= 5 ? "text-amber-400" : "text-rose-400"
                            }`}>{h.score}/10</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                          {h.weight_pct != null ? `${h.weight_pct}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performers */}
            {(result.top_performers.length > 0 || result.underperformers.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.top_performers.length > 0 && (
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Top Performers
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.top_performers.map((t) => (
                        <span key={t} className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.underperformers.length > 0 && (
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                      Underperformers
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.underperformers.map((t) => (
                        <span key={t} className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
