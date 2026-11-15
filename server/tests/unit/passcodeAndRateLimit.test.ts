import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePasscode,
  validatePasscodeFormat,
  hashPasscode,
  verifyPasscode,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  clearRateLimitStore,
  PASSCODE_CHARS
} from '../../src/services/passcodeService.js';

describe('Passcode & Rate Limiting Unit Tests', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it('should generate a 6-character passcode using unambiguous characters', () => {
    const code = generatePasscode(6);
    expect(code).toHaveLength(6);
    for (const char of code) {
      expect(PASSCODE_CHARS).toContain(char);
    }
  });

  it('should generate valid 8-character passcodes when requested', () => {
    const code = generatePasscode(8);
    expect(code).toHaveLength(8);
  });

  it('should throw an error for invalid passcode lengths', () => {
    expect(() => generatePasscode(4)).toThrow();
    expect(() => generatePasscode(10)).toThrow();
  });

  it('should validate passcode formats correctly', () => {
    expect(validatePasscodeFormat('CARE26')).toBe(true);
    expect(validatePasscodeFormat('K9M2P4')).toBe(true);
    expect(validatePasscodeFormat('123')).toBe(false); // too short
    expect(validatePasscodeFormat('ABCDEFGHIJK')).toBe(false); // too long
    expect(validatePasscodeFormat('CARE-2026')).toBe(true); // hyphens supported
    expect(validatePasscodeFormat('CARE2026')).toBe(true);
    expect(validatePasscodeFormat('CARE#2026!')).toBe(false); // special characters rejected
  });

  it('should hash and verify passcodes using bcrypt with constant-time check', async () => {
    const raw = 'SEC789';
    const hash = await hashPasscode(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix

    const isValid = await verifyPasscode(raw, hash);
    expect(isValid).toBe(true);

    const isWrong = await verifyPasscode('WRONG1', hash);
    expect(isWrong).toBe(false);
  });

  it('should enforce 5-attempt rate-limiting lockout', () => {
    const id = 'test-user-ip-123';

    // 1st to 4th failed attempts - not locked
    for (let i = 1; i <= 4; i++) {
      const res = recordFailedAttempt(id);
      expect(res.locked).toBe(false);
    }

    // Check rate limit state
    const midCheck = checkRateLimit(id);
    expect(midCheck.allowed).toBe(true);
    expect(midCheck.remainingAttempts).toBe(1);

    // 5th failed attempt - should lock!
    const fifth = recordFailedAttempt(id);
    expect(fifth.locked).toBe(true);
    expect(fifth.retryAfterSeconds).toBeGreaterThan(0);

    // Subsequent check should be blocked
    const lockedCheck = checkRateLimit(id);
    expect(lockedCheck.allowed).toBe(false);
    expect(lockedCheck.remainingAttempts).toBe(0);
    expect(lockedCheck.retryAfterSeconds).toBeGreaterThan(0);

    // Reset rate limit
    resetRateLimit(id);
    const postReset = checkRateLimit(id);
    expect(postReset.allowed).toBe(true);
    expect(postReset.remainingAttempts).toBe(5);
  });
});
