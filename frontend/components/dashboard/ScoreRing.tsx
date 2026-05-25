"use client";

import { useEffect, useState } from "react";
import { Verdict } from "@/types";

interface Props {
  score: number;
  verdict: Verdict;
}

const VERDICT_CONFIG = {
  BUY: { color: "#10b981", label: "BUY", glow: "0 0 30px rgba(16, 185, 129, 0.3)" },
  WATCH: { color: "#f59e0b", label: "WATCH", glow: "0 0 30px rgba(245, 158, 11, 0.3)" },
  AVOID: { color: "#f43f5e", label: "AVOID", glow: "0 0 30px rgba(244, 63, 94, 0.3)" },
};

export function ScoreRing({ score, verdict }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = VERDICT_CONFIG[verdict];

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 10) * circumference;
  const strokeDashoffset = circumference - progress;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36" style={{ filter: `drop-shadow(${config.glow})` }}>
        <svg width="144" height="144" viewBox="0 0 144 144">
          {/* Background circle */}
          <circle
            cx="72" cy="72" r={radius}
            fill="none"
            stroke="hsl(220 15% 16%)"
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx="72" cy="72" r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="score-ring-circle"
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: "rotate(-90deg)",
              transformOrigin: "72px 72px",
            }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold tabular-nums"
            style={{ color: config.color }}
          >
            {score.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground font-medium">/10</span>
        </div>
      </div>

      <div
        className="px-4 py-1.5 rounded-full text-sm font-bold tracking-widest"
        style={{
          color: config.color,
          background: `${config.color}18`,
          border: `1px solid ${config.color}40`,
        }}
      >
        {config.label}
      </div>
    </div>
  );
}
