import type { NextApiRequest, NextApiResponse } from 'next';
import { buildLogoutCookie } from '../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end();
    return;
  }

  res.setHeader('Set-Cookie', buildLogoutCookie());
  res.status(200).json({ ok: true });
}
