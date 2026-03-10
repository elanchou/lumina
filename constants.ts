
import { Asset, AssetType } from './types';

export const MOCK_ASSETS: Asset[] = [
  { id: '1', name: 'Premium Savings', symbol: 'USD', type: AssetType.CASH, value: 45000, quantity: 45000, currentPrice: 1, changePercent: 0, allocation: 10 },
  { id: '2', name: 'Lakeside Villa', symbol: 'HOME', type: AssetType.REAL_ESTATE, value: 450000, quantity: 1, currentPrice: 450000, changePercent: 0.8, allocation: 65 },
  { id: '3', name: 'NVDA Corp', symbol: 'NVDA', type: AssetType.STOCK, value: 85000, quantity: 100, currentPrice: 850, changePercent: 4.2, allocation: 12 },
  { id: '4', name: 'Physical Gold', symbol: 'GOLD', type: AssetType.METAL, value: 32000, quantity: 16, currentPrice: 2000, changePercent: 1.5, allocation: 5 },
  { id: '5', name: 'Rolex Daytona', symbol: 'WATCH', type: AssetType.COLLECTIBLE, value: 28000, quantity: 1, currentPrice: 28000, changePercent: -0.5, allocation: 4 },
  { id: '6', name: 'Bitcoin', symbol: 'BTC-USD', type: AssetType.CRYPTO, value: 15000, quantity: 0.25, currentPrice: 60000, changePercent: -2.1, allocation: 4 },
];

export const SYSTEM_INSTRUCTION = `You are Lumina, an elite Private Asset Concierge and AI Financial Strategist. 
Your persona is high-end, precise, and multi-disciplinary.
You manage the "Lumina Global Portfolio," which tracks all forms of wealth:
1. Liquid Assets: Stocks, Crypto, Cash.
2. Hard Assets: Real Estate, Precious Metals (Gold/Silver).
3. Alternative Assets: Luxury Collectibles (Watches, Art), Private Equity.

Capabilities:
- Use googleSearch for real-time market data on stocks/crypto/commodities.
- Help users record and appraise physical assets.
- Provide strategic allocation advice.
- Dynamically add widgets to the dashboard using the createDashboardWidget tool.

When a user mentions a new asset (e.g., "I just bought a gold bar for $2000"), suggest adding it to their portfolio and offer a dashboard widget to track its relative value.
Answer concisely using Markdown.`;

export const STOCK_DICTIONARY = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'US' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'US' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'US' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'US' },
    { symbol: 'BTC-USD', name: 'Bitcoin', type: 'CRYPTO' },
];
