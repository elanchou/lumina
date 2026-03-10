import YahooFinance from 'yahoo-finance2';
import { HistoricalQuotePoint } from '../types';

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
});

type QuoteResult = Awaited<ReturnType<typeof yahooFinance.quote>>;

const COINGECKO_MARKETS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false';

const sanitizeSymbols = (input: string) =>
  input
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean);

export const normalizeHistory = (rows: unknown): HistoricalQuotePoint[] => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row: any) => {
      if (!row?.date || typeof row.close !== 'number' || !Number.isFinite(row.close)) {
        return null;
      }

      const timestamp = new Date(row.date).getTime();
      if (!Number.isFinite(timestamp)) {
        return null;
      }

      return {
        date: new Date(timestamp).toISOString(),
        close: row.close,
        timestamp,
        shortLabel: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      } satisfies HistoricalQuotePoint;
    })
    .filter((row): row is HistoricalQuotePoint => row !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
};

export const normalizeCryptoList = (rows: unknown) => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((coin: any) => {
      if (!coin?.symbol || !coin?.name || typeof coin.current_price !== 'number') {
        return null;
      }

      return {
        symbol: `${String(coin.symbol).toUpperCase()}-USD`,
        name: String(coin.name),
        type: 'CRYPTO',
        current_price: coin.current_price,
        total_volume: typeof coin.total_volume === 'number' ? coin.total_volume : 0,
        high_24h: typeof coin.high_24h === 'number' ? coin.high_24h : 0,
        low_24h: typeof coin.low_24h === 'number' ? coin.low_24h : 0,
        market_cap: typeof coin.market_cap === 'number' ? coin.market_cap : 0,
      };
    })
    .filter(Boolean);
};

export const fetchQuotes = async (input: string) => {
  const symbols = sanitizeSymbols(input);
  if (symbols.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(symbols.map(symbol => yahooFinance.quote(symbol)));

  return results.flatMap(result => {
    if (result.status !== 'fulfilled') {
      return [];
    }

    const quote = result.value as QuoteResult;
    if (!quote?.symbol || typeof quote.regularMarketPrice !== 'number') {
      return [];
    }

    return [quote];
  });
};

export const fetchHistory = async (symbol: string) => {
  const period1 = new Date();
  const period2 = new Date();
  period1.setMonth(period1.getMonth() - 1);
  const rows = await yahooFinance.historical(symbol, { period1, period2, interval: '1d' });
  return normalizeHistory(rows);
};

export const fetchCryptoList = async () => {
  const response = await fetch(COINGECKO_MARKETS_URL, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko request failed with ${response.status}`);
  }

  const payload = await response.json();
  return normalizeCryptoList(payload);
};
