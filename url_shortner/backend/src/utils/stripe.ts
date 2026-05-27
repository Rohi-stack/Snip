import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

if (!STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY is not set — payment features will be disabled.');
}

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
  : null;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Tier price amounts in smallest currency unit (paise for INR)
export const TIER_PRICES: Record<string, { amount: number; label: string }> = {
  starter: { amount: 200,  label: 'Starter' },  // ₹2
  premium:  { amount: 500,  label: 'Premium' },  // ₹5
};

export function resolveTierLabel(amountPaise: number): string {
  if (amountPaise <= 200) return 'Starter';
  if (amountPaise <= 500) return 'Premium';
  return 'Premium';
}
