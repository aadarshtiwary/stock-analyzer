"use client";

import { StockMetrics } from "@/types";

interface Props {
  metrics: StockMetrics;
}

function fmt(v?: number | null, unit = "", decimals = 1) {
  if (v == null) return "—";
  return `${v.toFixed(decimals)}${unit}`;
}

function MetricCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: "good" | "bad" | "neutral" | null;
}) {
  const colorClass =
    highlight === "good"
      ? "text-emerald-400"
      : highlight === "bad"
      ? "text-rose-400"
      : highlight === "neutral"
      ? "text-amber-400"
      : "text-foreground";

  return (
    <div className="glass-card p-4 hover:border-emerald-500/20 transition-colors">
      <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
      <div className={`text-xl font-bold font-mono ${colorClass}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function MetricCards({ metrics }: Props) {
  const rsiHighlight =
    metrics.rsi == null ? null
      : metrics.rsi >= 50 && metrics.rsi <= 70 ? "good"
      : metrics.rsi > 70 ? "bad"
      : "neutral";

  const priceVs200 = metrics.current_price && metrics.dma_200
    ? metrics.current_price > metrics.dma_200 ? "good" : "bad"
    : null;

  const cards = [
    { label: "P/E Ratio", value: fmt(metrics.pe_ratio, "x"), hint: "Lower = cheaper valuation", highlight: metrics.pe_ratio ? (metrics.pe_ratio < 25 ? "good" : metrics.pe_ratio < 40 ? "neutral" : "bad") : null },
    { label: "P/B Ratio", value: fmt(metrics.pb_ratio, "x"), hint: "< 3x generally fair", highlight: metrics.pb_ratio ? (metrics.pb_ratio < 3 ? "good" : metrics.pb_ratio < 5 ? "neutral" : "bad") : null },
    { label: "ROE", value: fmt(metrics.roe, "%"), hint: "> 15% is strong", highlight: metrics.roe ? (metrics.roe > 15 ? "good" : metrics.roe > 8 ? "neutral" : "bad") : null },
    { label: "Debt / Equity", value: fmt(metrics.debt_to_equity, "x"), hint: "< 0.5x preferred", highlight: metrics.debt_to_equity != null ? (metrics.debt_to_equity < 0.5 ? "good" : metrics.debt_to_equity < 1.0 ? "neutral" : "bad") : null },
    { label: "Revenue Growth", value: fmt(metrics.revenue_growth, "%"), hint: "YoY", highlight: metrics.revenue_growth ? (metrics.revenue_growth > 10 ? "good" : metrics.revenue_growth > 0 ? "neutral" : "bad") : null },
    { label: "Profit Growth", value: fmt(metrics.profit_growth, "%"), hint: "YoY", highlight: metrics.profit_growth ? (metrics.profit_growth > 10 ? "good" : metrics.profit_growth > 0 ? "neutral" : "bad") : null },
    { label: "RSI (14d)", value: fmt(metrics.rsi), hint: "50–70 is ideal", highlight: rsiHighlight },
    { label: "vs 200 DMA", value: metrics.dma_200 ? `₹${metrics.dma_200.toFixed(0)}` : "—", hint: priceVs200 === "good" ? "Price above — bullish" : priceVs200 === "bad" ? "Price below — caution" : "", highlight: priceVs200 },
    { label: "Beta", value: fmt(metrics.beta), hint: "> 1 = more volatile", highlight: null },
    { label: "Dividend Yield", value: fmt(metrics.dividend_yield, "%"), hint: "Annual", highlight: null },
    { label: "Volume Ratio", value: fmt(metrics.volume_ratio, "x"), hint: "vs 20d avg", highlight: metrics.volume_ratio ? (metrics.volume_ratio > 1.5 ? "good" : null) : null },
    { label: "Current Ratio", value: fmt(metrics.current_ratio, "x"), hint: "> 1.5x healthy", highlight: metrics.current_ratio ? (metrics.current_ratio > 1.5 ? "good" : metrics.current_ratio > 1 ? "neutral" : "bad") : null },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 h-full">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} highlight={card.highlight as any} />
      ))}
    </div>
  );
}
