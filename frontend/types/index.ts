export type Verdict = "BUY" | "WATCH" | "AVOID";
export type RiskLevel = "Low" | "Medium" | "High";
export type DataQuality = "High" | "Medium" | "Low";

export interface StockMetrics {
  current_price?: number;
  prev_close?: number;
  price_change_pct?: number;
  market_cap?: number;
  market_cap_cr?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  sector_pe?: number;
  pe_vs_sector?: number;
  ev_ebitda?: number;
  dividend_yield?: number;
  roe?: number;
  roce?: number;
  debt_to_equity?: number;
  current_ratio?: number;
  promoter_holding?: number;
  revenue_growth?: number;
  profit_growth?: number;
  earnings_growth_5y?: number;
  rsi?: number;
  macd?: number;
  macd_signal?: number;
  macd_histogram?: number;
  dma_50?: number;
  dma_200?: number;
  volume?: number;
  avg_volume?: number;
  volume_ratio?: number;
  beta?: number;
  company_name?: string;
  sector?: string;
  industry?: string;
  exchange?: string;
  currency?: string;
}

export interface MetricResult {
  name: string;
  value?: number;
  threshold: string;
  passed: boolean;
  weight: number;
  score_contribution: number;
  display_value: string;
  unit: string;
}

export interface AIAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  valuation_analysis: string;
  momentum_analysis: string;
  risk_level: RiskLevel;
  risk_factors: string[];
  recommendation: string;
  time_horizon: string;
  target_price_range?: string;
}

export interface AnalysisResponse {
  ticker: string;
  company_name: string;
  score: number;
  verdict: Verdict;
  metrics: StockMetrics;
  metric_results: MetricResult[];
  ai_analysis: AIAnalysis;
  analyzed_at: string;
  data_quality: DataQuality;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  company_name?: string;
  added_at: string;
  last_score?: number;
  last_verdict?: string;
  last_analyzed?: string;
  notes?: string;
  alerts_enabled: boolean;
}
