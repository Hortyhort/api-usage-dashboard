import type { NextApiRequest, NextApiResponse } from 'next';
import { buildSessionCookie, createSessionToken, isAuthConfigured } from '../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end();
    return;
  }

  if (!isAuthConfigured()) {
    res.status(500).json({ error: 'auth_not_configured' });
    return;
  }

  const { password } = req.body ?? {};
  if (typeof password !== 'string' || password.length === 0) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  if (password !== process.env.DASHBOARD_PASSWORD) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  const token = createSessionToken();
  res.setHeader('Set-Cookie', buildSessionCookie(token));
  res.status(200).json({ ok: true });
}
