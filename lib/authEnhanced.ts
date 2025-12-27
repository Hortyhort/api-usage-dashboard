import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import {
  getUserByEmail,
  getUserById,
  createUser as dbCreateUser,
  updateUser,
  updateLastLogin,
  createSession as dbCreateSession,
  getSessionByToken,
  deleteSession,
  deleteUserSessions,
  cleanupExpiredSessions,
  type User,
  type Session,
} from './db';

const SALT_ROUNDS = 12;
const SESSION_TTL_DAYS = 7;

// Get secret for token signing
const getSecret = () => process.env.AUTH_SECRET ?? '';

// Check if auth is properly configured
export const isAuthConfigured = () => {
  const secret = process.env.AUTH_SECRET;
  const legacyPassword = process.env.DASHBOARD_PASSWORD;
  return Boolean(secret && (legacyPassword || process.env.ENABLE_USER_ACCOUNTS === 'true'));
};

export const isUserAccountsEnabled = () => process.env.ENABLE_USER_ACCOUNTS === 'true';

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Session token generation
const generateSessionToken = (): string => {
  return randomBytes(32).toString('base64url');
};

const signToken = (token: string): string => {
  const signature = createHmac('sha256', getSecret()).update(token).digest('base64url');
  return `${token}.${signature}`;
};

const verifyTokenSignature = (signedToken: string): string | null => {
  const parts = signedToken.split('.');
  if (parts.length !== 2) return null;

  const [token, signature] = parts;
  const expected = createHmac('sha256', getSecret()).update(token).digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  return token;
};

// User management
export const createUserAccount = async (data: {
  email: string;
  password: string;
  name?: string;
  role?: User['role'];
}): Promise<User> => {
  const passwordHash = await hashPassword(data.password);
  return dbCreateUser({
    email: data.email.toLowerCase(),
    passwordHash,
    name: data.name,
    role: data.role,
  });
};

export const authenticateUser = async (
  email: string,
  password: string
): Promise<User | null> => {
  const user = getUserByEmail(email.toLowerCase());
  if (!user || !user.isActive || !user.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  updateLastLogin(user.id);
  return user;
};

export const changePassword = async (userId: number, newPassword: string): Promise<boolean> => {
  const passwordHash = await hashPassword(newPassword);
  return updateUser(userId, { passwordHash });
};

// Session management
export const createUserSession = (
  userId: number,
  options?: { userAgent?: string; ipAddress?: string }
): { session: Session; signedToken: string } => {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const session = dbCreateSession({
    userId,
    token,
    expiresAt,
    userAgent: options?.userAgent,
    ipAddress: options?.ipAddress,
  });

  return { session, signedToken: signToken(token) };
};

export const validateSession = (signedToken: string): { user: User; session: Session } | null => {
  const token = verifyTokenSignature(signedToken);
  if (!token) return null;

  const session = getSessionByToken(token);
  if (!session) return null;

  // Check if session expired
  if (new Date(session.expiresAt) < new Date()) {
    deleteSession(token);
    return null;
  }

  const user = getUserById(session.userId);
  if (!user || !user.isActive) {
    deleteSession(token);
    return null;
  }

  return { user, session };
};

export const invalidateSession = (signedToken: string): boolean => {
  const token = verifyTokenSignature(signedToken);
  if (!token) return false;
  return deleteSession(token);
};

export const invalidateAllUserSessions = (userId: number): number => {
  return deleteUserSessions(userId);
};

// Legacy password auth (for backwards compatibility)
export const verifyLegacyPassword = (password: string): boolean => {
  const legacyPassword = process.env.DASHBOARD_PASSWORD;
  if (!legacyPassword) return false;
  return password === legacyPassword;
};

// Role-based access control
export type Permission =
  | 'dashboard:view'
  | 'dashboard:export'
  | 'dashboard:share'
  | 'api_keys:view'
  | 'api_keys:create'
  | 'api_keys:delete'
  | 'alerts:view'
  | 'alerts:manage'
  | 'team:view'
  | 'team:manage'
  | 'users:view'
  | 'users:manage'
  | 'settings:view'
  | 'settings:manage';

const rolePermissions: Record<User['role'], Permission[]> = {
  admin: [
    'dashboard:view', 'dashboard:export', 'dashboard:share',
    'api_keys:view', 'api_keys:create', 'api_keys:delete',
    'alerts:view', 'alerts:manage',
    'team:view', 'team:manage',
    'users:view', 'users:manage',
    'settings:view', 'settings:manage',
  ],
  developer: [
    'dashboard:view', 'dashboard:export',
    'api_keys:view', 'api_keys:create',
    'alerts:view',
    'team:view',
    'settings:view',
  ],
  billing: [
    'dashboard:view', 'dashboard:export',
    'alerts:view',
    'settings:view',
  ],
  viewer: [
    'dashboard:view',
    'alerts:view',
  ],
};

export const hasPermission = (user: User, permission: Permission): boolean => {
  return rolePermissions[user.role]?.includes(permission) ?? false;
};

export const getUserPermissions = (user: User): Permission[] => {
  return rolePermissions[user.role] ?? [];
};

// Cleanup utility
export const cleanupSessions = (): number => {
  return cleanupExpiredSessions();
};

// Cookie helpers
export const AUTH_COOKIE_NAME = 'aud_session';

export const buildSessionCookie = (signedToken: string): string => {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
};

export const buildLogoutCookie = (): string => {
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
};

export const getSessionFromCookie = (cookieHeader: string | undefined): { user: User; session: Session } | null => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!sessionCookie) return null;

  const signedToken = decodeURIComponent(sessionCookie.split('=').slice(1).join('='));
  return validateSession(signedToken);
};
