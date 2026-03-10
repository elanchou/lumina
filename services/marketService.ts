
import { MarketTicker } from '../types';

const DEFAULT_STOCK_TICKERS: MarketTicker[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 0, change: 0, changePercent: 0, type: 'US', dataPoints: [], volume: '0', high24h: 0, low24h: 0, marketCap: '0' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 0, change: 0, changePercent: 0, type: 'US', dataPoints: [], volume: '0', high24h: 0, low24h: 0, marketCap: '0' },
  { symbol: 'MSFT', name: 'Microsoft', price: 0, change: 0, changePercent: 0, type: 'US', dataPoints: [], volume: '0', high24h: 0, low24h: 0, marketCap: '0' },
  { symbol: 'BTC-USD', name: 'Bitcoin', price: 0, change: 0, changePercent: 0, type: 'CRYPTO', dataPoints: [], volume: '0', high24h: 0, low24h: 0, marketCap: '0' },
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
  private stockInterval: number | null = null;
  private tickers: MarketTicker[] = [];
  private subscribers: TickerUpdateCallback[] = [];
  public availableCoins: CoinData[] = [];

  constructor() {
    const savedTickers = localStorage.getItem('nexus_tickers');
    if (savedTickers) {
      try {
        const parsed = JSON.parse(savedTickers);
        if (Array.isArray(parsed) && parsed.length > 0) {
           this.tickers = parsed;
        } else {
           this.tickers = [...DEFAULT_STOCK_TICKERS];
        }
      } catch (e) {
        this.tickers = [...DEFAULT_STOCK_TICKERS];
      }
    } else {
      this.tickers = [...DEFAULT_STOCK_TICKERS];
    }
    this.initStocks();
    this.fetchHistoricalData();
    this.fetchTopCrypto();
  }

  private saveTickers() {
      localStorage.setItem('nexus_tickers', JSON.stringify(this.tickers));
  }

  private formatNumber(num: number): string {
      if (!num) return '---';
      if (num >= 1.0e+12) return (num / 1.0e+12).toFixed(2) + "T";
      if (num >= 1.0e+9) return (num / 1.0e+9).toFixed(2) + "B";
      if (num >= 1.0e+6) return (num / 1.0e+6).toFixed(2) + "M";
      if (num >= 1.0e+3) return (num / 1.0e+3).toFixed(2) + "K";
      return num.toString();
  }

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
        }
      } catch (error) {
          console.warn("Failed to fetch CoinGecko data", error);
      }
  }

  private async fetchHistoricalData() {
      for (const ticker of this.tickers) {
          try {
              const res = await fetch(`/api/history?symbol=${ticker.symbol}`);
              if (res.ok) {
                  const data = await res.json();
                  if (Array.isArray(data) && data.length > 0) {
                      const dataPoints = data.map((d: any) => ({
                          time: new Date(d.date).toISOString(),
                          value: d.close
                      }));
                      const index = this.tickers.findIndex(t => t.symbol === ticker.symbol);
                      if (index !== -1) {
                          this.tickers[index].dataPoints = dataPoints;
                          this.saveTickers();
                          this.notifySubscribers();
                      }
                  }
              }
          } catch (e) {
              console.error(`Failed to fetch history for ${ticker.symbol}`, e);
          }
      }
  }

  private async fetchRealStockPrices() {
      if (this.tickers.length === 0) return;

      const symbols = this.tickers.map(t => t.symbol).join(',');
      try {
          const res = await fetch(`/api/quote?symbol=${symbols}`);
          if (res.ok) {
              const data = await res.json();
              const quotes = Array.isArray(data) ? data : [data];
              
              quotes.forEach(quote => {
                  if (quote && quote.regularMarketPrice) {
                      this.updateTickerWithRealData(quote.symbol, quote);
                  }
              });
          }
      } catch (e) {
          console.error(`Failed to fetch quotes`, e);
      }
  }

  private updateTickerWithRealData(symbol: string, data: any) {
    const index = this.tickers.findIndex(t => t.symbol === symbol);
    if (index !== -1) {
      const t = this.tickers[index];
      
      const newPrice = data.regularMarketPrice;
      const timestamp = new Date().toISOString();
      const newDataPoints = [...(t.dataPoints || [])];
      
      if (newDataPoints.length > 0) {
          const lastPoint = newDataPoints[newDataPoints.length - 1];
          if (new Date(timestamp).getTime() - new Date(lastPoint.time).getTime() > 60000) {
              newDataPoints.push({ time: timestamp, value: newPrice });
          } else {
              newDataPoints[newDataPoints.length - 1].value = newPrice;
          }
      } else {
          newDataPoints.push({ time: timestamp, value: newPrice });
      }
      
      if (newDataPoints.length > 100) newDataPoints.shift();

      this.tickers[index] = {
          ...t,
          name: data.shortName || data.longName || t.name,
          price: newPrice,
          openPrice: data.regularMarketPreviousClose || t.openPrice,
          change: data.regularMarketChange || (newPrice - (data.regularMarketPreviousClose || t.openPrice)),
          changePercent: data.regularMarketChangePercent || (((newPrice - (data.regularMarketPreviousClose || t.openPrice)) / (data.regularMarketPreviousClose || t.openPrice)) * 100),
          dataPoints: newDataPoints,
          high24h: data.regularMarketDayHigh || t.high24h,
          low24h: data.regularMarketDayLow || t.low24h,
          volume: data.regularMarketVolume ? this.formatNumber(data.regularMarketVolume) : t.volume,
          marketCap: data.marketCap ? this.formatNumber(data.marketCap) : t.marketCap
      };
      this.saveTickers();
      this.notifySubscribers();
    }
  }

  private initStocks() {
    if (this.stockInterval) clearInterval(this.stockInterval);
    
    this.fetchRealStockPrices();
    this.stockInterval = window.setInterval(() => {
      this.fetchRealStockPrices();
    }, 10000); 
  }

  public async addTicker(symbol: string, type: 'US' | 'CRYPTO') {
    const normalizedSymbol = symbol.toUpperCase();
    if (this.tickers.find(t => t.symbol === normalizedSymbol)) return;

    const newTicker: MarketTicker = {
        symbol: normalizedSymbol,
        name: normalizedSymbol,
        price: 0,
        change: 0,
        changePercent: 0,
        type: type,
        dataPoints: [],
        volume: '---',
        high24h: 0,
        low24h: 0,
        marketCap: '---'
    };

    this.tickers.push(newTicker);
    this.saveTickers();
    this.notifySubscribers();
    
    try {
        const res = await fetch(`/api/quote?symbol=${normalizedSymbol}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.regularMarketPrice) {
                this.updateTickerWithRealData(normalizedSymbol, data);
            }
        }
        
        const histRes = await fetch(`/api/history?symbol=${normalizedSymbol}`);
        if (histRes.ok) {
            const histData = await histRes.json();
            if (Array.isArray(histData) && histData.length > 0) {
                const dataPoints = histData.map((d: any) => ({
                    time: new Date(d.date).toISOString(),
                    value: d.close
                }));
                const index = this.tickers.findIndex(t => t.symbol === normalizedSymbol);
                if (index !== -1) {
                    this.tickers[index].dataPoints = dataPoints;
                    this.saveTickers();
                    this.notifySubscribers();
                }
            }
        }
    } catch (e) {
        console.error(`Failed to fetch data for new ticker ${normalizedSymbol}`, e);
    }
  }

  public removeTicker(symbol: string) {
    this.tickers = this.tickers.filter(t => t.symbol !== symbol);
    this.saveTickers();
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
