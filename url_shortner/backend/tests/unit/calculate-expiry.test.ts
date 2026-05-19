import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateExpiresAt } from '../../src/utils/calculate-expiry.js';

describe('calculateExpiresAt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 1 hour for anonymous tier', () => {
    const expiresAt = calculateExpiresAt('anonymous');
    expect(expiresAt.toISOString()).toBe('2024-01-01T01:00:00.000Z');
  });

  it('should return 24 hours for registered tier', () => {
    const expiresAt = calculateExpiresAt('registered');
    expect(expiresAt.toISOString()).toBe('2024-01-02T00:00:00.000Z');
  });

  it('should return 30 days for premium tier', () => {
    const expiresAt = calculateExpiresAt('premium');
    // January has 31 days. 30 days from Jan 1 is Jan 31.
    expect(expiresAt.toISOString()).toBe('2024-01-31T00:00:00.000Z');
  });
});
