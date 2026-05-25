import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppStore {
  // Recent searches
  recentTickers: string[];
  addRecentTicker: (ticker: string) => void;
  clearRecent: () => void;

  // Quick search open state
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  // Theme
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      recentTickers: [],
      addRecentTicker: (ticker) =>
        set((state) => ({
          recentTickers: [
            ticker,
            ...state.recentTickers.filter((t) => t !== ticker),
          ].slice(0, 8),
        })),
      clearRecent: () => set({ recentTickers: [] }),

      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),

      theme: "dark",
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
    }),
    {
      name: "stocksage-store",
      partialize: (state) => ({ recentTickers: state.recentTickers }),
    }
  )
);
