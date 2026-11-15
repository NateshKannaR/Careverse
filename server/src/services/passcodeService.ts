import bcrypt from 'bcryptjs';

// Unambiguous characters for elderly and family ease of reading and typing (excludes 0/O, 1/I/L)
export const PASSCODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const SALT_ROUNDS = 10;

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export const PASSCODE_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,   // 15 minutes
  lockoutMs: 15 * 60 * 1000,  // 15 minutes lockout
};

/**
 * Generate a cryptographically strong, human-readable passcode (default: 6 characters, min 6, max 8)
 */
export function generatePasscode(length: number = 6): string {
  if (length < 6 || length > 8) {
    throw new Error('Passcode length must be between 6 and 8 characters');
  }

  let code = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
      code += PASSCODE_CHARS[randomBytes[i] % PASSCODE_CHARS.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * PASSCODE_CHARS.length);
      code += PASSCODE_CHARS[idx];
    }
  }

  return code;
}

/**
 * Validate format of a raw passcode
 */
export function validatePasscodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length >= 6 && trimmed.length <= 10 && /^[A-Z0-9-]+$/.test(trimmed);
}

/**
 * Hash raw passcode before storing in database
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const normalized = passcode.trim().toUpperCase();
  return bcrypt.hash(normalized, SALT_ROUNDS);
}

/**
 * Verify raw passcode against stored bcrypt hash
 */
export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  if (!passcode || !hash) return false;
  const normalized = passcode.trim().toUpperCase();
  if (await bcrypt.compare(normalized, hash)) return true;
  // Also compare without hyphens
  const stripped = normalized.replace(/-/g, '');
  return bcrypt.compare(stripped, hash);
}

/**
 * Check if a passcode has expired
 */
export function isPasscodeExpired(expiresAt: string | Date): boolean {
  const expiry = new Date(expiresAt).getTime();
  return Date.now() > expiry;
}

/**
 * Calculate expiry date from hours (between 24h and 168h / 7d)
 */
export function calculateExpiryDate(hours: number = 48): string {
  const boundedHours = Math.max(24, Math.min(168, hours));
  const date = new Date(Date.now() + boundedHours * 60 * 60 * 1000);
  return date.toISOString();
}

/**
 * Check if an identifier is rate-limited
 */
export function checkRateLimit(
  identifier: string,
  config = PASSCODE_RATE_LIMIT
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record) {
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  // Check if locked
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  // If window expired, reset
  if (now - record.firstAttemptAt > config.windowMs) {
    rateLimitStore.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  const remaining = Math.max(0, config.maxAttempts - record.attempts);
  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
  };
}

/**
 * Record a failed attempt and trigger lockout if limit reached
 */
export function recordFailedAttempt(
  identifier: string,
  config = PASSCODE_RATE_LIMIT
): { locked: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  let record = rateLimitStore.get(identifier);

  if (!record || now - record.firstAttemptAt > config.windowMs) {
    record = {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: null,
    };
  } else {
    record.attempts += 1;
  }

  if (record.attempts >= config.maxAttempts) {
    record.lockedUntil = now + config.lockoutMs;
    rateLimitStore.set(identifier, record);
    return {
      locked: true,
      retryAfterSeconds: Math.ceil(config.lockoutMs / 1000),
    };
  }

  rateLimitStore.set(identifier, record);
  return {
    locked: false,
    retryAfterSeconds: 0,
  };
}

/**
 * Reset rate limit on success
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clear all records (useful for test resets)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
