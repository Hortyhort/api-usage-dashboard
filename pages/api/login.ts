import type { NextApiRequest, NextApiResponse } from 'next';
import { buildSessionCookie, createSessionToken, isAuthConfigured } from '../../lib/auth';
import {
  isUserAccountsEnabled,
  authenticateUser,
  createUserSession,
  buildSessionCookie as buildEnhancedSessionCookie,
  verifyLegacyPassword,
} from '../../lib/authEnhanced';
import { checkRateLimit, getClientIp, RATE_LIMIT_PRESETS } from '../../lib/rateLimit';
import { validateLoginInput } from '../../lib/validation';
import { logger } from '../../lib/logger';
import { enforceCsrf } from '../../lib/csrf';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end();
    return;
  }

  // CSRF protection
  if (!enforceCsrf(req, res)) {
    logger.security('CSRF validation failed on login', { ip: getClientIp(req) });
    return;
  }

  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  // Rate limiting
  const rateLimitKey = `login:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_PRESETS.login);

  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000));

  if (!rateLimit.success) {
    logger.security('Rate limit exceeded on login', { ip: clientIp });
    res.setHeader('Retry-After', Math.ceil(rateLimit.retryAfterMs / 1000));
    res.status(429).json({ error: 'rate_limit_exceeded' });
    return;
  }

  if (!isAuthConfigured()) {
    logger.error('Auth not configured');
    res.status(500).json({ error: 'auth_not_configured' });
    return;
  }

  // Check if user accounts mode is enabled
  if (isUserAccountsEnabled()) {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'invalid_request', message: 'Email and password required' });
      return;
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      logger.security('Failed login attempt', { ip: clientIp, email });
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    const { signedToken } = createUserSession(user.id, { userAgent, ipAddress: clientIp });
    res.setHeader('Set-Cookie', buildEnhancedSessionCookie(signedToken));

    logger.info('Successful user login', { ip: clientIp, userId: user.id, email: user.email });
    res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
    return;
  }

  // Legacy single-password mode
  const validation = validateLoginInput(req.body);
  if (!validation.success) {
    logger.warn('Invalid login request', { ip: clientIp, error: validation.error });
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  const { password } = validation.data;

  if (!verifyLegacyPassword(password)) {
    logger.security('Failed login attempt', { ip: clientIp });
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  const token = createSessionToken();
  res.setHeader('Set-Cookie', buildSessionCookie(token));

  logger.info('Successful legacy login', { ip: clientIp });
  res.status(200).json({ ok: true });
}
