# Testing Plan

Last updated: 2026-07-23

The repository has an active Vitest suite covering core security, routing,
accessibility, data-consistency, caching, recurrence, and deployment contracts.
Run the bounded suite with `pnpm test:run`; do not use `pnpm test` in CI because
it starts watch mode.

## Framework and conventions

- **Runner:** Vitest with happy-dom for DOM-facing tests.
- **Location:** Co-located `*.test.ts` or `*.test.tsx` files.
- **Style:** Use real inputs for pure functions and narrow mocks at external
  boundaries. Test observable contracts, not implementation trivia.
- **Workers integration:** D1/R2/Cloudflare integration tests are still a gap.
  When added, use `@cloudflare/vitest-pool-workers` in a separate configuration;
  do not make the default unit suite depend on production credentials.
- **Production services:** Tests must never submit to, authenticate against, or
  mutate production Google, Cloudflare, Gmail, D1, or R2 resources.

## Current automated coverage

The suite currently verifies these high-risk areas:

- Signed unlock-cookie lifetime and tamper-resistant server expiry.
- PBKDF2 password hashing, verification, legacy comparison, and malformed input.
- Approved Google Drive root ancestry, protected download behavior, and safe
  preview MIME handling.
- Registered recording-folder ancestry, including year subfolders, locked
  boundaries, and cyclic/unregistered trees.
- Shared D1 rate-limit behavior, production fail-closed handling, and cleanup.
- Authentication redirect host allowlisting and local-admin bypass boundaries.
- HTTPS and hosted-district middleware routing.
- Event recurrence expansion, ICS timing, modified multi-day occurrences,
  atomic event/type writes, and public submission idempotency.
- Flyer authorization and retry-state behavior.
- Cache coalescing, shared refresh leases, and stale fallback behavior.
- Accessibility contracts for the global mobile header, district skip target,
  district metadata, contact required state, document cards, month calendar,
  multi-select, and PDF dialog.
- Monthly-report escaping and deployment ordering.

This list is an inventory, not a coverage percentage. Passing tests do not prove
WCAG conformance, production capacity, or absence of security defects.

## Required checks by change type

### Every source change

1. Run the smallest focused Vitest files that exercise the changed behavior.
2. Run `pnpm typecheck`.
3. Run ESLint on touched files and record any pre-existing warnings.
4. Run `git diff --check`.

### Dependency or runtime changes

Also run:

- `pnpm install --frozen-lockfile`
- `pnpm audit --prod --json`
- `pnpm audit --dev --json`
- `pnpm test:run`
- `pnpm build`

### D1 schema or query changes

- Validate new migration SQL in an isolated local database.
- Add a rollback/failure-boundary test when multiple rows must change together.
- Verify legacy columns and relation tables remain synchronized.
- Apply migrations to a disposable local database before staging deployment.

### Accessibility changes

- Add a DOM-level semantic/focus regression test where practical.
- Manually verify keyboard order, visible focus, 200% zoom/reflow, and reduced
  motion on the affected route.
- For semantic changes, include NVDA/Firefox and VoiceOver/Safari follow-up.

### Security boundary changes

- Include negative tests before positive tests.
- Cover cross-resource token reuse, outside-root IDs, malformed input, expired
  credentials/tokens, and upstream failure.
- Assert protected responses are not cacheable and do not expose raw errors.

## Remaining priority gaps

### Priority 0 — public action and password-abuse integration

- Contact and Grapevine actions: validation, rate limit, reCAPTCHA failure/score,
  Gmail failure sanitization, and no-side-effect assertions.
- Password unlock actions: threshold, cooldown/reset, oversize password,
  distinct-resource keys, multi-isolate storage, and fail-closed behavior.
- Upload tokens: expiration, cross-event reuse, size/MIME rejection, and R2
  failure compensation.

### Priority 1 — middleware and authentication matrix

- District site missing/disabled/external-redirect behavior.
- Hosted district admin/login/API rewrites with callback preservation.
- Locale cookie/header behavior and non-district bypasses.
- Dynamic district configuration and OAuth callback integration in an isolated
  environment.

### Priority 2 — API route contracts

- Admin file routes: unauthenticated, wrong-role, invalid folder, and `no-store`.
- Reports and flyers: malformed parameters, missing metadata/object, content
  disposition, and cache policy.
- Events/GDrive APIs: generic public errors, request IDs, timeout behavior, and
  bounded pagination.
- File proxy: password/cookie/token matrix, upstream timeout, filename
  sanitization, and large/streamed content.

### Priority 3 — Workers integration

- Apply all D1 migrations in a Workers-compatible ephemeral database.
- Exercise R2 upload/delete compensation without live buckets.
- Verify cache API behavior and private/public response separation.
- Run scheduled-worker fixtures for monthly reports and uptime checks.

### Priority 4 — browser and assistive-technology regression

- Core journeys at mobile and desktop widths using a successful production
  build.
- Keyboard and screen-reader checks for navigation, contact form, calendar,
  document viewers, recordings unlock, and admin login.
- Bounded Core Web Vitals samples with environment and variability recorded.

## CI gate target

The intended merge gate is:

```bash
pnpm install --frozen-lockfile
pnpm lint -- --max-warnings=0
pnpm typecheck
pnpm test:run
pnpm build
```

Until the lint warning backlog is eliminated, the repository's existing
`pnpm lint` command remains the operative gate. Do not weaken rules to reach
zero; fix or narrowly justify each warning.
