"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Bookmark, Star, Bell, BarChart3, Layers, ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { clsx } from "clsx";
import { CommandPalette } from "./CommandPalette";

const NAV_ITEMS = [
  { href: "/", label: "Analyze", icon: TrendingUp },
  { href: "/compare", label: "Compare", icon: ArrowLeftRight },
  { href: "/screener", label: "Screener", icon: SlidersHorizontal },
  { href: "/portfolio", label: "Portfolio", icon: BarChart3 },
  { href: "/heatmap", label: "Heatmap", icon: Layers },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/top-stocks", label: "Top Picks", icon: Star },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export function Navigation() {
  const pathname = usePathname();

  const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5); // Show top 5 on mobile

  return (
    <>
      {/* Desktop top nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">
              Stock<span className="text-emerald-400">Sage</span>
            </span>
          </Link>

          <CommandPalette />

          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap",
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          {MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all",
                  active ? "text-emerald-400" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom padding on mobile so content isn't hidden behind nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
