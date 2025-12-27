import type { NextApiRequest, NextApiResponse } from 'next';
import { mockDashboardData } from '../../data/mockData';
import type { DashboardData } from '../../types/dashboard';

export default function handler(req: NextApiRequest, res: NextApiResponse<DashboardData>) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end();
    return;
  }
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.status(200).json(mockDashboardData);
}
