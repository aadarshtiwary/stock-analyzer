"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Zap, Shield, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";

const POPULAR_TICKERS = [
  "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS",
  "ICICIBANK.NS", "BEL.NS", "HAL.NS", "WIPRO.NS",
];

const FEATURES = [
  { icon: BarChart2, title: "Live Data", desc: "Real-time fundamentals & technicals from Yahoo Finance" },
  { icon: Zap, title: "AI Scoring", desc: "10-point scoring engine with threshold-based evaluation" },
  { icon: TrendingUp, title: "Smart Verdict", desc: "BUY / WATCH / AVOID with GPT-4o explanations" },
  { icon: Shield, title: "Risk Analysis", desc: "Debt, momentum, valuation — all in one dashboard" },
];

export default function HomePage() {
  const [ticker, setTicker] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (t) router.push(`/analyze/${t}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(220 15% 16% / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(220 15% 16% / 0.3) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 text-center max-w-3xl w-full"
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Powered by GPT-4o + Live Market Data
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl md:text-7xl text-white mb-4 tracking-tight">
          Stock<span className="text-emerald-400">Sage</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl mb-12 max-w-xl mx-auto">
          Enter any NSE/BSE ticker and get an AI-powered analysis with score, verdict, and plain-language insights — in seconds.
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="ICICIBANK.NS, INFY.NS, BEL.NS..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-lg font-mono transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-lg transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              Analyze
            </button>
          </div>
        </form>

        {/* Popular tickers */}
        <div className="flex flex-wrap gap-2 justify-center mb-16">
          {POPULAR_TICKERS.map((t) => (
            <button
              key={t}
              onClick={() => router.push(`/analyze/${t}`)}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:border-emerald-500/50 hover:text-emerald-400 text-muted-foreground text-sm font-mono transition-all"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass-card p-4 text-left"
            >
              <f.icon className="w-6 h-6 text-emerald-400 mb-3" />
              <div className="font-semibold text-sm text-foreground mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
