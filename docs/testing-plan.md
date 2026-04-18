# Testing Plan

Last updated: 2026-04-18

The repo currently has zero tests. Vitest is now installed and configured (`vitest.config.ts`, `vitest.setup.ts`, scripts in `package.json`) but no test files have been written. This document lists the test cases that should be added, organized by file, prioritized by risk.

## Framework and conventions

- **Runner:** Vitest (happy-dom environment for anything touching the DOM).
- **Location:** co-located `*.test.ts` next to the file under test, or under a `__tests__/` folder alongside. Either works with the current `include: ["**/*.{test,spec}.{ts,tsx}"]` glob.
- **Style:** `describe` per exported function, one `it` per distinct behavior (not per input). Prefer real inputs to mocks when the dep is pure.
- **Workers-bound tests (D1, R2, Cloudflare env):** not yet configured. If/when those are needed, add `@cloudflare/vitest-pool-workers` and a second config (`vitest.workers.config.ts`) referencing `wrangler.jsonc`.

## Priority 0 — security-critical pure functions

These are small, fully deterministic, and protect the most sensitive code paths. Testing them is cheap and prevents regressions in exactly the files the security review flagged.

### `lib/security/unlock-cookie.ts`

- **`signUnlockCookie` + `verifyUnlockCookie` round-trip** — signing a list of IDs and immediately verifying returns the same IDs. Baseline sanity.
- **`verifyUnlockCookie` rejects tampered signature** — flip one char of the signature segment, expect `null`.
- **`verifyUnlockCookie` rejects tampered payload** — decode, mutate `ids`, re-encode without re-signing; expect `null`.
- **`verifyUnlockCookie` rejects malformed input** — missing `.` separator, non-base64 payload, non-JSON after decode — each returns `null`, never throws.
- **`verifyUnlockCookie` rejects wrong version** — payload with `v: 2` (future format) returns `null`.
- **`verifyUnlockCookie` rejects expired cookie** — *currently missing enforcement; see Security Review Finding 1. Write this test now so it fails red until the code is fixed.*
- **`signFileUnlockToken` uses v2 when global secret present, v3 when only file-scoped secret available** — assert the decoded payload's `v` field under both conditions.
- **`verifyFileUnlockToken` rejects expired token** — set `iat` to `Date.now() - FILE_UNLOCK_TOKEN_MAX_AGE_MS - 1000`; expect `null`. This path *is* covered in prod code; we're locking it down.
- **`verifyFileUnlockToken` rejects mismatched file ID** — sign for file A, verify against the token but expect the function to return `'A'` not something else. (Downstream check is at `lib/files/access.ts:84`; worth asserting the contract.)
- **All HMAC comparisons use `timingSafeEqual`** — inspect behavior by timing-diff test (hard to make stable) or just assert the function uses `timingSafeEqual` at the type level via a static check. Optional.

### `lib/security/passwords.ts`

- **`hashPassword` returns `pbkdf2$<iters>$<salt>$<hash>` format** — regex the string.
- **`hashPassword` is non-deterministic** — same input twice yields different hashes (salt randomness).
- **`verifyPassword` round-trip** — `verifyPassword(plain, hashPassword(plain))` is `true`.
- **`verifyPassword` rejects wrong password** — single-char difference returns `false`.
- **`verifyPassword` legacy plaintext fallback** — passing a stored value that does not start with `pbkdf2$` falls through to the timing-safe string compare. Covers the migration path for any legacy rows.
- **`verifyPassword` rejects malformed stored hash** — `pbkdf2$` prefix with wrong number of segments returns `false`, doesn't throw.
- **`verifyPassword` high-iteration fallback path** — set iterations above `WEBCRYPTO_PBKDF2_ITERATION_LIMIT` and confirm the HMAC-based PBKDF2 path produces the same hash as a reference implementation.

### `lib/files/access.ts`

Will need mocked D1 (`getDb`) and mocked `getDriveFileMetadata`. Wrap these as tiny seams or use `vi.mock`.

