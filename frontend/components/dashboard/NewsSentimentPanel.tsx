"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { getNewsSentiment } from "@/services/api";
import { NewsSentiment } from "@/types/portfolio";

interface Props {
  ticker: string;
}

const SENTIMENT_CONFIG = {
  Bullish: {
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  Bearish: {
    icon: TrendingDown,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  Neutral: {
    icon: Minus,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
};

export function NewsSentimentPanel({ ticker }: Props) {
  const [data, setData] = useState<NewsSentiment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNewsSentiment(ticker)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="h-4 w-32 rounded shimmer mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cfg = SENTIMENT_CONFIG[data.sentiment] || SENTIMENT_CONFIG.Neutral;
  const Icon = cfg.icon;
  const scoreWidth = `${Math.round(data.score * 100)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">News Sentiment</h3>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
          <Icon className="w-3 h-3" />
          {data.sentiment}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Sentiment score bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Bearish</span>
            <span>Bullish</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden relative">
            {/* Center marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-10" />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: scoreWidth }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                data.sentiment === "Bullish"
                  ? "bg-emerald-500"
                  : data.sentiment === "Bearish"
                  ? "bg-rose-500"
                  : "bg-amber-500"
              }`}
            />
          </div>
          <div className="text-right text-xs text-muted-foreground mt-1">
            {data.headline_count} headlines analyzed
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>

        {/* Key themes */}
        {data.key_themes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.key_themes.map((theme, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs border border-border"
              >
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Headlines */}
        {data.headlines.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent Headlines
            </div>
            {data.headlines.slice(0, 5).map((h, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                    {h.headline}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{h.source}</span>
                    {h.url && (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
