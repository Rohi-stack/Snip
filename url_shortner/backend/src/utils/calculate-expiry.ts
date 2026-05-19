import { TIER_LIMITS, type UserTier } from '../constants/url-tier.js';

export function calculateExpiresAt(tier: UserTier, from: Date = new Date()): Date {
  const { ttlMs } = TIER_LIMITS[tier];
  return new Date(from.getTime() + ttlMs);
}
