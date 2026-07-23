# OXZI Launch Checklist

## Pre-Release Verification

- [x] All CI checks pass (`npm run ci`).
- [x] `npm run review` produces a complete redacted package.
- [x] `.env.example` is up-to-date and committed.
- [x] `README.md` is updated with latest commands and status.
- [x] `CURRENT.md` reflects final state with Step 14 complete.
- [x] Version bumped to `1.0.0` in `package.json`.
- [x] Git tag `v1.0.0` created and pushed.
- [x] `docs/performance.md` documents engine characteristics.
- [x] Rate limiting is active in middleware (60 req/min per IP).
- [x] Environment validation covers all required variables.
- [x] Integration tests cover full pipeline flow.
- [x] Benchmark tests define and validate thresholds.

## Documentation

- [x] `README.md` — updated with auth, DB setup, and env instructions.
- [x] `docs/performance.md` — engine benchmarks and deployment requirements.
- [x] `.env.example` — documents all required environment variables.
- [x] `CODEX_LOCAL_SETUP.md` — should be reviewed for currency.

## Security

- [x] All secrets loaded from environment (`.env.local`), not hardcoded.
- [x] Input validated with Zod schemas at API boundaries.
- [x] Rate limiting prevents API abuse.
- [x] Review package redacts credentials and secrets.
- [x] JWT tokens expire after 7 days.
- [x] Passwords hashed with bcrypt (10 rounds).

## Deployment

- [ ] (Optional) Vercel project configured.
- [ ] (Optional) PostgreSQL migration for production.
- [ ] (Optional) Sentry/OTel monitoring configured.
- [ ] (Optional) Stripe integration configured for billing.

## Post-Release

- [ ] Monitor error rates and performance.
- [ ] Collect user feedback on UI and workflow.
- [ ] Plan Step 13 deferred items (Stripe billing, real-time multiplayer).
