
import { Asset, AssetType, MarketTicker } from './types';

export const MOCK_ASSETS: Asset[] = [
  { id: '1', name: 'USD Savings', symbol: 'USD', type: AssetType.CASH, value: 25000, changePercent: 0, allocation: 15 },
  { id: '2', name: 'AAPL', symbol: 'AAPL', type: AssetType.STOCK, value: 45000, changePercent: 1.2, allocation: 28 },
  { id: '3', name: 'NVDA', symbol: 'NVDA', type: AssetType.STOCK, value: 35000, changePercent: 2.5, allocation: 22 },
  { id: '4', name: 'Bitcoin', symbol: 'BTC', type: AssetType.CRYPTO, value: 30000, changePercent: -1.5, allocation: 18 },
  { id: '5', name: 'S&P 500 ETF', symbol: 'SPY', type: AssetType.FUND, value: 25000, changePercent: 0.5, allocation: 15 },
];

export const SYSTEM_INSTRUCTION = `You are Lumina, an advanced personal finance AI assistant. 
Your persona is professional, analytical, yet accessible.
You have access to real-time market data capabilities via Google Search grounding.
When asked about current stock prices, always use the googleSearch tool to verify.
You specialize in:
1. Asset Management: Helping users organize portfolios.
2. Market Insights: Explaining trends in simple terms.
3. Financial Analysis: Assessing risk (volatility, drawdown).
Answer concisely. Use Markdown for formatting.`;

// US Stocks Dictionary (Static fallbacks for US Market)
export const STOCK_DICTIONARY = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'US' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'US' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'US' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'US' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'US' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'US' },
    { symbol: 'META', name: 'Meta Platforms', type: 'US' },
    { symbol: 'NFLX', name: 'Netflix Inc.', type: 'US' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'US' },
];
