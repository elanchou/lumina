
export enum AssetType {
  CASH = 'Cash',
  STOCK = 'Stock',
  CRYPTO = 'Crypto',
  FUND = 'Fund',
  REAL_ESTATE = 'Real Estate',
  METAL = 'Precious Metals',
  COLLECTIBLE = 'Collectible',
  OTHER = 'Other'
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  value: number; // Total value in USD
  quantity?: number; // Number of shares/coins
  currentPrice?: number; // Current price per unit
  changePercent: number;
  allocation: number;
  acquisitionDate?: string;
  location?: string; // For Real Estate
}

export interface MarketTicker {
  symbol: string;
  name: string;
  price: number;
  openPrice?: number;
  change: number;
  changePercent: number;
  type: 'US' | 'HK' | 'CN' | 'CRYPTO';
  volume?: string;
  high24h?: number;
  low24h?: number;
  marketCap?: string;
  dataPoints: { time: string; value: number }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
}

export type ViewState = 'dashboard' | 'market' | 'analysis';

export interface AnalysisReport {
  riskScore: number;
  volatility: string;
  maxDrawdown: string;
  summary: string;
  recommendations: string[];
}

export type WidgetType = 'metric' | 'chart' | 'insight';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  subTitle?: string;
  data: any; 
  size: 'small' | 'medium' | 'large';
  visualStyle?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
}
