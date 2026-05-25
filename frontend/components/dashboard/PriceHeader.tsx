"use client";

import { motion } from "framer-motion";
import { AnalysisResponse } from "@/types";
import { Building2 } from "lucide-react";
import { LivePriceTicker } from "@/components/dashboard/LivePriceTicker";

interface Props {
  data: AnalysisResponse;
}

function fmtCr(cr?: number | null) {
  if (cr == null) return "—";
  if (cr >= 1_00_000) return `₹${(cr / 1_00_000).toFixed(1)}L Cr`;
  if (cr >= 1_000) return `₹${(cr / 1_000).toFixed(1)}K Cr`;
  return `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

export function PriceHeader({ data }: Props) {
  const { metrics, ticker, company_name } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{company_name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {ticker}
              </span>
              {metrics.sector && (
                <span className="text-xs text-muted-foreground">{metrics.sector}</span>
              )}
              {metrics.industry && (
                <span className="text-xs text-muted-foreground/60 hidden md:inline">
                  · {metrics.industry}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-6">
          {/* Live price with WebSocket updates */}
          <LivePriceTicker
            ticker={ticker}
            initialPrice={metrics.current_price ?? undefined}
            initialChange={metrics.price_change_pct ?? undefined}
          />

          <div className="hidden md:block text-right border-l border-border pl-5">
            <div className="text-xs text-muted-foreground mb-1">Market Cap</div>
            <div className="font-semibold text-foreground">{fmtCr(metrics.market_cap_cr)}</div>
            {metrics.pe_ratio && (
              <>
                <div className="text-xs text-muted-foreground mt-2 mb-1">P/E</div>
                <div className="font-semibold text-foreground">{metrics.pe_ratio.toFixed(1)}x</div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
