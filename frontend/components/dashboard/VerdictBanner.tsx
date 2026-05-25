"use client";

import { motion } from "framer-motion";
import { TrendingUp, Eye, TrendingDown } from "lucide-react";
import { Verdict } from "@/types";

interface Props {
  verdict: Verdict;
  score: number;
}

const CONFIG = {
  BUY: {
    icon: TrendingUp,
    bg: "from-emerald-500/10 to-emerald-500/5",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    headline: "Strong Buy Signal",
    subtext: "This stock meets key criteria for quality, growth, and momentum.",
  },
  WATCH: {
    icon: Eye,
    bg: "from-amber-500/10 to-amber-500/5",
    border: "border-amber-500/30",
    text: "text-amber-400",
    headline: "On the Radar",
    subtext: "Promising but not yet fully meeting all criteria. Monitor closely.",
  },
  AVOID: {
    icon: TrendingDown,
    bg: "from-rose-500/10 to-rose-500/5",
    border: "border-rose-500/30",
    text: "text-rose-400",
    headline: "Exercise Caution",
    subtext: "Multiple criteria not met. High risk relative to reward at current levels.",
  },
};

export function VerdictBanner({ verdict, score }: Props) {
  const c = CONFIG[verdict];
  const Icon = c.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`flex items-center gap-4 p-5 rounded-2xl border bg-gradient-to-r ${c.bg} ${c.border}`}
    >
      <div className={`p-3 rounded-xl bg-current/10 ${c.text}`}>
        <Icon className="w-6 h-6" style={{ color: "currentColor" }} />
      </div>
      <div className="flex-1">
        <div className={`text-lg font-bold ${c.text}`}>
          {verdict} — {c.headline}
        </div>
        <div className="text-sm text-muted-foreground mt-0.5">{c.subtext}</div>
      </div>
      <div className={`text-3xl font-bold font-mono ${c.text} hidden sm:block`}>
        {score}/10
      </div>
    </motion.div>
  );
}
