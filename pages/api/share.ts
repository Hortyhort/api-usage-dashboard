import type { NextApiRequest, NextApiResponse } from 'next';
import { createShareToken, isAuthConfigured, requireSession } from '../../lib/auth';

const allowedExpiries = new Set([1, 24, 168]);

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

  if (!requireSession(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const { expiresInHours, password } = req.body ?? {};
  const requestedHours = Number(expiresInHours);
  const safeHours = allowedExpiries.has(requestedHours) ? requestedHours : 24;

  const token = createShareToken({
    expiresInHours: safeHours,
    password: typeof password === 'string' && password.length > 0 ? password : undefined,
  });

  const protocol = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? 'localhost:3000';
  const url = `${protocol}://${host}/?share=${encodeURIComponent(token)}`;

  res.status(200).json({
    url,
    expiresAt: new Date(Date.now() + safeHours * 60 * 60 * 1000).toISOString(),
    passwordProtected: Boolean(password),
  });
}
