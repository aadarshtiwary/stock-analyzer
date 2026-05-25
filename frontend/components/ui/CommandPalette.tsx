"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app";
import { Search, Clock, X, Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const POPULAR = [
  "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS",
  "ICICIBANK.NS", "BEL.NS", "WIPRO.NS", "SUNPHARMA.NS",
];

export function CommandPalette() {
  const { searchOpen, setSearchOpen, recentTickers, addRecentTicker } = useAppStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Open with Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
    }
  }, [searchOpen]);

  const navigate = (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    addRecentTicker(t);
    setSearchOpen(false);
    router.push(`/analyze/${t}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(query);
  };

  const suggestions = query
    ? POPULAR.filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    : [];

  const showRecent = !query && recentTickers.length > 0;

  return (
    <>
      {/* Trigger button in nav */}
      <button
        onClick={() => setSearchOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-emerald-500/30 transition-all text-sm"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search ticker...</span>
        <div className="flex items-center gap-0.5 ml-2 opacity-60">
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-xs">⌘</kbd>
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-xs">K</kbd>
        </div>
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4"
            >
              <div className="glass-card overflow-hidden shadow-2xl">
                <form onSubmit={handleSubmit}>
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                    <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search ticker... (e.g. INFY.NS)"
                      className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-mono text-sm uppercase"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>

                <div className="p-3 max-h-72 overflow-y-auto">
                  {/* Recent */}
                  {showRecent && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Recent
                      </div>
                      {recentTickers.slice(0, 5).map((t) => (
                        <button
                          key={t}
                          onClick={() => navigate(t)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 text-left transition-colors"
                        >
                          <span className="font-mono text-sm text-foreground">{t}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div>
                      {suggestions.map((t) => (
                        <button
                          key={t}
                          onClick={() => navigate(t)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 text-left transition-colors"
                        >
                          <span className="font-mono text-sm text-foreground">{t}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Popular */}
                  {!query && !showRecent && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5">Popular</div>
                      <div className="flex flex-wrap gap-2 px-2">
                        {POPULAR.map((t) => (
                          <button
                            key={t}
                            onClick={() => navigate(t)}
                            className="px-3 py-1.5 rounded-lg border border-border bg-muted/50 hover:border-emerald-500/40 hover:text-emerald-400 text-muted-foreground text-xs font-mono transition-all"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enter to search any ticker */}
                  {query && suggestions.length === 0 && (
                    <button
                      onClick={() => navigate(query)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 text-left transition-colors"
                    >
                      <Search className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-foreground">
                        Analyze <span className="font-mono text-emerald-400">{query.toUpperCase()}</span>
                      </span>
                    </button>
                  )}
                </div>

                <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted border border-border">↵</kbd> Analyze
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted border border-border">Esc</kbd> Close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
