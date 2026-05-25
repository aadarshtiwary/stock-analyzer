"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Target, TrendingUp, TrendingDown,
  BarChart2, Users, ChevronUp, ChevronDown, Minus
} from "lucide-react";

interface EarningsData {
  ticker: string;
  next_earnings_date?: string;
  eps: {
    trailing?: number;
    current_year_estimate?: number;
    forward?: number;
  };
  revenue_estimate?: number;
  analyst_consensus?: string;
  analyst_count?: number;
  price_targets: {
    high?: number;
    low?: number;
    mean?: number;
    median?: number;
    current_price?: number;
  };
  upside_pct?: number;
  analyst_recommendations: {
    firm: string;
    to_grade: string;
    from_grade: string;
    action: string;
  }[];
  error?: string;
}

interface Props {
  ticker: string;
}

const CONSENSUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  "STRONG_BUY": { label: "Strong Buy", color: "text-emerald-400", Icon: TrendingUp },
  "BUY":        { label: "Buy",         color: "text-emerald-400", Icon: TrendingUp },
  "HOLD":       { label: "Hold",        color: "text-amber-400",   Icon: Minus },
  "UNDERPERFORM":{ label: "Underperform", color: "text-rose-400",  Icon: TrendingDown },
  "SELL":       { label: "Sell",        color: "text-rose-400",    Icon: TrendingDown },
};

function fmt(v?: number | null, prefix = "₹", dec = 2) {
  if (v == null) return "—";
  return `${prefix}${v.toLocaleString("en-IN", { maximumFractionDigits: dec })}`;
}

export function EarningsPanel({ ticker }: Props) {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    fetch(`${API}/earnings/${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="h-4 w-40 rounded shimmer mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-lg shimmer" />)}
        </div>
      </div>
    );
  }

  if (!data || data.error) return null;

  const consensus = data.analyst_consensus?.toUpperCase().replace(/ /g, "_") || "";
  const cfg = CONSENSUS_CONFIG[consensus] || CONSENSUS_CONFIG["HOLD"];
  const Icon = cfg.Icon;

  const upside = data.upside_pct;
  const upsidePositive = upside != null && upside > 0;

  const daysToEarnings = data.next_earnings_date
    ? Math.ceil(
        (new Date(data.next_earnings_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Earnings & Analyst Targets</h3>
        </div>
        {data.analyst_count && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {data.analyst_count} analysts
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Top row: consensus + next earnings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 border-0 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-2">Analyst Consensus</div>
            <div className={`flex items-center gap-2 font-bold text-base ${cfg.color}`}>
              <Icon className="w-4 h-4" />
              {cfg.label}
            </div>
          </div>
          <div className="glass-card p-4 border-0 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-2">Next Earnings</div>
            {data.next_earnings_date ? (
              <div>
                <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {new Date(data.next_earnings_date).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric"
                  })}
                </div>
                {daysToEarnings != null && daysToEarnings >= 0 && (
                  <div className="text-xs text-amber-400 mt-1">
                    in {daysToEarnings} day{daysToEarnings !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">Not scheduled</div>
            )}
          </div>
        </div>

        {/* EPS row */}
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            EPS (Earnings Per Share)
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Trailing", value: data.eps.trailing },
              { label: "Est. This Year", value: data.eps.current_year_estimate },
              { label: "Forward", value: data.eps.forward },
            ].map((e) => (
              <div key={e.label} className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground mb-1">{e.label}</div>
                <div className={`font-mono font-bold text-sm ${e.value && e.value > 0 ? "text-emerald-400" : e.value && e.value < 0 ? "text-rose-400" : "text-foreground"}`}>
                  {e.value != null ? `₹${e.value.toFixed(2)}` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price targets */}
        {(data.price_targets.mean || data.price_targets.high) && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Analyst Price Targets
            </div>

            {/* Visual target range bar */}
            {data.price_targets.low && data.price_targets.high && data.price_targets.current_price && (
              <div className="mb-4">
                <div className="relative h-6 flex items-center">
                  <div className="absolute inset-x-0 h-1.5 bg-muted rounded-full" />
                  {/* Range fill */}
                  {(() => {
                    const lo = data.price_targets.low;
                    const hi = data.price_targets.high;
                    const cur = data.price_targets.current_price!;
                    const range = hi - lo;
                    const leftPct = 0;
                    const widthPct = 100;
                    const curPct = Math.max(0, Math.min(100, ((cur - lo) / range) * 100));
                    const meanPct = data.price_targets.mean
                      ? Math.max(0, Math.min(100, ((data.price_targets.mean - lo) / range) * 100))
                      : null;

                    return (
                      <>
                        <div
                          className="absolute h-1.5 bg-gradient-to-r from-rose-500/30 via-amber-500/30 to-emerald-500/30 rounded-full"
                          style={{ left: 0, right: 0 }}
                        />
                        {/* Current price marker */}
                        <div
                          className="absolute w-3 h-3 rounded-full bg-foreground border-2 border-background shadow-md z-10"
                          style={{ left: `calc(${curPct}% - 6px)` }}
                          title={`Current: ₹${cur}`}
                        />
                        {/* Mean target */}
                        {meanPct != null && (
                          <div
                            className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background shadow-md z-10"
                            style={{ left: `calc(${meanPct}% - 5px)` }}
                            title={`Mean target: ₹${data.price_targets.mean}`}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>Low {fmt(data.price_targets.low)}</span>
                  <span className="text-muted-foreground/60">● Current &nbsp; ◉ Mean</span>
                  <span>High {fmt(data.price_targets.high)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Low", value: data.price_targets.low },
                { label: "Mean", value: data.price_targets.mean },
                { label: "Median", value: data.price_targets.median },
                { label: "High", value: data.price_targets.high },
              ].map((t) => (
                <div key={t.label} className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">{t.label}</div>
                  <div className="font-mono font-semibold text-sm text-foreground">
                    {fmt(t.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Upside */}
            {upside != null && (
              <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${upsidePositive ? "text-emerald-400" : "text-rose-400"}`}>
                {upsidePositive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>
                  {upsidePositive ? "+" : ""}{upside.toFixed(1)}% upside to mean analyst target
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recent analyst recommendations */}
        {data.analyst_recommendations.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Recent Analyst Actions
            </div>
            <div className="space-y-2">
              {data.analyst_recommendations.slice(0, 4).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border"
                >
                  <span className="text-sm text-foreground font-medium">{r.firm || "Analyst"}</span>
                  <div className="flex items-center gap-2">
                    {r.from_grade && (
                      <>
                        <span className="text-xs text-muted-foreground">{r.from_grade}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                      </>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      ["BUY", "OUTPERFORM", "STRONG BUY", "OVERWEIGHT"].includes(r.to_grade?.toUpperCase() || "")
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : ["SELL", "UNDERPERFORM", "UNDERWEIGHT"].includes(r.to_grade?.toUpperCase() || "")
                        ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    }`}>
                      {r.to_grade || r.action || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
