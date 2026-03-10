import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchHistory } from '../lib/serverMarketData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  try {
    const result = await fetchHistory(symbol);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}
