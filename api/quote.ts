import type { VercelRequest, VercelResponse } from '@vercel/node';
import yahooFinance from 'yahoo-finance2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  try {
    const symbols = symbol.split(',');
    if (symbols.length === 1) {
      const quote = await yahooFinance.quote(symbols[0]);
      res.status(200).json(quote);
    } else {
      const quotes = await yahooFinance.quote(symbols);
      res.status(200).json(quotes);
    }
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
}
