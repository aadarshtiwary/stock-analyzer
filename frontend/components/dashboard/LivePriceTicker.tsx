"use client";

import { useLivePrice } from "@/hooks/useLivePrice";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  ticker: string;
  initialPrice?: number;
  initialChange?: number;
}

export function LivePriceTicker({ ticker, initialPrice, initialChange }: Props) {
  const { price, change_pct, connected, lastUpdated } = useLivePrice(ticker);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  const displayPrice = price ?? initialPrice;
  const displayChange = change_pct ?? initialChange;

  // Flash green/red when price updates
  useEffect(() => {
    if (price == null || prevPriceRef.current == null) {
      prevPriceRef.current = price;
      return;
    }
    if (price > prevPriceRef.current) {
      setFlash("up");
    } else if (price < prevPriceRef.current) {
      setFlash("down");
    }
    prevPriceRef.current = price;
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }, [price]);

  const isPositive = (displayChange ?? 0) >= 0;

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={displayPrice}
          initial={{ opacity: 0.6, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-3xl font-bold font-mono transition-colors duration-300 ${
            flash === "up"
              ? "text-emerald-400"
              : flash === "down"
              ? "text-rose-400"
              : "text-foreground"
          }`}
        >
          {displayPrice != null ? `₹${displayPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col gap-1">
        {displayChange != null && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {isPositive ? "+" : ""}{displayChange.toFixed(2)}%
          </div>
        )}
        <div className="flex items-center gap-1">
          <Radio className={`w-3 h-3 ${connected ? "text-emerald-400 animate-pulse" : "text-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">
            {connected ? "Live" : "Delayed"}
            {lastUpdated && (
              <> · {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
