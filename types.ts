
export enum AssetType {
  CASH = 'Cash',
  STOCK = 'Stock',
  CRYPTO = 'Crypto',
  FUND = 'Fund'
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  value: number;
  changePercent: number;
  allocation: number;
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
  high24h?: number; // New
  low24h?: number;  // New
  marketCap?: string; // New
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

// --- New Types for Dynamic Dashboard ---

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
