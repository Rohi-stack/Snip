# Test User Scenarios

Each `.ts` file in this directory describes a named test scenario (user journey).

## Structure
```
scenarios/
  guest-quota-flow.ts      — Anonymous user hits quota, sees upgrade prompt
  free-user-flow.ts        — Signup → create links → dashboard → logout/login
  starter-subscription.ts  — Subscribe at ₹2, generate QR, download PNG/SVG
  premium-analytics.ts     — Full analytics, billing page, premium alias system
```

## Running Scenarios
These are referenced by E2E tests in `frontend/tests/e2e/`.
Seed data is in `../seed/test-users.ts`.
