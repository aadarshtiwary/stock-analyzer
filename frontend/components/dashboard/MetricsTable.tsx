"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { MetricResult } from "@/types";

interface Props {
  metricResults: MetricResult[];
}

const DISPLAY_NAMES: Record<string, string> = {
  roe: "Return on Equity",
  roce: "Return on Capital Employed",
  debt_to_equity: "Debt to Equity",
  revenue_growth: "Revenue Growth (YoY)",
  profit_growth: "Profit Growth (YoY)",
  promoter_holding: "Promoter Holding",
  rsi: "RSI (14-day)",
  price_vs_200dma: "Price vs 200 DMA",
  pb_ratio: "Price to Book",
  current_ratio: "Current Ratio",
};

export function MetricsTable({ metricResults }: Props) {
  const passed = metricResults.filter((r) => r.passed).length;
  const total = metricResults.length;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Threshold Evaluation</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {passed}/{total} criteria passed
          </p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3" /> {passed} Pass
          </span>
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <X className="w-3 h-3" /> {total - passed} Fail
          </span>
        </div>
      </div>

      {/* Pass rate bar */}
      <div className="px-5 pt-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(passed / total) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
          />
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left pb-3 font-medium">Metric</th>
                <th className="text-right pb-3 font-medium">Value</th>
                <th className="text-right pb-3 font-medium hidden sm:table-cell">Threshold</th>
                <th className="text-right pb-3 font-medium hidden md:table-cell">Score</th>
                <th className="text-right pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metricResults.map((r, i) => (
                <motion.tr
                  key={r.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <span className="text-foreground font-medium">
                      {DISPLAY_NAMES[r.name] || r.name.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-foreground">
                    {r.display_value}
                  </td>
                  <td className="py-3 text-right text-muted-foreground hidden sm:table-cell font-mono text-xs">
                    {r.threshold}
                  </td>
                  <td className="py-3 text-right text-muted-foreground hidden md:table-cell font-mono text-xs">
                    {r.passed ? r.score_contribution.toFixed(1) : "0"}/{r.score_contribution.toFixed(1)}
                  </td>
                  <td className="py-3 text-right">
                    {r.display_value === "N/A" ? (
                      <span className="text-muted-foreground text-xs">N/A</span>
                    ) : r.passed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                        <X className="w-3.5 h-3.5" /> Fail
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
