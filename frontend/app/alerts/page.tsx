"use client";

import { useEffect, useState } from "react";
import { getAlerts } from "@/services/api";
import toast from "react-hot-toast";
import { Bell, AlertTriangle, TrendingDown, Activity } from "lucide-react";
import { motion } from "framer-motion";

const ALERT_ICONS: Record<string, any> = {
  rsi_overbought: Activity,
  rsi_oversold: Activity,
  price_below_200dma: TrendingDown,
  pe_expansion: AlertTriangle,
};

const ALERT_COLORS: Record<string, string> = {
  rsi_overbought: "text-amber-400",
  rsi_oversold: "text-cyan-400",
  price_below_200dma: "text-rose-400",
  pe_expansion: "text-amber-400",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlerts()
      .then(setAlerts)
      .catch(() => toast.error("Failed to load alerts"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Alerts</h1>
        <p className="text-muted-foreground mt-1">Threshold breach notifications</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl shimmer" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-24">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">No alerts yet</h2>
          <p className="text-muted-foreground">Alerts are generated automatically when thresholds are breached during analysis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a, i) => {
            const Icon = ALERT_ICONS[a.alert_type] || Bell;
            const color = ALERT_COLORS[a.alert_type] || "text-muted-foreground";
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center gap-4"
              >
                <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-foreground text-sm">{a.ticker}</span>
                    <span className="text-xs text-muted-foreground">{a.alert_type.replace(/_/g, " ").toUpperCase()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.condition}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-mono text-sm font-medium ${color}`}>{a.current_value?.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(a.triggered_at).toLocaleDateString("en-IN")}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
