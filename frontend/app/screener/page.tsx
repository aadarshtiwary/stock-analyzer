"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Filter, Zap, X, ChevronDown, Info } from "lucide-react";

interface ScreenerFilters {
  minRoe: string;
  maxDebt: string;
  minRevGrowth: string;
  minScore: string;
  verdicts: string[];
  minRsi: string;
  maxRsi: string;
  sector: string;
}

interface ScreenerResult {
  ticker: string;
  company_name: string;
  score: number;
  verdict: string;
  roe?: number;
  debt_to_equity?: number;
  revenue_growth?: number;
  rsi?: number;
  current_price?: number;
  sector?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const VERDICT_COLORS: Record<string, string> = {
  BUY: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  WATCH: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  AVOID: "text-rose-400 bg-rose-500/10 border-rose-500/25",
};

const TIERS = [
  { value: "large", label: "Nifty 50", count: 49, desc: "Large cap, fastest (~5 min)" },
  { value: "mid",   label: "Mid Cap",  count: 242, desc: "Next 50 + Midcap 150 (~25 min)" },
  { value: "small", label: "Small Cap", count: 441, desc: "Smallcap universe (~45 min)" },
  { value: "full",  label: "Full NSE", count: 719, desc: "All tiers combined (~75 min)" },
];

const SECTORS = [
  "Any Sector",
  "Information Technology", "Banking & Finance", "FMCG",
  "Automobiles", "Pharma & Healthcare", "Energy & Oil",
  "Metals & Mining", "Capital Goods", "Real Estate",
  "Telecom", "Chemicals", "Consumer Durables",
];

export default function ScreenerPage() {
  const router = useRouter();
  const [tier, setTier] = useState("large");
  const [customTickers, setCustomTickers] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [filters, setFilters] = useState<ScreenerFilters>({
    minRoe: "15",
    maxDebt: "1.0",
    minRevGrowth: "10",
    minScore: "6",
    verdicts: ["BUY", "WATCH"],
    minRsi: "40",
    maxRsi: "75",
    sector: "Any Sector",
  });
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [currentTicker, setCurrentTicker] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [abortRef] = useState({ abort: false });

  const upd = (key: keyof ScreenerFilters, val: string) =>
    setFilters((p) => ({ ...p, [key]: val }));

  const toggleVerdict = (v: string) =>
    setFilters((p) => ({
      ...p,
      verdicts: p.verdicts.includes(v)
        ? p.verdicts.filter((x) => x !== v)
        : [...p.verdicts, v],
    }));

  const passes = useCallback((data: any): boolean => {
    const m = data.metrics;
    const score: number = data.score;
    const verdict: string = data.verdict;

    if (filters.minRoe && (m.roe ?? 0) < parseFloat(filters.minRoe)) return false;
    if (filters.maxDebt && (m.debt_to_equity ?? 999) > parseFloat(filters.maxDebt)) return false;
    if (filters.minRevGrowth && (m.revenue_growth ?? -999) < parseFloat(filters.minRevGrowth)) return false;
    if (filters.minScore && score < parseFloat(filters.minScore)) return false;
    if (filters.verdicts.length > 0 && !filters.verdicts.includes(verdict)) return false;
    if (filters.minRsi && (m.rsi ?? 0) < parseFloat(filters.minRsi)) return false;
    if (filters.maxRsi && (m.rsi ?? 999) > parseFloat(filters.maxRsi)) return false;
    if (filters.sector && filters.sector !== "Any Sector") {
      const s = (m.sector || "").toLowerCase();
      const f = filters.sector.toLowerCase();
      if (!s.includes(f.split(" ")[0])) return false;
    }
    return true;
  }, [filters]);

  const runScreener = async () => {
    abortRef.abort = false;
    setLoading(true);
    setResults([]);
    setProgress(0);
    setScanned(0);
    setCurrentTicker("");

    // Get ticker list
    let tickers: string[] = [];
    if (useCustom && customTickers.trim()) {
      tickers = customTickers
        .split(/[\n,\s]+/)
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t.length > 0);
    } else {
      try {
        const res = await fetch(`${API}/universe?tier=${tier}`);
        const data = await res.json();
        tickers = data.tickers;
      } catch {
        toast.error("Failed to fetch ticker universe");
        setLoading(false);
        return;
      }
    }

    setTotalCount(tickers.length);
    const matched: ScreenerResult[] = [];

    for (let i = 0; i < tickers.length; i++) {
      if (abortRef.abort) break;

      const ticker = tickers[i];
      setCurrentTicker(ticker);

      try {
        const res = await fetch(`${API}/analyze/${encodeURIComponent(ticker)}?skip_ai=true`, {
          signal: AbortSignal.timeout(20000),
        });
        if (res.ok) {
          const data = await res.json();
          if (passes(data)) {
            matched.push({
              ticker,
              company_name: data.company_name,
              score: data.score,
              verdict: data.verdict,
              roe: data.metrics.roe,
              debt_to_equity: data.metrics.debt_to_equity,
              revenue_growth: data.metrics.revenue_growth,
              rsi: data.metrics.rsi,
              current_price: data.metrics.current_price,
              sector: data.metrics.sector,
            });
            // Show results as they come in
            setResults([...matched].sort((a, b) => b.score - a.score));
          }
        }
      } catch {}

      setScanned(i + 1);
      setProgress(Math.round(((i + 1) / tickers.length) * 100));

      // Rate limit: 400ms between requests
      if (i < tickers.length - 1) await new Promise((r) => setTimeout(r, 400));
    }

    setLoading(false);
    setCurrentTicker("");
    if (!abortRef.abort) {
      toast.success(`Done! ${matched.length} of ${tickers.length} stocks matched`);
    }
  };