- **`validateFileAccess` — no metadata row** → `{ valid: true, requiresPassword: false }`.
- **`validateFileAccess` — metadata with no password** → same as above.
- **`validateFileAccess` — password set, no unlock token, no cookie** → `{ valid: false, requiresPassword: true, isUnlocked: false }`.
- **`validateFileAccess` — password set, valid unlock token for same fileId** → `{ valid: true, isUnlocked: true }`.
- **`validateFileAccess` — password set, unlock token for a different fileId** → `valid: false` (guards against token-swap across protected files).
- **`validateFileAccess` — password set, cookie unlocked** → `{ valid: true, isUnlocked: true }`.
- **`validateFileAccess` — GDrive returns no file** → `{ valid: false }` (non-existent file short-circuits, does not leak metadata existence).
- **`validateFileAccess` — GDrive throws** → caught, returns `{ valid: false, requiresPassword: false }` (don't leak the error).

### `lib/auth/index.ts`

The NextAuth setup itself is hard to test, but the pure helpers should be covered.

- **`isAllowedRedirectHost`** — exhaustive: `area36.org`, `www.area36.org`, `d1.area36.org` through `d27.area36.org` including `d10` (rejected), `d28.area36.org` (rejected), `evil.com` (rejected), `d1.area36.org.evil.com` (rejected — confirms regex anchors).
- **`isAllowedRedirectHost` case-insensitive** — `AREA36.org` allowed.
- Once Security Review Finding 5 is fixed, add a test against a mock of the district-sites table to confirm dynamic validation.

### `lib/auth/dev-bypass.ts`

- **`isLocalAdminBypassEnabled` returns false in production regardless of other vars** — set `NODE_ENV=production` and `LOCAL_ADMIN_BYPASS=1`; still `false`.
- **Explicit `LOCAL_ADMIN_BYPASS=0` wins over Host fallback.**
- **Explicit `LOCAL_ADMIN_BYPASS=1` wins in non-production.**
- **Fallback to Host header when no env var set** — `Host: localhost` in non-production returns `true` (documents the current, risky behavior; once Finding 7 is fixed, this test flips to expect `false`).
- **`createLocalAdminBypassSession` returns all districts 1..27 except 10** — derived from `districtNumbers`; lock it down.

## Priority 1 — middleware and routing

### `middleware.ts`

Runs on every request; bugs here cause total site outages.

- **Forces HTTPS** — request with `x-forwarded-proto: http` and non-localhost host returns 301 to `https://`.
- **Skips HTTPS upgrade for localhost** — no redirect when host contains `localhost`.
- **Non-district host passes through** — `area36.org` returns `NextResponse.next()` with `x-request-id` header set.
- **District host with no D1 config redirects to `/districts`.**
- **District host with `mode: "external_redirect"` and a URL returns 308** to `buildExternalRedirectTarget(...)`.
- **District host with `mode: "external_redirect"` and empty URL falls back** to the `/districts` redirect.
- **Hosted district — `/admin/login` redirects to area36.org with encoded callback** matching `https://d{n}.area36.org/admin`.
- **Hosted district — `/api/auth/*` redirects to area36.org** with original path + search preserved.
- **Hosted district — `/admin/foo` rewrites to `/admin/districts/{n}/foo`.**
- **Hosted district — public page rewrites to `/district-site/{n}/...`**, with `/` rewriting to `/district-site/{n}`.
- **Hosted district — `/api/*`, `/_next/*`, `/favicon.ico` are bypassed** (no rewrite).
- **Locale cookie set when missing, left alone when valid**, and `x-locale` header reflects the resolved value.
- **`buildExternalRedirectTarget` merges query strings** — incoming params override base params of the same name.
- **`buildExternalRedirectTarget` joins paths correctly** — base `/prefix`, incoming `/page?x=1` → `/prefix/page?x=1`. Edge cases: empty base, trailing/leading slashes.

### `lib/security/rate-limit.ts`

- **`checkRateLimit` allows first request, returns `ok: true` with decremented remaining.**
- **`checkRateLimit` blocks after `limit` requests in the same window.**
- **`checkRateLimit` resets after `windowMs` elapses** — use `vi.useFakeTimers()` to advance time past `resetAt`.
- **`checkRateLimit` keys are independent** — hitting `"a"` N times does not affect `"b"`.
- **`getClientIp` prefers `cf-connecting-ip` over `x-forwarded-for` and `x-real-ip`.**
- **`getClientIp` splits `x-forwarded-for` on `,`** and trims whitespace.
- **`getClientIp` returns `"unknown"` when no headers are present** (explicit fallback is itself a security-relevant contract).

## Priority 2 — API route contracts

These are integration-flavored and benefit most from the Workers pool once that's added, but the auth-check paths can be tested today by mocking `auth()`.

### `app/api/admin/files/route.ts`

- **`GET` returns 401 when unauthenticated.**
- **`GET` returns 401 when `session.user.email` is missing.**
- **`GET` returns 200 for authenticated user** (mock `auth()` to return a session).
- **`GET` with invalid `folder` query param** returns 400 or an empty tree — confirm which, lock it down.
- **Cache-Control is `no-store` on all responses** (defense against admin UI showing stale authorization state).

### `app/api/reports/[month]/route.ts`

- **`GET` rejects invalid month format** (e.g., `"2024-1"`, `"2024/01"`, `"abc"`) with 400.
- **`GET` rejects invalid format param** with 400.
- **`GET` returns 404 when report row missing.**
- **`GET` returns 404 when report row exists but `r2KeyJson`/`r2KeyHtml` is null.**
- **`GET` returns 404 when R2 object is missing despite metadata.**
- **Once Security Review Finding 4 is decided:** add an auth-gate test (401 if no admin session) or a code comment asserting the decision.

### `app/api/flyers/[...key]/route.ts`

- **Rejects keys not prefixed with `flyers/`** with 400.
- **Rejects empty key** with 400.
- **Returns 404 for unknown flyer.**
- **PDF content-type sets `Content-Disposition: inline` with sanitized filename.**
- **Non-PDF content-type does not set `Content-Disposition`** (current behavior, worth locking down).
- **Cache-Control matches expectation** (`public, max-age=3600, s-maxage=86400`).

### `app/api/gdrive/[type]/route.ts`

- **`GET` rejects invalid type** with 400 and a list of valid types in the error body.
- **`GET` passes `requestId` through to the response as `X-Request-Id`.**
- **Error path:** when the downstream fetch throws, response is 500 with `X-Request-Id` header. Once Finding 6 is fixed, assert the body does *not* contain the raw error message.
- **Cache TTLs are applied per type** — probably overkill for a unit test; skip or cover at integration level.

### `app/api/files/download/[fileId]/route.ts` and `app/api/files/preview/[fileId]/route.ts`

- **Unlocked file streams.**
- **Locked file without unlock token or cookie returns 403 / redirect (whichever is current).**
- **Locked file with valid unlock token streams.**
- **Locked file with unlock token for a *different* file returns 403** — this is the critical cross-file guard.
- **Filename in Content-Disposition is sanitized** via `sanitizeFilenameForHeader`.

## Priority 3 — server actions (forms)

These are public-facing endpoints that take user input. Each has Zod validation, reCAPTCHA, and rate limiting; each test set should cover all three.

### `app/(public)/contact/actions.ts`, `app/(public)/events/actions.ts`, `app/(public)/grapevine/actions.ts`

Per action:

- **Valid payload + valid reCAPTCHA + under rate limit** → success result.
- **Invalid payload** → Zod rejection, no side effects (no Gmail send, no D1 insert).
- **Invalid/missing reCAPTCHA token** → rejected before any DB or email call.
- **reCAPTCHA score below threshold** → rejected.
- **Rate-limit exhausted** → rejected with a specific error code.
- **Idempotency** — if the action re-runs with the same client-side nonce (if one exists), confirm no duplicate DB rows.
- **Upstream Gmail failure** → surfaced as a user-visible error without leaking the SMTP error text.

### `app/(public)/events/actions.ts` — flyer upload specifics

- **`verifyEventUploadToken` accepts valid token, rejects expired** (shares the same signing mechanics as file unlock tokens).
- **Upload token for event A cannot be used to upload to event B.**
- **Oversize file rejected** (check `lib/r2/` limits).
- **Wrong MIME type rejected.**

## Priority 4 — component tests (lower ROI, but worth having)

Only for components with non-trivial logic. Skip pure presentational shadcn wrappers.

- `components/committees/committee-files.tsx` — password prompt flow, unlock state.
- `app/(public)/resources/resource-viewer.tsx` — same pattern.
- Any form component using `react-hook-form` + `zod` — verify error display on bad input.

## What intentionally isn't in this plan

- Zod schemas themselves (library is trusted).
- Drizzle query builders (library is trusted; integration tests at the route level catch misuse).
- Pure shadcn components (`components/ui/**`) — no project-specific logic.
- NextAuth internals and Google OAuth callbacks — out of scope for unit tests.

## Suggested initial implementation order

1. `lib/security/passwords.ts` — easiest, no mocks, locks down the PBKDF2 contract.
2. `lib/security/unlock-cookie.ts` — same shape, also easy; will fail red on Finding 1 until the code is fixed, which is useful.
3. `lib/auth/index.ts` helpers — pure string logic.
4. `lib/security/rate-limit.ts` — fake timers only.
5. `middleware.ts` — biggest blast radius if broken; needs more scaffolding (request builder) but pays for itself quickly.
6. `lib/files/access.ts` — needs light mocking; do this after the smaller wins build momentum.
7. API route handlers — parallel to landing the Workers pool if full integration is desired.
