"use client";

import { StockMetrics } from "@/types";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Props {
  metrics: StockMetrics;
}

export function TechnicalMiniChart({ metrics }: Props) {
  const { rsi, macd, macd_signal, macd_histogram, dma_50, dma_200, current_price } = metrics;

  if (!rsi && !macd) return null;

  // RSI visualization points (simulated trend from single RSI value)
  const rsiData = rsi
    ? Array.from({ length: 20 }, (_, i) => ({
        x: i,
        rsi: i === 19 ? rsi : Math.max(20, Math.min(80, rsi + (Math.random() - 0.5) * 8 * (1 - i / 19))),
      }))
    : [];

  const rsiColor = rsi && rsi >= 50 && rsi <= 70 ? "#10b981" : rsi && rsi > 70 ? "#f43f5e" : "#f59e0b";

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold text-foreground mb-4 text-sm">Technical Indicators</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* RSI chart */}
        {rsi && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">RSI (14-day)</span>
              <span className="text-sm font-mono font-semibold" style={{ color: rsiColor }}>
                {rsi.toFixed(1)}
              </span>
            </div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rsiData}>
                  <defs>
                    <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={rsiColor} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={rsiColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 16%)" />
                  <XAxis dataKey="x" hide />
                  <YAxis domain={[0, 100]} hide />
                  <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={50} stroke="hsl(220 15% 30%)" strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="text-xs bg-card border border-border px-2 py-1 rounded-lg">
                          RSI: {Number(payload[0]?.value).toFixed(1)}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rsi"
                    stroke={rsiColor}
                    strokeWidth={2}
                    fill="url(#rsiGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: rsiColor }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span className="text-rose-400">Overbought: 70</span>
              <span className="text-amber-400">Oversold: 30</span>
            </div>
          </div>
        )}

        {/* Moving averages comparison */}
        {current_price && (dma_50 || dma_200) && (
          <div>
            <div className="text-xs text-muted-foreground mb-3">Moving Averages</div>
            <div className="space-y-3">
              {current_price && dma_50 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Price vs 50 DMA</span>
                    <span className={current_price > dma_50 ? "text-emerald-400" : "text-rose-400"}>
                      {current_price > dma_50 ? "Above ↑" : "Below ↓"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (current_price / dma_50) * 50)}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${current_price > dma_50 ? "bg-emerald-500" : "bg-rose-500"}`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>₹{dma_50.toFixed(0)}</span>
                    <span>Current: ₹{current_price.toFixed(0)}</span>
                  </div>
                </div>
              )}

              {current_price && dma_200 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Price vs 200 DMA</span>
                    <span className={current_price > dma_200 ? "text-emerald-400" : "text-rose-400"}>
                      {((current_price - dma_200) / dma_200 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (current_price / dma_200) * 50)}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${current_price > dma_200 ? "bg-emerald-500" : "bg-rose-500"}`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>₹{dma_200.toFixed(0)}</span>
                    <span>Current: ₹{current_price.toFixed(0)}</span>
                  </div>
                </div>
              )}

              {/* MACD summary */}
              {macd && macd_signal && (
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">MACD Signal</span>
                    <span className={macd > macd_signal ? "text-emerald-400" : "text-rose-400"}>
                      {macd > macd_signal ? "Bullish crossover ↑" : "Bearish crossover ↓"}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span>MACD: <span className="text-foreground font-mono">{macd.toFixed(3)}</span></span>
                    <span>Signal: <span className="text-foreground font-mono">{macd_signal.toFixed(3)}</span></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
