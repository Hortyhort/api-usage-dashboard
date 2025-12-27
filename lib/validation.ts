/**
 * Input validation utilities.
 * Lightweight validation without external dependencies.
 */

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Validate login request body.
 */
export const validateLoginInput = (
  body: unknown
): ValidationResult<{ password: string }> => {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be an object' };
  }

  const { password } = body as Record<string, unknown>;

  if (typeof password !== 'string') {
    return { success: false, error: 'Password must be a string' };
  }

  if (password.length === 0) {
    return { success: false, error: 'Password is required' };
  }

  if (password.length > 256) {
    return { success: false, error: 'Password too long' };
  }

  return { success: true, data: { password } };
};

/**
 * Validate share creation request body.
 */
export const validateShareInput = (
  body: unknown
): ValidationResult<{ expiresInHours: number; password?: string }> => {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be an object' };
  }

  const { expiresInHours, password } = body as Record<string, unknown>;

  // Validate expiresInHours
  const hours = Number(expiresInHours);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
    return { success: false, error: 'expiresInHours must be between 1 and 168' };
  }

  // Validate password if provided
  if (password !== undefined && password !== null) {
    if (typeof password !== 'string') {
      return { success: false, error: 'Password must be a string' };
    }
    if (password.length > 256) {
      return { success: false, error: 'Password too long' };
    }
  }

  return {
    success: true,
    data: {
      expiresInHours: hours,
      password: typeof password === 'string' && password.length > 0 ? password : undefined,
    },
  };
};

/**
 * Validate share token format.
 */
export const validateShareToken = (token: unknown): ValidationResult<string> => {
  if (typeof token !== 'string') {
    return { success: false, error: 'Share token must be a string' };
  }

  // Token format: base64url.base64url (payload.signature)
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { success: false, error: 'Invalid token format' };
  }

  // Check for valid base64url characters
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  if (!base64urlRegex.test(parts[0]) || !base64urlRegex.test(parts[1])) {
    return { success: false, error: 'Invalid token encoding' };
  }

  // Reasonable length limits (prevent DoS via huge tokens)
  if (token.length > 2048) {
    return { success: false, error: 'Token too long' };
  }

  return { success: true, data: token };
};

/**
 * Sanitize a string for safe logging (redact sensitive data).
 */
export const sanitizeForLog = (value: string, visibleChars = 4): string => {
  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length);
  }
  const start = value.slice(0, visibleChars);
  const end = value.slice(-visibleChars);
  return `${start}${'*'.repeat(8)}${end}`;
};