  const stopScan = () => {
    abortRef.abort = true;
    setLoading(false);
    toast("Scan stopped");
  };

  const selectedTier = TIERS.find((t) => t.value === tier);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Stock Screener</h1>
        <p className="text-muted-foreground mt-1">
          Filter NSE stocks by fundamentals & technicals — from Nifty 50 to full NSE universe
        </p>
      </div>

      {/* Universe selector */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">Universe to Scan</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!useCustom}
              onChange={() => setUseCustom(false)}
              className="accent-emerald-500"
            />
            <span className="text-sm text-foreground">NSE Universe</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={useCustom}
              onChange={() => setUseCustom(true)}
              className="accent-emerald-500"
            />
            <span className="text-sm text-foreground">Custom List</span>
          </label>
        </div>

        {!useCustom ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TIERS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTier(t.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tier === t.value
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-border bg-muted/30 hover:border-emerald-500/30"
                }`}
              >
                <div className={`font-semibold text-sm ${tier === t.value ? "text-emerald-400" : "text-foreground"}`}>
                  {t.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.count} stocks</div>
                <div className="text-xs text-muted-foreground/70 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Enter tickers (one per line, or comma-separated)
            </label>
            <textarea
              value={customTickers}
              onChange={(e) => setCustomTickers(e.target.value)}
              placeholder={"INFY.NS\nTCS.NS\nRELIANCE.NS\nHDFCBANK.NS"}
              rows={5}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono text-sm uppercase resize-none"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {customTickers.split(/[\n,\s]+/).filter((t) => t.trim()).length} tickers entered
            </div>
          </div>
        )}
      </div>

      {/* Filter panel */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-foreground">Screening Criteria</span>
          <button
            onClick={() => setFilters({
              minRoe: "", maxDebt: "", minRevGrowth: "", minScore: "",
              verdicts: ["BUY", "WATCH", "AVOID"], minRsi: "", maxRsi: "", sector: "Any Sector",
            })}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset filters
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: "Min ROE (%)", key: "minRoe", placeholder: "e.g. 15" },
            { label: "Max Debt/Equity (x)", key: "maxDebt", placeholder: "e.g. 1.0" },
            { label: "Min Revenue Growth (%)", key: "minRevGrowth", placeholder: "e.g. 10" },
            { label: "Min Score (0–10)", key: "minScore", placeholder: "e.g. 6" },
            { label: "Min RSI", key: "minRsi", placeholder: "e.g. 40" },
            { label: "Max RSI", key: "maxRsi", placeholder: "e.g. 75" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-muted-foreground mb-1.5">{f.label}</label>
              <input
                type="number"
                value={filters[f.key as keyof ScreenerFilters] as string}
                onChange={(e) => upd(f.key as keyof ScreenerFilters, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/40 text-sm"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Sector</label>
            <select
              value={filters.sector}
              onChange={(e) => upd("sector", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/40 text-sm"
            >
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Verdict */}
        <div>
          <label className="block text-xs text-muted-foreground mb-2">Verdict</label>
          <div className="flex gap-2">
            {["BUY", "WATCH", "AVOID"].map((v) => (
              <button
                key={v}
                onClick={() => toggleVerdict(v)}
                className={`px-4 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                  filters.verdicts.includes(v)
                    ? VERDICT_COLORS[v]
                    : "text-muted-foreground border-border"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {!loading ? (
            <button
              onClick={runScreener}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all active:scale-95"
            >
              <Zap className="w-4 h-4" />
              Run Screener
            </button>
          ) : (
            <button
              onClick={stopScan}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-all"
            >
              <X className="w-4 h-4" />
              Stop Scan
            </button>
          )}
          {!useCustom && selectedTier && (
            <span className="text-xs text-muted-foreground">
              Will scan {selectedTier.count} stocks · {selectedTier.desc}
            </span>
          )}
        </div>

        {/* Progress */}
        {loading && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-mono">{currentTicker || "Starting..."}</span>
              <span>{scanned}/{totalCount} · {progress}% · {results.length} matched</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results table */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">
                {results.length} stock{results.length !== 1 ? "s" : ""} matched
                {loading && <span className="text-xs text-muted-foreground ml-2">(live results)</span>}
              </h2>
              <button
                onClick={() => setResults([])}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="text-left px-5 py-3">#</th>
                      <th className="text-left px-4 py-3">Stock</th>
                      <th className="text-right px-4 py-3">Score</th>
                      <th className="text-right px-4 py-3 hidden sm:table-cell">Verdict</th>
                      <th className="text-right px-4 py-3 hidden md:table-cell">ROE</th>
                      <th className="text-right px-4 py-3 hidden md:table-cell">D/E</th>
                      <th className="text-right px-4 py-3 hidden lg:table-cell">Rev Growth</th>
                      <th className="text-right px-4 py-3 hidden lg:table-cell">RSI</th>
                      <th className="text-right px-4 py-3">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((r, i) => (
                      <motion.tr
                        key={r.ticker}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => router.push(`/analyze/${r.ticker}`)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors group"
                      >
                        <td className="px-5 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-foreground group-hover:text-emerald-400 transition-colors text-sm">
                            {r.ticker}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {r.company_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold text-sm ${
                            r.score >= 7.5 ? "text-emerald-400" :
                            r.score >= 5 ? "text-amber-400" : "text-rose-400"
                          }`}>{r.score}/10</span>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${VERDICT_COLORS[r.verdict] || ""}`}>
                            {r.verdict}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">
                          {r.roe != null ? `${r.roe.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">
                          {r.debt_to_equity != null ? `${r.debt_to_equity.toFixed(2)}x` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs hidden lg:table-cell">
                          <span className={r.revenue_growth != null && r.revenue_growth > 0 ? "text-emerald-400" : "text-rose-400"}>
                            {r.revenue_growth != null ? `${r.revenue_growth > 0 ? "+" : ""}${r.revenue_growth.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
                          {r.rsi != null ? r.rsi.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                          {r.current_price != null ? `₹${r.current_price.toLocaleString("en-IN")}` : "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
