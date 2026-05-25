"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { analyzeStock, addToWatchlist } from "@/services/api";
import { AnalysisResponse } from "@/types";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { VerdictBanner } from "@/components/dashboard/VerdictBanner";
import { MetricsTable } from "@/components/dashboard/MetricsTable";
import { AIInsightPanel } from "@/components/dashboard/AIInsightPanel";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { PriceHeader } from "@/components/dashboard/PriceHeader";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { TechnicalMiniChart } from "@/components/charts/TechnicalMiniChart";
import { NewsSentimentPanel } from "@/components/dashboard/NewsSentimentPanel";
import { EarningsPanel } from "@/components/dashboard/EarningsPanel";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { ColdStartBanner } from "@/components/ui/ColdStartBanner";
import { Bookmark, RefreshCw, ArrowLeft } from "lucide-react";

export default function AnalyzePage() {
  const params = useParams();
  const router = useRouter();
  const ticker = decodeURIComponent(params.ticker as string).toUpperCase();

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeStock(ticker);
      setData(result);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Analysis failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [ticker]);

  const handleWatchlist = async () => {
    setSaving(true);
    try {
      await addToWatchlist(ticker);
      toast.success(`${ticker} added to watchlist!`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Already in watchlist";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-emerald-500/50 text-muted-foreground hover:text-emerald-400 transition-all text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleWatchlist}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 transition-all text-sm disabled:opacity-50"
          >
            <Bookmark className="w-4 h-4" />
            {saving ? "Saving..." : "Watch"}
          </button>
        </div>
      </div>

      {loading && <SkeletonLoader />}
      <ColdStartBanner isLoading={loading} />

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-rose-400 text-6xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Analysis Failed</h2>
          <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
          <button
            onClick={fetchAnalysis}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      <AnimatePresence>
        {data && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Price header */}
            <PriceHeader data={data} />

            {/* Verdict banner */}
            <VerdictBanner verdict={data.verdict} score={data.score} />

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score ring */}
              <div className="glass-card p-6 flex flex-col items-center justify-center">
                <ScoreRing score={data.score} verdict={data.verdict} />
                <div className="mt-4 text-center">
                  <div className="text-sm text-muted-foreground">Data Quality</div>
                  <div className={`text-sm font-medium mt-1 ${
                    data.data_quality === "High" ? "text-emerald-400" :
                    data.data_quality === "Medium" ? "text-amber-400" : "text-rose-400"
                  }`}>
                    {data.data_quality}
                  </div>
                </div>
              </div>

              {/* Key metric cards */}
              <div className="lg:col-span-2">
                <MetricCards metrics={data.metrics} />
              </div>
            </div>

            {/* TradingView chart */}
            <TradingViewChart ticker={ticker} />

            {/* Technical mini-charts */}
            <TechnicalMiniChart metrics={data.metrics} />

            {/* Metrics table */}
            <MetricsTable metricResults={data.metric_results} />

            {/* AI insights */}
            <AIInsightPanel analysis={data.ai_analysis} ticker={ticker} />

            {/* News sentiment */}
            <NewsSentimentPanel ticker={ticker} />

            {/* Earnings & analyst targets */}
            <EarningsPanel ticker={ticker} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
