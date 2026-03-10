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

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

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
      } catch (_error) {
        this.tickers = [...DEFAULT_STOCK_TICKERS];
      }
    } else {
      this.tickers = [...DEFAULT_STOCK_TICKERS];
    }

    this.initStocks();
    void this.fetchHistoricalData();
    void this.fetchTopCrypto();
  }

  private saveTickers() {
    localStorage.setItem('nexus_tickers', JSON.stringify(this.tickers));
  }

  private formatNumber(num: number): string {
    if (!num) return '---';
    if (num >= 1.0e12) return `${(num / 1.0e12).toFixed(2)}T`;
    if (num >= 1.0e9) return `${(num / 1.0e9).toFixed(2)}B`;
    if (num >= 1.0e6) return `${(num / 1.0e6).toFixed(2)}M`;
    if (num >= 1.0e3) return `${(num / 1.0e3).toFixed(2)}K`;
    return num.toString();
  }

  private parseHistoryRows(rows: unknown) {
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row: any) => {
        if (!row?.date || !isFiniteNumber(row.close)) return null;
        const time = new Date(row.date).toISOString();
        return { time, value: row.close };
      })
      .filter((row): row is { time: string; value: number } => row !== null);
  }

  private async fetchTopCrypto() {
    try {
      const response = await fetch('/api/crypto-list');
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];

      this.availableCoins = items
        .map((coin: any) => {
          if (!coin?.symbol || !coin?.name || !isFiniteNumber(coin.current_price)) {
            return null;
          }

          return {
            symbol: String(coin.symbol).toUpperCase(),
            name: String(coin.name),
            type: 'CRYPTO',
            current_price: coin.current_price,
            total_volume: isFiniteNumber(coin.total_volume) ? coin.total_volume : 0,
            high_24h: isFiniteNumber(coin.high_24h) ? coin.high_24h : 0,
            low_24h: isFiniteNumber(coin.low_24h) ? coin.low_24h : 0,
            market_cap: isFiniteNumber(coin.market_cap) ? coin.market_cap : 0,
          } satisfies CoinData;
        })
        .filter((coin): coin is CoinData => coin !== null);
    } catch (error) {
      console.warn('Failed to fetch crypto list', error);
    }
  }

  private async fetchHistoricalData(symbols?: string[]) {
    const targetTickers = symbols?.length
      ? this.tickers.filter(ticker => symbols.includes(ticker.symbol))
      : this.tickers;

    await Promise.all(
      targetTickers.map(async ticker => {
        try {
          const res = await fetch(`/api/history?symbol=${encodeURIComponent(ticker.symbol)}`);
          if (!res.ok) {
            return;
          }

          const data = await res.json();
          const dataPoints = this.parseHistoryRows(data);

          if (dataPoints.length === 0) {
            return;
          }

          const index = this.tickers.findIndex(item => item.symbol === ticker.symbol);
          if (index === -1) {
            return;
          }

          this.tickers[index] = {
            ...this.tickers[index],
            dataPoints,
          };
        } catch (error) {
          console.error(`Failed to fetch history for ${ticker.symbol}`, error);
        }
      }),
    );

    this.saveTickers();
    this.notifySubscribers();
  }

  private async fetchRealStockPrices() {
    if (this.tickers.length === 0) return;

    const symbols = this.tickers.map(ticker => ticker.symbol).join(',');
    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbols)}`);
      if (!res.ok) {
        return;
      }

      const payload = await res.json();
      const quotes = Array.isArray(payload) ? payload : [payload];

      quotes.forEach(quote => {
        if (quote?.symbol && isFiniteNumber(quote.regularMarketPrice)) {
          this.updateTickerWithRealData(String(quote.symbol).toUpperCase(), quote);
        }
      });
    } catch (error) {
      console.error('Failed to fetch quotes', error);
    }
  }

  private updateTickerWithRealData(symbol: string, data: any) {
    const index = this.tickers.findIndex(ticker => ticker.symbol.toUpperCase() === symbol);
    if (index === -1) {
      return;
    }

    const currentTicker = this.tickers[index];
    const newPrice = data.regularMarketPrice;
    const timestamp = new Date().toISOString();
    const dataPoints = [...(currentTicker.dataPoints || [])];

    if (dataPoints.length > 0) {
      const lastPoint = dataPoints[dataPoints.length - 1];
      if (new Date(timestamp).getTime() - new Date(lastPoint.time).getTime() > 60000) {
        dataPoints.push({ time: timestamp, value: newPrice });
      } else {
        dataPoints[dataPoints.length - 1] = { ...lastPoint, value: newPrice };
      }
    } else {
      dataPoints.push({ time: timestamp, value: newPrice });
    }

    if (dataPoints.length > 100) {
      dataPoints.shift();
    }

    const previousClose = isFiniteNumber(data.regularMarketPreviousClose)
      ? data.regularMarketPreviousClose
      : currentTicker.openPrice || newPrice;
    const change = isFiniteNumber(data.regularMarketChange)
      ? data.regularMarketChange
      : newPrice - previousClose;
    const changePercent = isFiniteNumber(data.regularMarketChangePercent)
      ? data.regularMarketChangePercent
      : previousClose > 0
        ? ((newPrice - previousClose) / previousClose) * 100
        : currentTicker.changePercent;

    this.tickers[index] = {
      ...currentTicker,
      name: data.shortName || data.longName || currentTicker.name,
      price: newPrice,
      openPrice: previousClose,
      change,
      changePercent,
      dataPoints,
      high24h: isFiniteNumber(data.regularMarketDayHigh) ? data.regularMarketDayHigh : currentTicker.high24h,
      low24h: isFiniteNumber(data.regularMarketDayLow) ? data.regularMarketDayLow : currentTicker.low24h,
      volume: isFiniteNumber(data.regularMarketVolume) ? this.formatNumber(data.regularMarketVolume) : currentTicker.volume,
      marketCap: isFiniteNumber(data.marketCap) ? this.formatNumber(data.marketCap) : currentTicker.marketCap,
    };

    this.saveTickers();
    this.notifySubscribers();
  }

  private initStocks() {
    if (this.stockInterval) {
      clearInterval(this.stockInterval);
    }

    void this.fetchRealStockPrices();
    this.stockInterval = window.setInterval(() => {
      void this.fetchRealStockPrices();
    }, 10000);
  }

  public async addTicker(symbol: string, type: 'US' | 'CRYPTO') {
    const normalizedSymbol = symbol.trim().toUpperCase();
    if (!normalizedSymbol || this.tickers.some(ticker => ticker.symbol === normalizedSymbol)) {
      return;
    }

    const newTicker: MarketTicker = {
      symbol: normalizedSymbol,
      name: normalizedSymbol,
      price: 0,
      change: 0,
      changePercent: 0,
      type,
      dataPoints: [],
      volume: '---',
      high24h: 0,
      low24h: 0,
      marketCap: '---',
    };

    this.tickers.push(newTicker);
    this.saveTickers();
    this.notifySubscribers();

    try {
      const [quoteRes, historyRes] = await Promise.all([
        fetch(`/api/quote?symbol=${encodeURIComponent(normalizedSymbol)}`),
        fetch(`/api/history?symbol=${encodeURIComponent(normalizedSymbol)}`),
      ]);

      if (quoteRes.ok) {
        const quote = await quoteRes.json();
        if (quote?.symbol && isFiniteNumber(quote.regularMarketPrice)) {
          this.updateTickerWithRealData(normalizedSymbol, quote);
        }
      }

      if (historyRes.ok) {
        const history = await historyRes.json();
        const dataPoints = this.parseHistoryRows(history);
        const index = this.tickers.findIndex(ticker => ticker.symbol === normalizedSymbol);
        if (index !== -1 && dataPoints.length > 0) {
          this.tickers[index] = {
            ...this.tickers[index],
            dataPoints,
          };
          this.saveTickers();
          this.notifySubscribers();
        }
      }
    } catch (error) {
      console.error(`Failed to fetch data for new ticker ${normalizedSymbol}`, error);
    }
  }

  public removeTicker(symbol: string) {
    this.tickers = this.tickers.filter(ticker => ticker.symbol !== symbol);
    this.saveTickers();
    this.notifySubscribers();
  }

  public subscribe(callback: TickerUpdateCallback) {
    this.subscribers.push(callback);
    callback(this.tickers);

    return () => {
      this.subscribers = this.subscribers.filter(subscriber => subscriber !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback([...this.tickers]));
  }
}

export const marketService = new MarketService();
