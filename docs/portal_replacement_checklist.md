## Portal Replacement – Section Checklists

### Section 00 – Execution Protocol
- [x] Feature flags scaffolded in `lib/feature-flags.ts`
- [x] Env typings updated in `env.d.ts`
- [ ] Minimal smoke-test checklist committed

Smoke tests (run per section changes):
- Build app without type errors: `npm run build`
- Basic auth flow loads login page
- Admin dashboard loads without runtime errors

### Section 01 – Database & RLS
- [ ] Migration adds `portal_invitations` and `portal_access_grants`
- [ ] `request_customer_id()` reads from `user_profiles` via `auth.uid()`
- [ ] Policies updated on `customers`, `jobs`, `documents`, `payments`, `audit_logs`


