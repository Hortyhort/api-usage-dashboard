import type { NextApiRequest, NextApiResponse } from 'next';
import { createShareToken, isAuthConfigured, requireSession } from '../../lib/auth';
import { recordShareToken } from '../../lib/shareStore';
import { checkRateLimit, getClientIp, RATE_LIMIT_PRESETS } from '../../lib/rateLimit';
import { validateShareInput } from '../../lib/validation';
import { logger } from '../../lib/logger';

const allowedExpiries = new Set([1, 24, 168]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end();
    return;
  }

  const clientIp = getClientIp(req);

  // Rate limiting
  const rateLimitKey = `share:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_PRESETS.shareCreate);

  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000));

  if (!rateLimit.success) {
    logger.security('Rate limit exceeded on share creation', { ip: clientIp });
    res.setHeader('Retry-After', Math.ceil(rateLimit.retryAfterMs / 1000));
    res.status(429).json({ error: 'rate_limit_exceeded' });
    return;
  }

  if (!isAuthConfigured()) {
    logger.error('Auth not configured');
    res.status(500).json({ error: 'auth_not_configured' });
    return;
  }

  if (!requireSession(req)) {
    logger.warn('Unauthorized share creation attempt', { ip: clientIp });
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  // Input validation
  const validation = validateShareInput(req.body);
  if (!validation.success) {
    logger.warn('Invalid share request', { ip: clientIp, error: validation.error });
    res.status(400).json({ error: 'invalid_request', message: validation.error });
    return;
  }

  const { expiresInHours, password } = validation.data;
  const safeHours = allowedExpiries.has(expiresInHours) ? expiresInHours : 24;

  const token = createShareToken({
    expiresInHours: safeHours,
    password,
  });
  const expiresAt = new Date(Date.now() + safeHours * 60 * 60 * 1000).toISOString();

  const protocol = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? 'localhost:3000';
  const url = `${protocol}://${host}/?share=${encodeURIComponent(token)}`;

  try {
    await recordShareToken({
      token,
      expiresAt,
      passwordProtected: Boolean(password),
    });
  } catch (error) {
    logger.error('Failed to record share token', { error: String(error) });
    // Continue - share will work, just won't be tracked
  }

  logger.info('Share link created', { ip: clientIp, expiresInHours: safeHours, passwordProtected: Boolean(password) });

  res.status(200).json({
    url,
    expiresAt,
    passwordProtected: Boolean(password),
  });
}
