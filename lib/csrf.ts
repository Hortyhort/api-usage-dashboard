/**
 * CSRF protection utilities.
 * Uses the double-submit cookie pattern with cryptographic tokens.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

const CSRF_COOKIE_NAME = 'aud_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;
const TOKEN_MAX_AGE = 24 * 60 * 60; // 24 hours

const getSecret = () => process.env.AUTH_SECRET ?? '';

/**
 * Generate a new CSRF token.
 */
export const generateCsrfToken = (): string => {
  const secret = getSecret();
  const randomPart = randomBytes(TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now().toString(36);
  const data = `${randomPart}.${timestamp}`;
  const signature = createHmac('sha256', secret).update(data).digest('hex').slice(0, 16);
  return `${data}.${signature}`;
};

/**
 * Verify a CSRF token.
 */
export const verifyCsrfToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [randomPart, timestamp, signature] = parts;
  if (!randomPart || !timestamp || !signature) return false;

  // Check token age
  try {
    const tokenTime = parseInt(timestamp, 36);
    const age = (Date.now() - tokenTime) / 1000;
    if (age < 0 || age > TOKEN_MAX_AGE) return false;
  } catch {
    return false;
  }

  // Verify signature
  const secret = getSecret();
  const data = `${randomPart}.${timestamp}`;
  const expectedSig = createHmac('sha256', secret).update(data).digest('hex').slice(0, 16);

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
};

/**
 * Get CSRF token from cookie.
 */
const getCsrfFromCookie = (cookieHeader: string | undefined): string | null => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const match = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
};

/**
 * Build CSRF cookie string.
 */
export const buildCsrfCookie = (token: string): string => {
  const parts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${TOKEN_MAX_AGE}`,
    'Path=/',
    'SameSite=Strict',
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
};

/**
 * Validate CSRF protection for a request.
 * Compares the token from the header against the token in the cookie.
 */
export const validateCsrf = (req: NextApiRequest): boolean => {
  // Safe methods don't need CSRF protection
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? '');
  if (safeMethod) return true;

  const cookieToken = getCsrfFromCookie(req.headers.cookie);
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken) return false;

  // Tokens must match and be valid
  if (cookieToken !== headerToken) return false;

  return verifyCsrfToken(cookieToken);
};

/**
 * Middleware to enforce CSRF protection.
 * Returns true if the request should proceed, false if it should be rejected.
 */
export const enforceCsrf = (
  req: NextApiRequest,
  res: NextApiResponse
): boolean => {
  if (!validateCsrf(req)) {
    res.status(403).json({ error: 'csrf_validation_failed' });
    return false;
  }
  return true;
};

/**
 * Set up CSRF protection for a response.
 * Generates a new token and sets it as a cookie.
 */
export const setupCsrf = (res: NextApiResponse): string => {
  const token = generateCsrfToken();
  res.setHeader('Set-Cookie', buildCsrfCookie(token));
  return token;
};
