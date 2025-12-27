import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

const DB_PATH = process.env.DATABASE_PATH || '.data/dashboard.db';

let db: Database.Database | null = null;

const getDbPath = () => {
  return path.isAbsolute(DB_PATH) ? DB_PATH : path.join(process.cwd(), DB_PATH);
};

export const getDb = (): Database.Database => {
  if (db) return db;

  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  initializeTables(db);

  return db;
};

const initializeTables = (database: Database.Database) => {
  database.exec(`
    -- Share links table
    CREATE TABLE IF NOT EXISTS share_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      password_protected INTEGER DEFAULT 0,
      access_count INTEGER DEFAULT 0,
      last_accessed_at TEXT,
      revoked_at TEXT,
      created_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
    CREATE INDEX IF NOT EXISTS idx_share_links_expires ON share_links(expires_at);

    -- Users table for Phase 4
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      role TEXT DEFAULT 'viewer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    -- API usage logs for caching/aggregation
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_write_tokens INTEGER DEFAULT 0,
      requests INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(date);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_model ON usage_logs(model);
  `);
};

// Share link operations
export type ShareLink = {
  id: number;
  token: string;
  createdAt: string;
  expiresAt: string;
  passwordProtected: boolean;
  accessCount: number;
  lastAccessedAt: string | null;
  revokedAt: string | null;
  createdBy: string | null;
};

export const createShareLink = (data: {
  token: string;
  expiresAt: string;
  passwordProtected: boolean;
  createdBy?: string;
}): ShareLink => {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO share_links (token, expires_at, password_protected, created_by)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.token,
    data.expiresAt,
    data.passwordProtected ? 1 : 0,
    data.createdBy || null
  );

  return getShareLinkById(result.lastInsertRowid as number)!;
};

export const getShareLinkById = (id: number): ShareLink | null => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM share_links WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? mapShareLink(row) : null;
};

export const getShareLinkByToken = (token: string): ShareLink | null => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM share_links WHERE token = ?');
  const row = stmt.get(token) as Record<string, unknown> | undefined;
  return row ? mapShareLink(row) : null;
};

export const getAllShareLinks = (includeRevoked = false): ShareLink[] => {
  const db = getDb();
  const sql = includeRevoked
    ? 'SELECT * FROM share_links ORDER BY created_at DESC'
    : 'SELECT * FROM share_links WHERE revoked_at IS NULL ORDER BY created_at DESC';
  const stmt = db.prepare(sql);
  const rows = stmt.all() as Record<string, unknown>[];
  return rows.map(mapShareLink);
};

export const markShareLinkAccessed = (token: string): boolean => {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE share_links
    SET access_count = access_count + 1, last_accessed_at = datetime('now')
    WHERE token = ?
  `);
  const result = stmt.run(token);
  return result.changes > 0;
};

export const revokeShareLink = (token: string): boolean => {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE share_links SET revoked_at = datetime('now') WHERE token = ?
  `);
  const result = stmt.run(token);
  return result.changes > 0;
};

export const isShareLinkRevoked = (token: string): boolean => {
  const link = getShareLinkByToken(token);
  return link ? link.revokedAt !== null : false;
};

export const cleanupExpiredShareLinks = (): number => {
  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM share_links WHERE expires_at < datetime('now')
  `);
  const result = stmt.run();
  return result.changes;
};

const mapShareLink = (row: Record<string, unknown>): ShareLink => ({
  id: row.id as number,
  token: row.token as string,
  createdAt: row.created_at as string,
  expiresAt: row.expires_at as string,
  passwordProtected: Boolean(row.password_protected),
  accessCount: row.access_count as number,
  lastAccessedAt: row.last_accessed_at as string | null,
  revokedAt: row.revoked_at as string | null,
  createdBy: row.created_by as string | null,
});

// User operations for Phase 4
export type User = {
  id: number;
  email: string;
  passwordHash: string | null;
  name: string | null;
  role: 'admin' | 'developer' | 'viewer' | 'billing';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
};

export const createUser = (data: {
  email: string;
  passwordHash?: string;
  name?: string;
  role?: User['role'];
}): User => {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.email,
    data.passwordHash || null,
    data.name || null,
    data.role || 'viewer'
  );

  return getUserById(result.lastInsertRowid as number)!;
};

export const getUserById = (id: number): User | null => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : null;
};

export const getUserByEmail = (email: string): User | null => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const row = stmt.get(email) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : null;
};

export const getAllUsers = (): User[] => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
  const rows = stmt.all() as Record<string, unknown>[];
  return rows.map(mapUser);
};

export const updateUser = (id: number, data: Partial<Omit<User, 'id' | 'createdAt'>>): boolean => {
  const db = getDb();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.email !== undefined) {
    updates.push('email = ?');
    values.push(data.email);
  }
  if (data.passwordHash !== undefined) {
    updates.push('password_hash = ?');
    values.push(data.passwordHash);
  }
  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.role !== undefined) {
    updates.push('role = ?');
    values.push(data.role);
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(data.isActive ? 1 : 0);
  }
  if (data.lastLoginAt !== undefined) {
    updates.push('last_login_at = ?');
    values.push(data.lastLoginAt);
  }

  if (updates.length === 0) return false;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
};

export const deleteUser = (id: number): boolean => {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
};

export const updateLastLogin = (id: number): boolean => {
  const db = getDb();
  const stmt = db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
};

const mapUser = (row: Record<string, unknown>): User => ({
  id: row.id as number,
  email: row.email as string,
  passwordHash: row.password_hash as string | null,
  name: row.name as string | null,
  role: row.role as User['role'],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  lastLoginAt: row.last_login_at as string | null,
  isActive: Boolean(row.is_active),
});

// Session operations
export type Session = {
  id: number;
  userId: number;
  token: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
};

export const createSession = (data: {
  userId: number;
  token: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}): Session => {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sessions (user_id, token, expires_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.userId,
    data.token,
    data.expiresAt,
    data.userAgent || null,
    data.ipAddress || null
  );

  return getSessionById(result.lastInsertRowid as number)!;
};

export const getSessionById = (id: number): Session | null => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? mapSession(row) : null;
};

export const getSessionByToken = (token: string): Session | null => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM sessions WHERE token = ?');
  const row = stmt.get(token) as Record<string, unknown> | undefined;
  return row ? mapSession(row) : null;
};

export const deleteSession = (token: string): boolean => {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
  const result = stmt.run(token);
  return result.changes > 0;
};

export const deleteUserSessions = (userId: number): number => {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
  const result = stmt.run(userId);
  return result.changes;
};

export const cleanupExpiredSessions = (): number => {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')");
  const result = stmt.run();
  return result.changes;
};

const mapSession = (row: Record<string, unknown>): Session => ({
  id: row.id as number,
  userId: row.user_id as number,
  token: row.token as string,
  createdAt: row.created_at as string,
  expiresAt: row.expires_at as string,
  userAgent: row.user_agent as string | null,
  ipAddress: row.ip_address as string | null,
});
