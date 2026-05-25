"use client";

import { motion } from "framer-motion";
import { AIAnalysis } from "@/types";
import { TrendingUp, AlertTriangle, Target, Zap, Shield, Clock } from "lucide-react";

interface Props {
  analysis: AIAnalysis;
  ticker: string;
}

const RISK_CONFIG = {
  Low: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  Medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  High: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
};

function Section({ icon: Icon, title, children, color = "text-emerald-400" }: any) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${color}`} />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function AIInsightPanel({ analysis, ticker }: Props) {
  const riskCfg = RISK_CONFIG[analysis.risk_level as keyof typeof RISK_CONFIG] || RISK_CONFIG.Medium;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">AI Insights</h2>
          <p className="text-xs text-muted-foreground">GPT-4o powered analysis</p>
        </div>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 mb-5"
      >
        <p className="text-foreground leading-relaxed">{analysis.summary}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${riskCfg.bg} ${riskCfg.color} border ${riskCfg.border}`}>
            <Shield className="w-3 h-3" />
            Risk: {analysis.risk_level}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-3 h-3" />
            {analysis.time_horizon}
          </div>
          {analysis.target_price_range && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
              <Target className="w-3 h-3" />
              Target: {analysis.target_price_range}
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
        {/* Strengths */}
        <Section icon={TrendingUp} title="Strengths" color="text-emerald-400">
          <ul className="space-y-2">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </Section>

        {/* Weaknesses */}
        <Section icon={AlertTriangle} title="Weaknesses" color="text-amber-400">
          <ul className="space-y-2">
            {analysis.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </Section>

        {/* Risk Factors */}
        <Section icon={Shield} title="Risk Factors" color="text-rose-400">
          <ul className="space-y-2">
            {analysis.risk_factors.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Valuation */}
        <Section icon={Target} title="Valuation Analysis" color="text-cyan-400">
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.valuation_analysis}</p>
        </Section>

        {/* Momentum */}
        <Section icon={Zap} title="Momentum Analysis" color="text-emerald-400">
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.momentum_analysis}</p>
        </Section>
      </div>

      {/* Recommendation */}
      <div className="glass-card p-5 mt-4 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">Recommendation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{analysis.recommendation}</p>
            <p className="text-xs text-muted-foreground/60 mt-3 italic">
              This is AI-generated analysis for educational purposes. Not financial advice. Consult a SEBI-registered advisor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
