/**
 * User tiers — auth layer will set this later; service defaults to anonymous.
 */
export type UserTier = 'anonymous' | 'registered' | 'premium';

export interface TierLimits {
  maxUrlsPerDay: number;
  ttlMs: number;
}

/** Business rules (quota enforcement comes later in service + repository). */
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  anonymous: {
    maxUrlsPerDay: 5,
    ttlMs: 60 * 60 * 1000, // 1 hour
  },
  registered: {
    maxUrlsPerDay: 10,
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  premium: {
    maxUrlsPerDay: 50,
    ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

export const DEFAULT_USER_TIER: UserTier = 'anonymous';
