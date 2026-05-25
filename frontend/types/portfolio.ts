// Portfolio types
export interface HoldingInput {
  ticker: string;
  quantity: number;
  avg_buy_price: number;
  company_name?: string;
}

export interface HoldingAnalysis {
  ticker: string;
  company_name?: string;
  quantity: number;
  avg_buy_price: number;
  current_price?: number;
  current_value?: number;
  invested_value: number;
  pnl?: number;
  pnl_pct?: number;
  sector?: string;
  score?: number;
  verdict?: string;
  weight_pct?: number;
}

export interface SectorAllocation {
  sector: string;
  weight_pct: number;
  total_value: number;
  holding_count: number;
}

export interface PortfolioAnalysis {
  portfolio_id: string;
  portfolio_name: string;
  total_invested: number;
  total_current_value: number;
  total_pnl: number;
  total_pnl_pct: number;
  diversification_score: number;
  avg_stock_score: number;
  holdings: HoldingAnalysis[];
  sector_allocation: SectorAllocation[];
  top_performers: string[];
  underperformers: string[];
  ai_suggestions: string[];
  concentration_risk: string;
  analyzed_at: string;
}

// News sentiment types
export interface NewsHeadline {
  headline: string;
  source: string;
  published_at: number;
  url?: string;
  summary?: string;
}

export interface NewsSentiment {
  sentiment: "Bullish" | "Bearish" | "Neutral";
  score: number;
  key_themes: string[];
  summary: string;
  notable_events: string[];
  headline_count: number;
  headlines: NewsHeadline[];
}

// Sector heatmap types
export interface SectorHeatmapItem {
  sector: string;
  avg_score: number;
  avg_change_pct: number;
  avg_pe?: number;
  stocks_analyzed: number;
  top_stock?: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
}
