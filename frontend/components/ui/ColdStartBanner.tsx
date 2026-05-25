"use client";

import { useState, useEffect, useRef } from "react";

interface ColdStartBannerProps {
  isLoading: boolean;
}

/**
 * Shows a friendly message when the Render free-tier backend
 * is cold-starting (first request after inactivity).
 * Only appears after 5 seconds of loading — so fast responses
 * never show this at all.
 */
export function ColdStartBanner({ isLoading }: ColdStartBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      timerRef.current = setTimeout(() => setShowBanner(true), 5000);
    } else {
      setShowBanner(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading]);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="text-amber-400 text-lg flex-shrink-0 animate-pulse">⏳</div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              Waking up the server...
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              The free server sleeps after inactivity. First request takes ~30 seconds. Hang tight!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
