"use client";

import { useEffect, useRef } from "react";

interface Props {
  ticker: string;
}

// Map .NS and .BO suffixes to TradingView exchange prefixes
function toTradingViewSymbol(ticker: string): string {
  if (ticker.endsWith(".NS")) return `NSE:${ticker.replace(".NS", "")}`;
  if (ticker.endsWith(".BO")) return `BSE:${ticker.replace(".BO", "")}`;
  return ticker;
}

export function TradingViewChart({ ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const symbol = toTradingViewSymbol(ticker);
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView === "undefined") return;
      widgetRef.current = new (window as any).TradingView.widget({
        autosize: true,
        symbol,
        interval: "D",
        timezone: "Asia/Kolkata",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "hsl(220 18% 10%)",
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies", "MASimple@tv-basicstudies"],
        container_id: "tradingview_chart",
        overrides: {
          "mainSeriesProperties.candleStyle.upColor": "#10b981",
          "mainSeriesProperties.candleStyle.downColor": "#f43f5e",
          "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.borderDownColor": "#f43f5e",
          "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.wickDownColor": "#f43f5e",
          "paneProperties.background": "hsl(220, 18%, 10%)",
          "paneProperties.backgroundType": "solid",
        },
      });
    };

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [ticker]);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Interactive Chart</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Powered by TradingView</p>
        </div>
        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
          {toTradingViewSymbol(ticker)}
        </span>
      </div>
      <div
        id="tradingview_chart"
        ref={containerRef}
        style={{ height: 480 }}
      />
    </div>
  );
}
