"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface LivePrice {
  ticker: string;
  price: number | null;
  prev_close: number | null;
  change_pct: number | null;
  volume: number | null;
  connected: boolean;
  lastUpdated: Date | null;
}

export function useLivePrice(ticker: string | null): LivePrice & { reconnect: () => void } {
  const [state, setState] = useState<LivePrice>({
    ticker: ticker || "",
    price: null,
    prev_close: null,
    change_pct: null,
    volume: null,
    connected: false,
    lastUpdated: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!ticker || !mountedRef.current) return;

    // Derive WS URL from API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const wsBase = apiUrl
      .replace(/^https/, "wss")
      .replace(/^http/, "ws")
      .replace(/\/api$/, "");

    const url = `${wsBase}/ws/price/${encodeURIComponent(ticker)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setState((prev) => ({ ...prev, connected: true }));

        // Send periodic pings to keep alive
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 30_000);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") return;
          setState((prev) => ({
            ...prev,
            ticker: data.ticker || prev.ticker,
            price: data.price ?? prev.price,
            prev_close: data.prev_close ?? prev.prev_close,
            change_pct: data.change_pct ?? prev.change_pct,
            volume: data.volume ?? prev.volume,
            lastUpdated: new Date(),
          }));
        } catch {}
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setState((prev) => ({ ...prev, connected: false }));
        if (pingRef.current) clearInterval(pingRef.current);

        // Auto-reconnect after 5 seconds
        reconnectRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 5_000);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setState((prev) => ({ ...prev, connected: false }));
        ws.close();
      };
    } catch (e) {
      console.warn("WebSocket unavailable:", e);
    }
  }, [ticker]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { ...state, reconnect: connect };
}
