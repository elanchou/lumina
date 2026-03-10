import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchCryptoList } from '../lib/serverMarketData';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const result = await fetchCryptoList();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching crypto list:', error);
    res.status(502).json({ error: 'Failed to fetch crypto list', items: [] });
  }
}
