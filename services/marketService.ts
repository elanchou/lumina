
import { MarketTicker } from '../types';

// Binance WebSocket URL
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const INITIAL_STREAMS = ['btcusdt@trade', 'ethusdt@trade', 'solusdt@trade', 'bnbusdt@trade'];

// Initial Stocks (Fallback/Hybrid)
const DEFAULT_STOCK_TICKERS: MarketTicker[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 189.45, change: 1.25, changePercent: 0.66, type: 'US', dataPoints: [], volume: '45.2M', high24h: 191.2, low24h: 188.0, marketCap: '2.9T' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 875.30, change: 15.40, changePercent: 1.79, type: 'US', dataPoints: [], volume: '32.1M', high24h: 880.1, low24h: 860.5, marketCap: '2.2T' },
  { symbol: 'MSFT', name: 'Microsoft', price: 420.10, change: -2.10, changePercent: -0.50, type: 'US', dataPoints: [], volume: '18.5M', high24h: 425.0, low24h: 418.2, marketCap: '3.1T' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 175.20, change: -3.40, changePercent: -1.90, type: 'US', dataPoints: [], volume: '98.5M', high24h: 180.0, low24h: 172.5, marketCap: '550B' },
];

type TickerUpdateCallback = (tickers: MarketTicker[]) => void;

interface CoinData {
    symbol: string;
    name: string;
    type: string;
    current_price: number;
    total_volume: number;
    high_24h: number;
    low_24h: number;
    market_cap: number;
}

class MarketService {
  private ws: WebSocket | null = null;
  private stockInterval: number | null = null;
  private tickers: MarketTicker[] = [];
  private subscribers: TickerUpdateCallback[] = [];
  private activeStreams: Set<string> = new Set(INITIAL_STREAMS);
  public availableCoins: CoinData[] = [];

  constructor() {
    // Initialize empty, will be populated by fetch or defaults
    this.tickers = [...DEFAULT_STOCK_TICKERS.map(t => this.initTickerHistory(t))];
    this.initStocks();
    this.initBinance();
    this.fetchTopCrypto();
  }

  private formatNumber(num: number): string {
      if (num >= 1.0e+12) return (num / 1.0e+12).toFixed(2) + "T";
      if (num >= 1.0e+9) return (num / 1.0e+9).toFixed(2) + "B";
      if (num >= 1.0e+6) return (num / 1.0e+6).toFixed(2) + "M";
      if (num >= 1.0e+3) return (num / 1.0e+3).toFixed(2) + "K";
      return num.toString();
  }

