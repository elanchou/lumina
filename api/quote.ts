import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchQuotes } from '../lib/serverMarketData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  try {
    const quotes = await fetchQuotes(symbol);
    const requestedSymbols = symbol.split(',').map(item => item.trim()).filter(Boolean);

    if (requestedSymbols.length === 1) {
      const quote = quotes[0];
      if (!quote) {
        return res.status(404).json({ error: 'Quote not found', symbol: requestedSymbols[0] });
      }
      return res.status(200).json(quote);
    }

    return res.status(200).json(quotes);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
}
