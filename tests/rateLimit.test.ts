import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  checkRateLimit,
  clearAllRateLimits,
  resetRateLimit,
  getClientIp,
} from '../lib/rateLimit';

beforeEach(() => {
  clearAllRateLimits();
});

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const config = { maxRequests: 5, windowMs: 60000 };
    const result = checkRateLimit('test-key', config);
    assert.equal(result.success, true);
    assert.equal(result.remaining, 4);
  });

  it('blocks requests over the limit', () => {
    const config = { maxRequests: 3, windowMs: 60000 };
    checkRateLimit('test-key-2', config);
    checkRateLimit('test-key-2', config);
    checkRateLimit('test-key-2', config);
    const result = checkRateLimit('test-key-2', config);
    assert.equal(result.success, false);
    assert.equal(result.remaining, 0);
    assert.ok(result.retryAfterMs > 0);
  });

  it('tracks different keys independently', () => {
    const config = { maxRequests: 1, windowMs: 60000 };
    checkRateLimit('key-a', config);
    const resultA = checkRateLimit('key-a', config);
    const resultB = checkRateLimit('key-b', config);
    assert.equal(resultA.success, false);
    assert.equal(resultB.success, true);
  });
});

describe('resetRateLimit', () => {
  it('clears rate limit for a specific key', () => {
    const config = { maxRequests: 1, windowMs: 60000 };
    checkRateLimit('reset-key', config);
    const blocked = checkRateLimit('reset-key', config);
    assert.equal(blocked.success, false);

    resetRateLimit('reset-key');
    const afterReset = checkRateLimit('reset-key', config);
    assert.equal(afterReset.success, true);
  });
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } };
    const ip = getClientIp(req);
    assert.equal(ip, '1.2.3.4');
  });

  it('extracts IP from x-real-ip', () => {
    const req = { headers: { 'x-real-ip': '10.0.0.1' } };
    const ip = getClientIp(req);
    assert.equal(ip, '10.0.0.1');
  });

  it('falls back to socket address', () => {
    const req = { headers: {}, socket: { remoteAddress: '192.168.1.1' } };
    const ip = getClientIp(req);
    assert.equal(ip, '192.168.1.1');
  });

  it('returns unknown when no IP found', () => {
    const req = { headers: {} };
    const ip = getClientIp(req);
    assert.equal(ip, 'unknown');
  });
});
