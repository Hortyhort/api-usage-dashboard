import type { NextApiRequest, NextApiResponse } from 'next';
import { generateCsrfToken, buildCsrfCookie } from '../../lib/csrf';

/**
 * GET /api/csrf
 * Returns a CSRF token and sets it as a cookie.
 * Clients should include this token in the x-csrf-token header for POST requests.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end();
    return;
  }

  const token = generateCsrfToken();
  res.setHeader('Set-Cookie', buildCsrfCookie(token));
  res.status(200).json({ token });
}
