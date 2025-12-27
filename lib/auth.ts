import { createHmac, timingSafeEqual } from 'crypto';

type TokenPayload = {
  type: 'session' | 'share';
  exp: number;
  passwordDigest?: string;
  readOnly?: boolean;
};

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  maxAge?: number;
};

export const AUTH_COOKIE_NAME = 'aud_session';
export const SHARE_QUERY_KEY = 'share';

const SESSION_TTL_DAYS = 7;

export const isAuthConfigured = () => Boolean(process.env.AUTH_SECRET && process.env.DASHBOARD_PASSWORD);

const getSecret = () => process.env.AUTH_SECRET ?? '';

const encode = (payload: TokenPayload) => Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const decode = (encoded: string) => JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;

const sign = (encoded: string, secret: string) => createHmac('sha256', secret).update(encoded).digest('base64url');

const timingSafeEqualString = (a: string, b: string) => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
};

const serializeCookie = (name: string, value: string, options: CookieOptions) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
};

const getCookieValue = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
};

const verifyToken = (token: string, secret: string) => {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = sign(encoded, secret);
  if (!timingSafeEqualString(signature, expected)) return null;
  const payload = decode(encoded);
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
};

const hashSharePassword = (password: string, secret: string) => createHmac('sha256', secret).update(password).digest('hex');

export const createSessionToken = () => {
  const secret = getSecret();
  const payload: TokenPayload = {
    type: 'session',
    exp: Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  const encoded = encode(payload);
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
};

export const createShareToken = ({
  expiresInHours,
  password,
}: {
  expiresInHours: number;
  password?: string;
}) => {
  const secret = getSecret();
  const payload: TokenPayload = {
    type: 'share',
    exp: Date.now() + expiresInHours * 60 * 60 * 1000,
    readOnly: true,
    passwordDigest: password ? hashSharePassword(password, secret) : undefined,
  };
  const encoded = encode(payload);
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
};

export const getSessionFromRequest = (req: { headers: { cookie?: string } }) => {
  const secret = getSecret();
  if (!secret) return null;
  const token = getCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
  if (!token) return null;
  const payload = verifyToken(token, secret);
  return payload && payload.type === 'session' ? payload : null;
};

export const verifyShareToken = (token: string) => {
  const secret = getSecret();
  if (!secret) return null;
  const payload = verifyToken(token, secret);
  return payload && payload.type === 'share' ? payload : null;
};

export const verifySharePassword = (password: string, digest: string) => {
  const secret = getSecret();
  if (!secret) return false;
  const candidate = hashSharePassword(password, secret);
  return timingSafeEqualString(candidate, digest);
};

export const buildSessionCookie = (token: string) => serializeCookie(AUTH_COOKIE_NAME, token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax',
  path: '/',
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
});

export const buildLogoutCookie = () => serializeCookie(AUTH_COOKIE_NAME, '', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax',
  path: '/',
  maxAge: 0,
});

export const requireSession = (req: { headers: { cookie?: string } }) => Boolean(getSessionFromRequest(req));

export const authorizeRequest = ({
  req,
  shareToken,
  sharePassword,
}: {
  req: { headers: { cookie?: string } };
  shareToken?: string | null;
  sharePassword?: string | null;
}) => {
  if (!isAuthConfigured()) {
    return { authorized: false, readOnly: false, error: 'auth_not_configured' } as const;
  }

  const session = getSessionFromRequest(req);
  if (session) {
    return { authorized: true, readOnly: false } as const;
  }

  if (shareToken) {
    const share = verifyShareToken(shareToken);
    if (!share) {
      return { authorized: false, readOnly: false, error: 'share_invalid' } as const;
    }

    if (share.passwordDigest) {
      if (!sharePassword) {
        return { authorized: false, readOnly: true, error: 'share_password_required' } as const;
      }
      if (!verifySharePassword(sharePassword, share.passwordDigest)) {
        return { authorized: false, readOnly: true, error: 'share_password_invalid' } as const;
      }
    }

    return { authorized: true, readOnly: true } as const;
  }

  return { authorized: false, readOnly: false, error: 'unauthorized' } as const;
};

