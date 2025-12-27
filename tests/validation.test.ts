import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validateLoginInput,
  validateShareInput,
  validateShareToken,
  sanitizeForLog,
} from '../lib/validation';

describe('validateLoginInput', () => {
  it('accepts valid password', () => {
    const result = validateLoginInput({ password: 'test123' });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.password, 'test123');
    }
  });

  it('rejects non-object body', () => {
    const result = validateLoginInput(null);
    assert.equal(result.success, false);
  });

  it('rejects non-string password', () => {
    const result = validateLoginInput({ password: 123 });
    assert.equal(result.success, false);
  });

  it('rejects empty password', () => {
    const result = validateLoginInput({ password: '' });
    assert.equal(result.success, false);
  });

  it('rejects password over 256 chars', () => {
    const result = validateLoginInput({ password: 'a'.repeat(257) });
    assert.equal(result.success, false);
  });
});

describe('validateShareInput', () => {
  it('accepts valid input without password', () => {
    const result = validateShareInput({ expiresInHours: 24 });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.expiresInHours, 24);
      assert.equal(result.data.password, undefined);
    }
  });

  it('accepts valid input with password', () => {
    const result = validateShareInput({ expiresInHours: 1, password: 'secret' });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.expiresInHours, 1);
      assert.equal(result.data.password, 'secret');
    }
  });

  it('rejects invalid expiresInHours', () => {
    const result = validateShareInput({ expiresInHours: 0 });
    assert.equal(result.success, false);
  });

  it('rejects expiresInHours over 168', () => {
    const result = validateShareInput({ expiresInHours: 200 });
    assert.equal(result.success, false);
  });

  it('strips empty password', () => {
    const result = validateShareInput({ expiresInHours: 24, password: '' });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.password, undefined);
    }
  });
});

describe('validateShareToken', () => {
  it('accepts valid token format', () => {
    const result = validateShareToken('abc123.def456');
    assert.equal(result.success, true);
  });

  it('rejects non-string', () => {
    const result = validateShareToken(123);
    assert.equal(result.success, false);
  });

  it('rejects single part token', () => {
    const result = validateShareToken('abc123');
    assert.equal(result.success, false);
  });

  it('rejects invalid characters', () => {
    const result = validateShareToken('abc!@#.def456');
    assert.equal(result.success, false);
  });
});

describe('sanitizeForLog', () => {
  it('redacts middle of string', () => {
    const result = sanitizeForLog('my-secret-password');
    assert.equal(result, 'my-s********word');
  });

  it('fully redacts short strings', () => {
    const result = sanitizeForLog('abc');
    assert.equal(result, '***');
  });
});
