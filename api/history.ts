import type { VercelRequest, VercelResponse } from '@vercel/node';
import yahooFinance from 'yahoo-finance2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  try {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const queryOptions = { period1: date }; // 1 month history
    const result = await yahooFinance.historical(symbol, queryOptions);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}
