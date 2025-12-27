/**
 * In-memory rate limiter for API endpoints.
 * Implements a sliding window algorithm to prevent brute force attacks.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
};

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

const startCleanup = () => {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  // Don't prevent process exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
};

startCleanup();

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
};

/**
 * Check if a request should be rate limited.
 * @param key Unique identifier (e.g., IP address or endpoint:IP)
 * @param config Rate limit configuration
 * @returns Result indicating if request is allowed
 */
export const checkRateLimit = (key: string, config: RateLimitConfig): RateLimitResult => {
  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window has expired
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt,
      retryAfterMs: 0,
    };
  }

  // Within window, check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }

  // Increment count
  entry.count += 1;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    retryAfterMs: 0,
  };
};

/**
 * Get client IP from request headers.
 * Handles common proxy headers.
 */
export const getClientIp = (req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string => {
  // Check X-Forwarded-For first (common for proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor).split(',');
    return ips[0].trim();
  }

  // Check X-Real-IP (nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to socket address
  return req.socket?.remoteAddress ?? 'unknown';
};

// Preset configurations for common use cases
export const RATE_LIMIT_PRESETS = {
  /** Login endpoint: 5 attempts per 15 minutes */
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  /** Share creation: 10 per hour */
  shareCreate: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  /** General API: 100 per minute */
  api: { maxRequests: 100, windowMs: 60 * 1000 },
} as const;

/**
 * Reset rate limit for a key (useful for testing or admin override).
 */
export const resetRateLimit = (key: string): void => {
  store.delete(key);
};

/**
 * Clear all rate limit entries (useful for testing).
 */
export const clearAllRateLimits = (): void => {
  store.clear();
};