  // Connect to CoinGecko to get top 50 coins for the search bar AND real initial prices
  private async fetchTopCrypto() {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false');
        if (response.ok) {
            const data = await response.json();
            this.availableCoins = data.map((coin: any) => ({
                symbol: coin.symbol.toUpperCase() + '-USD',
                name: coin.name,
                type: 'CRYPTO',
                current_price: coin.current_price,
                total_volume: coin.total_volume,
                high_24h: coin.high_24h,
                low_24h: coin.low_24h,
                market_cap: coin.market_cap
            }));

            // Update existing crypto tickers with real data
            this.tickers = this.tickers.map(t => {
                if (t.type === 'CRYPTO') {
                    const coinData = this.availableCoins.find(c => c.symbol === t.symbol);
                    if (coinData) {
                        // If massive discrepancy, reset history
                        if (Math.abs(t.price - coinData.current_price) / coinData.current_price > 0.1) {
                             return this.initTickerHistory({
                                ...t,
                                price: coinData.current_price,
                                volume: this.formatNumber(coinData.total_volume),
                                high24h: coinData.high_24h,
                                low24h: coinData.low_24h,
                                marketCap: this.formatNumber(coinData.market_cap)
                            });
                        }
                        // Just update stats otherwise
                        return {
                            ...t,
                            volume: this.formatNumber(coinData.total_volume),
                            high24h: coinData.high_24h,
                            low24h: coinData.low_24h,
                            marketCap: this.formatNumber(coinData.market_cap)
                        };
                    }
                }
                return t;
            });
            this.notifySubscribers();

            // If empty, add defaults
            const cryptoTickers = this.tickers.filter(t => t.type === 'CRYPTO');
            if (cryptoTickers.length === 0) {
                 const top3 = this.availableCoins.slice(0, 3);
                 top3.forEach(c => this.addTicker(c.symbol, 'CRYPTO'));
            }

        }
      } catch (error) {
          console.warn("Failed to fetch CoinGecko data, using defaults", error);
          // Fallback logic remains similar...
      }
  }

  // Generate realistic history so charts aren't empty on load
  private initTickerHistory(ticker: MarketTicker): MarketTicker {
    const dataPoints = [];
    let currentPrice = ticker.price;
    const now = Date.now();
    
    // Generate 50 minutes of history
    for (let i = 50; i >= 0; i--) {
        const volatility = currentPrice * 0.001; 
        const change = (Math.random() - 0.5) * volatility;
        dataPoints.unshift({
            time: new Date(now - i * 60000).toISOString(), 
            value: currentPrice
        });
        currentPrice -= change; 
    }
    
    const openPrice = dataPoints[0].value;

    return {
        ...ticker,
        openPrice: openPrice, 
        dataPoints: dataPoints,
        change: ticker.price - openPrice,
        changePercent: ((ticker.price - openPrice) / openPrice) * 100,
        high24h: ticker.high24h || (ticker.price * 1.02),
        low24h: ticker.low24h || (ticker.price * 0.98)
    };
  }

  private initBinance() {
    if (this.ws) {
        this.ws.close();
    }

    try {
        const streamString = Array.from(this.activeStreams).join('/');
        this.ws = new WebSocket(`${BINANCE_WS_URL}/${streamString}`);

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            let tickerSymbol = '';
            const s = data.s.toLowerCase();
            
            if (s.endsWith('usdt')) {
                const base = s.replace('usdt', '').toUpperCase();
                tickerSymbol = `${base}-USD`;
            }

            if (tickerSymbol) {
                const price = parseFloat(data.p);
                this.updateTicker(tickerSymbol, price);
            }
        };
    } catch (e) {
        console.error("Failed to connect to Binance stream", e);
    }
  }

  private initStocks() {
    if (this.stockInterval) clearInterval(this.stockInterval);
    
    this.stockInterval = window.setInterval(() => {
      this.tickers = this.tickers.map(t => {
        if (t.type !== 'CRYPTO') {
            const volatility = t.price * 0.0005; 
            const randomMove = (Math.random() - 0.5) * volatility;
            const newPrice = Math.max(0.01, t.price + randomMove);
            return this.processUpdate(t, newPrice);
        }
        return t;
      });
      this.notifySubscribers();
    }, 2000); 
  }

  private updateTicker(symbol: string, newPrice: number) {
    const index = this.tickers.findIndex(t => t.symbol === symbol);
    if (index !== -1) {
      const t = this.tickers[index];
      this.tickers[index] = this.processUpdate(t, newPrice);
      this.notifySubscribers();
    }
  }

  private processUpdate(ticker: MarketTicker, newPrice: number): MarketTicker {
    if (ticker.price > 0 && Math.abs((newPrice - ticker.price) / ticker.price) > 0.2) {
        return this.initTickerHistory({
            ...ticker,
            price: newPrice
        });
    }

    const timestamp = new Date().toISOString();
    const newDataPoints = [...(ticker.dataPoints || []), { time: timestamp, value: newPrice }];
    if (newDataPoints.length > 50) newDataPoints.shift();
    
    const basePrice = ticker.openPrice || newDataPoints[0].value;
    const dailyChange = newPrice - basePrice;
    const dailyChangePercent = (dailyChange / basePrice) * 100;

    // Update High/Low
    const currentHigh = ticker.high24h || newPrice;
    const currentLow = ticker.low24h || newPrice;

    return {
        ...ticker,
        price: newPrice,
        openPrice: basePrice,
        change: dailyChange,
        changePercent: dailyChangePercent,
        dataPoints: newDataPoints,
        high24h: Math.max(currentHigh, newPrice),
        low24h: Math.min(currentLow, newPrice)
    };
  }

  public addTicker(symbol: string, type: 'US' | 'CRYPTO') {
    const normalizedSymbol = symbol.toUpperCase();
    if (this.tickers.find(t => t.symbol === normalizedSymbol)) return;

    const coinData = this.availableCoins.find(c => c.symbol === normalizedSymbol);
    
    const startPrice = coinData ? coinData.current_price : (type === 'CRYPTO' ? 100 : 150);
    const startVolume = coinData ? this.formatNumber(coinData.total_volume) : '---';
    const startCap = coinData ? this.formatNumber(coinData.market_cap) : '---';

    const newTicker: MarketTicker = this.initTickerHistory({
        symbol: normalizedSymbol,
        name: coinData ? coinData.name : normalizedSymbol,
        price: startPrice,
        change: 0,
        changePercent: 0,
        type: type,
        dataPoints: [],
        volume: startVolume,
        high24h: coinData ? coinData.high_24h : startPrice * 1.05,
        low24h: coinData ? coinData.low_24h : startPrice * 0.95,
        marketCap: startCap
    });

    this.tickers.push(newTicker);

    if (type === 'CRYPTO') {
        const base = normalizedSymbol.replace('-USD', '').toLowerCase();
        const streamName = `${base}usdt@trade`;
        
        if (!this.activeStreams.has(streamName)) {
             this.activeStreams.add(streamName);
             this.initBinance(); 
        }
    }
    
    this.notifySubscribers();
  }

  public removeTicker(symbol: string) {
    this.tickers = this.tickers.filter(t => t.symbol !== symbol);
    this.notifySubscribers();
  }

  public subscribe(callback: TickerUpdateCallback) {
    this.subscribers.push(callback);
    callback(this.tickers); 
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => cb([...this.tickers]));
  }
}

export const marketService = new MarketService();
