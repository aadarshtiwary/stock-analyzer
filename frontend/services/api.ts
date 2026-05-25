import axios from "axios";
import { AnalysisResponse, WatchlistItem } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

export const analyzeStock = async (ticker: string): Promise<AnalysisResponse> => {
  const res = await api.get<AnalysisResponse>(`/analyze/${encodeURIComponent(ticker)}`);
  return res.data;
};

export const getWatchlist = async (): Promise<WatchlistItem[]> => {
  const res = await api.get<WatchlistItem[]>("/watchlist");
  return res.data;
};

export const addToWatchlist = async (ticker: string, notes?: string): Promise<WatchlistItem> => {
  const res = await api.post<WatchlistItem>("/watchlist/add", { ticker, notes });
  return res.data;
};

export const removeFromWatchlist = async (ticker: string): Promise<void> => {
  await api.delete(`/watchlist/${ticker}`);
};

export const getTopStocks = async () => {
  const res = await api.get("/top-stocks");
  return res.data;
};

export const getAlerts = async (ticker?: string) => {
  const params = ticker ? `?ticker=${ticker}` : "";
  const res = await api.get(`/alerts${params}`);
  return res.data;
};

export const triggerScan = async () => {
  const res = await api.post("/scan/trigger");
  return res.data;
};

// Portfolio
export const analyzePortfolioDirect = async (data: {
  name: string;
  holdings: { ticker: string; quantity: number; avg_buy_price: number }[];
}) => {
  const res = await api.post("/portfolio/analyze", data);
  return res.data;
};

export const createPortfolio = async (data: {
  name: string;
  holdings: { ticker: string; quantity: number; avg_buy_price: number }[];
}) => {
  const res = await api.post("/portfolio", data);
  return res.data;
};

export const getPortfolioAnalysis = async (id: string) => {
  const res = await api.get(`/portfolio/${id}`);
  return res.data;
};

export const listPortfolios = async () => {
  const res = await api.get("/portfolios");
  return res.data;
};

// News & sentiment
export const getNewsSentiment = async (ticker: string) => {
  const res = await api.get(`/news/${ticker}`);
  return res.data;
};

// Sector heatmap
export const getSectorHeatmap = async () => {
  const res = await api.get("/heatmap/sectors");
  return res.data;
};
