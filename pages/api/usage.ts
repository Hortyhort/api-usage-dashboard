import type { NextApiRequest, NextApiResponse } from 'next';
import { mockDashboardData } from '../../data/mockData';
import type { DashboardData } from '../../types/dashboard';
import { authorizeRequest } from '../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse<DashboardData | { error: string }>) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end();
    return;
  }

  const shareToken = typeof req.query.share === 'string' ? req.query.share : null;
  const sharePasswordHeader = req.headers['x-share-password'];
  const sharePassword = typeof sharePasswordHeader === 'string' ? sharePasswordHeader : null;
  const auth = authorizeRequest({ req, shareToken, sharePassword });

  if (!auth.authorized) {
    res.status(401).json({ error: auth.error ?? 'unauthorized' });
    return;
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.status(200).json(mockDashboardData);
}
