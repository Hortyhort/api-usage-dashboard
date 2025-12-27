/**
 * Tests for the SQLite database operations (Phase 3)
 *
 * These tests use an in-memory database to avoid affecting the real database.
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach, after } from 'node:test';
import Database from 'better-sqlite3';

// Create an in-memory test database
let testDb: Database.Database;

const initTestDb = () => {
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');

  testDb.exec(`
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

    -- Users table
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
  `);

  return testDb;
};

// Helper functions that mirror the db module
const createShareLink = (db: Database.Database, data: {
  token: string;
  expiresAt: string;
  passwordProtected: boolean;
  createdBy?: string;
}) => {
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

  return getShareLinkById(db, result.lastInsertRowid as number);
};

const getShareLinkById = (db: Database.Database, id: number) => {
  const stmt = db.prepare('SELECT * FROM share_links WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? mapShareLink(row) : null;
};

const getShareLinkByToken = (db: Database.Database, token: string) => {
  const stmt = db.prepare('SELECT * FROM share_links WHERE token = ?');
  const row = stmt.get(token) as Record<string, unknown> | undefined;
  return row ? mapShareLink(row) : null;
};

const getAllShareLinks = (db: Database.Database, includeRevoked = false) => {
  const sql = includeRevoked
    ? 'SELECT * FROM share_links ORDER BY created_at DESC'
    : 'SELECT * FROM share_links WHERE revoked_at IS NULL ORDER BY created_at DESC';
  const stmt = db.prepare(sql);
  const rows = stmt.all() as Record<string, unknown>[];
  return rows.map(mapShareLink);
};

const markShareLinkAccessed = (db: Database.Database, token: string): boolean => {
  const stmt = db.prepare(`
    UPDATE share_links
    SET access_count = access_count + 1, last_accessed_at = datetime('now')
    WHERE token = ?
  `);
  const result = stmt.run(token);
  return result.changes > 0;
};

const revokeShareLink = (db: Database.Database, token: string): boolean => {
  const stmt = db.prepare(`
    UPDATE share_links SET revoked_at = datetime('now') WHERE token = ?
  `);
  const result = stmt.run(token);
  return result.changes > 0;
};

const mapShareLink = (row: Record<string, unknown>) => ({
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

// User helpers
const createUser = (db: Database.Database, data: {
  email: string;
  passwordHash?: string;
  name?: string;
  role?: string;
}) => {
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

  return getUserById(db, result.lastInsertRowid as number);
};

const getUserById = (db: Database.Database, id: number) => {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : null;
};

const getUserByEmail = (db: Database.Database, email: string) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const row = stmt.get(email) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : null;
};

const updateUser = (db: Database.Database, id: number, data: Record<string, unknown>): boolean => {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.email !== undefined) {
    updates.push('email = ?');
    values.push(data.email);
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

  if (updates.length === 0) return false;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
};

const deleteUser = (db: Database.Database, id: number): boolean => {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
};

const mapUser = (row: Record<string, unknown>) => ({
  id: row.id as number,
  email: row.email as string,
  passwordHash: row.password_hash as string | null,
  name: row.name as string | null,
  role: row.role as string,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  lastLoginAt: row.last_login_at as string | null,
  isActive: Boolean(row.is_active),
});

// Session helpers
const createSession = (db: Database.Database, data: {
  userId: number;
  token: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
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

  return getSessionById(db, result.lastInsertRowid as number);
};

const getSessionById = (db: Database.Database, id: number) => {
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? mapSession(row) : null;
};

const getSessionByToken = (db: Database.Database, token: string) => {
  const stmt = db.prepare('SELECT * FROM sessions WHERE token = ?');
  const row = stmt.get(token) as Record<string, unknown> | undefined;
  return row ? mapSession(row) : null;
};

const deleteSession = (db: Database.Database, token: string): boolean => {
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
  const result = stmt.run(token);
  return result.changes > 0;
};

const mapSession = (row: Record<string, unknown>) => ({
  id: row.id as number,
  userId: row.user_id as number,
  token: row.token as string,
  createdAt: row.created_at as string,
  expiresAt: row.expires_at as string,
  userAgent: row.user_agent as string | null,
  ipAddress: row.ip_address as string | null,
});

// Tests

beforeEach(() => {
  testDb = initTestDb();
});

after(() => {
  if (testDb) {
    testDb.close();
  }
});

describe('Share Links - CRUD operations', () => {
  it('creates a share link', () => {
    const link = createShareLink(testDb, {
      token: 'test-token-123',
      expiresAt: '2025-12-31T23:59:59Z',
      passwordProtected: false,
    });

    assert.ok(link);
    assert.equal(link.token, 'test-token-123');
    assert.equal(link.passwordProtected, false);
    assert.equal(link.accessCount, 0);
    assert.equal(link.revokedAt, null);
  });

  it('creates a password-protected share link', () => {
    const link = createShareLink(testDb, {
      token: 'secure-token',
      expiresAt: '2025-12-31T23:59:59Z',
      passwordProtected: true,
      createdBy: 'admin@example.com',
    });

    assert.ok(link);
    assert.equal(link.passwordProtected, true);
    assert.equal(link.createdBy, 'admin@example.com');
  });

  it('retrieves share link by token', () => {
    createShareLink(testDb, {
      token: 'find-me-token',
      expiresAt: '2025-12-31T23:59:59Z',
      passwordProtected: false,
    });

    const found = getShareLinkByToken(testDb, 'find-me-token');
    assert.ok(found);
    assert.equal(found.token, 'find-me-token');
  });

  it('returns null for non-existent token', () => {
    const notFound = getShareLinkByToken(testDb, 'does-not-exist');
    assert.equal(notFound, null);
  });

  it('lists all non-revoked share links', () => {
    createShareLink(testDb, {
      token: 'link-1',
      expiresAt: '2025-12-31T23:59:59Z',
      passwordProtected: false,
    });
    createShareLink(testDb, {
      token: 'link-2',
      expiresAt: '2025-12-31T23:59:59Z',
      passwordProtected: false,
    });

    revokeShareLink(testDb, 'link-1');

    const activeLinks = getAllShareLinks(testDb, false);
    assert.equal(activeLinks.length, 1);
    assert.equal(activeLinks[0].token, 'link-2');

    const allLinks = getAllShareLinks(testDb, true);
    assert.equal(allLinks.length, 2);
  });

  it('tracks access count', () => {
    createShareLink(testDb, {
      token: 'access-test',
      expiresAt: '2025-12-31T23:59:59Z',
      passwordProtected: false,
    });

    markShareLinkAccessed(testDb, 'access-test');
    markShareLinkAccessed(testDb, 'access-test');
    markShareLinkAccessed(testDb, 'access-test');

    const link = getShareLinkByToken(testDb, 'access-test');
    assert.ok(link);
    assert.equal(link.accessCount, 3);
    assert.ok(link.lastAccessedAt !== null);
  });

  it('revokes a share link', () => {
    createShareLink(testDb, {
      token: 'to-revoke',
      expiresAt: '2025-12-31T23:59:59Z',
      passwordProtected: false,
    });

    const revoked = revokeShareLink(testDb, 'to-revoke');
    assert.equal(revoked, true);

    const link = getShareLinkByToken(testDb, 'to-revoke');
    assert.ok(link);
    assert.ok(link.revokedAt !== null);
  });

  it('enforces unique token constraint', () => {
    createShareLink(testDb, {
      token: 'unique-token',
      expiresAt: '2025-12-31T23:59:59Z',
      passwordProtected: false,
    });

    assert.throws(() => {
      createShareLink(testDb, {
        token: 'unique-token',
        expiresAt: '2025-12-31T23:59:59Z',
        passwordProtected: false,
      });
    });
  });
});

describe('Users - CRUD operations', () => {
  it('creates a user with default role', () => {
    const user = createUser(testDb, {
      email: 'test@example.com',
      name: 'Test User',
    });

    assert.ok(user);
    assert.equal(user.email, 'test@example.com');
    assert.equal(user.name, 'Test User');
    assert.equal(user.role, 'viewer');
    assert.equal(user.isActive, true);
  });

  it('creates a user with custom role', () => {
    const user = createUser(testDb, {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      passwordHash: 'hashed-password-123',
    });

    assert.ok(user);
    assert.equal(user.role, 'admin');
    assert.equal(user.passwordHash, 'hashed-password-123');
  });

  it('retrieves user by email', () => {
    createUser(testDb, {
      email: 'lookup@example.com',
      name: 'Lookup User',
    });

    const found = getUserByEmail(testDb, 'lookup@example.com');
    assert.ok(found);
    assert.equal(found.email, 'lookup@example.com');
  });

  it('returns null for non-existent email', () => {
    const notFound = getUserByEmail(testDb, 'nobody@example.com');
    assert.equal(notFound, null);
  });

  it('updates user properties', () => {
    const user = createUser(testDb, {
      email: 'update@example.com',
      name: 'Original Name',
      role: 'viewer',
    });

    assert.ok(user);

    const updated = updateUser(testDb, user.id, {
      name: 'Updated Name',
      role: 'developer',
    });
    assert.equal(updated, true);

    const refreshed = getUserById(testDb, user.id);
    assert.ok(refreshed);
    assert.equal(refreshed.name, 'Updated Name');
    assert.equal(refreshed.role, 'developer');
  });

  it('deactivates a user', () => {
    const user = createUser(testDb, {
      email: 'deactivate@example.com',
    });

    assert.ok(user);

    updateUser(testDb, user.id, { isActive: false });

    const refreshed = getUserById(testDb, user.id);
    assert.ok(refreshed);
    assert.equal(refreshed.isActive, false);
  });

  it('deletes a user', () => {
    const user = createUser(testDb, {
      email: 'delete@example.com',
    });

    assert.ok(user);

    const deleted = deleteUser(testDb, user.id);
    assert.equal(deleted, true);

    const notFound = getUserById(testDb, user.id);
    assert.equal(notFound, null);
  });

  it('enforces unique email constraint', () => {
    createUser(testDb, { email: 'unique@example.com' });

    assert.throws(() => {
      createUser(testDb, { email: 'unique@example.com' });
    });
  });
});

describe('Sessions - CRUD operations', () => {
  it('creates a session for a user', () => {
    const user = createUser(testDb, { email: 'session@example.com' });
    assert.ok(user);

    const session = createSession(testDb, {
      userId: user.id,
      token: 'session-token-abc',
      expiresAt: '2025-12-31T23:59:59Z',
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1',
    });

    assert.ok(session);
    assert.equal(session.userId, user.id);
    assert.equal(session.token, 'session-token-abc');
    assert.equal(session.userAgent, 'Mozilla/5.0');
    assert.equal(session.ipAddress, '192.168.1.1');
  });

  it('retrieves session by token', () => {
    const user = createUser(testDb, { email: 'lookup-session@example.com' });
    assert.ok(user);

    createSession(testDb, {
      userId: user.id,
      token: 'find-session',
      expiresAt: '2025-12-31T23:59:59Z',
    });

    const found = getSessionByToken(testDb, 'find-session');
    assert.ok(found);
    assert.equal(found.token, 'find-session');
  });

  it('returns null for non-existent session token', () => {
    const notFound = getSessionByToken(testDb, 'no-such-session');
    assert.equal(notFound, null);
  });

  it('deletes a session', () => {
    const user = createUser(testDb, { email: 'delete-session@example.com' });
    assert.ok(user);

    createSession(testDb, {
      userId: user.id,
      token: 'to-delete',
      expiresAt: '2025-12-31T23:59:59Z',
    });

    const deleted = deleteSession(testDb, 'to-delete');
    assert.equal(deleted, true);

    const notFound = getSessionByToken(testDb, 'to-delete');
    assert.equal(notFound, null);
  });

  it('enforces unique token constraint', () => {
    const user = createUser(testDb, { email: 'dup-session@example.com' });
    assert.ok(user);

    createSession(testDb, {
      userId: user.id,
      token: 'unique-session',
      expiresAt: '2025-12-31T23:59:59Z',
    });

    assert.throws(() => {
      createSession(testDb, {
        userId: user.id,
        token: 'unique-session',
        expiresAt: '2025-12-31T23:59:59Z',
      });
    });
  });

  it('cascades delete when user is deleted', () => {
    const user = createUser(testDb, { email: 'cascade@example.com' });
    assert.ok(user);

    createSession(testDb, {
      userId: user.id,
      token: 'cascade-session',
      expiresAt: '2025-12-31T23:59:59Z',
    });

    // Enable foreign keys for cascade
    testDb.pragma('foreign_keys = ON');

    deleteUser(testDb, user.id);

    const orphanSession = getSessionByToken(testDb, 'cascade-session');
    assert.equal(orphanSession, null);
  });
});
