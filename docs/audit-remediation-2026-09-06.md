# September 5 audit remediation

This release addresses 30 of the audit's 31 confirmed findings and adds fixes or safeguards for its four validation items. DEP-005 remains an upstream compatibility constraint. The original audit remains a historical baseline.

## Changes and regression coverage

| Audit IDs | Result | Validation |
| --- | --- | --- |
| PERF-001 | Reject nonexistent, reversed and over-731-day district-meeting ranges before reading content; use private locale-sensitive caching. | API tests and production-server 400/200 boundary checks. |
| SEC-008 | Generic file download, HEAD and preview authorization checks registered recording-folder locks throughout bounded ancestor traversal. | Locked/unlocked folder and allowed-root regression tests. |
| A11Y-001 | Quorum required fields expose errors, descriptions and a focused error summary; obtain the CAPTCHA token before final submission validation. | Component tests exercise invalid feedback and one successful submission. |
| A11Y-002 | Document cards can shrink at narrow widths with long filenames. | 320px production browser fixture: page width and scroll width both 320px. |
| BUG-006, BUG-008 | Calendar iteration and event duration use date-only UTC arithmetic, avoiding stalled positive-offset loops and DST truncation. | Date/recurrence tests plus UTC, Chicago and Auckland browser navigation. |
| DEP-001, DEP-004 | Deployment tests follow the production script and documentation uses the correct lint command. Preserve the existing migration-before-deploy workflow. | Full suite and zero-warning lint. |
| DEP-002 | Test corrections and quorum actions directly, including validation, rate limits, CAPTCHA, persistence and notification/cache failures. | Direct action regression tests. |
| PERF-002 | Match the loading calendar's hero, controls and body geometry to the loaded view. | Three cold and three warm throttled mobile production navigations: CLS 0 in all samples (audit cold median 0.82635). |
| PERF-003 | Hydrate each event relationship in batches of at most 100 IDs. | Real Drizzle query parameter checks at 99, 100, 101 and 201 IDs. |
| SEC-001 | Authorized raw HTML/JSON reports use private, no-store browser caching and no-store Cloudflare CDN caching. | Anonymous denial and authorized cache-header tests. |
| SEC-002 | An anonymous duplicate email cannot replace a saved corrections volunteer's details. | Matching normalized email causes no update or notification. |
| SEC-003 | Public Sheets submissions use RAW input, preserving strings as data. | Existing quorum/Sheets integration coverage and source review. |
| SEC-004 | All affected forms share HTTP-status, finite-score, threshold and exact-action CAPTCHA verification. | Shared verifier and direct action tests; checked client/server action names. |
| SEC-005 | Escape event dates, start times and type labels when interpolating monthly-report HTML, including previously saved values. | Renderer source review and admin validation regression tests. |
| SEC-007 | Keep idempotent D1 retries; deny production submissions when shared rate-limit storage remains unavailable. Isolate fallback is limited to nonproduction. | Concurrent, ambiguous-retry, failure and development fallback tests; migration 0029 applies locally. |
| SEC-009 | Reject control characters in all Gmail header values before token acquisition; encode/fold UTF-8 subjects safely. | Injection rejection, recipient preservation and Unicode round-trip tests. |
| PERF-004 | Include the serving Cloudflare colo in shared cache-fill leases; use isolate coordination when colo is unavailable. | Same-region/different-region lease and no-region tests; context typing matches installed OpenNext API. |
| A11Y-003, A11Y-004, A11Y-006 | Name event filters, underline district help links and repair heading order. Calendar column headers contain full screen-reader text. | Component assertions and fresh home/events axe scans without violations in three time zones. |
| BUG-001 | Validate actual calendar dates and ordering on public and admin event edits, including recurring series and occurrences. | Admin malformed-date/time/type tests reject before database access; date boundary tests. |
| BUG-002 | Migration 0030 atomically advances a public HTML revision for inserts, updates and deletes across 14 public tables; select the revision on each eligible navigation. | 42 trigger operations, replay/rollback checks, multi-host/locale cache invalidation and missing-revision fallback tests; all migrations applied to fresh local D1. |
| BUG-003 | Recording admin passes only editable folder identity/name fields to the client and describes the actual seven-day unlock lifetime. | Type checking and source review. |
| BUG-004 | Do not cache database failures as missing districts; return retryable, uncached 503 instead of disabled-site redirects. | Fault/recovery tests and middleware review. |
| BUG-005 | Occurrence controls surface returned failures and thrown errors, and always clear pending state. | Source review, type checking and full suite. |
| BUG-009 | Preserve a saved corrections signup after delivery failure, but explicitly explain that the coordinator was not notified. Quorum cache invalidation failure likewise does not invite duplicate persistence. | Direct action tests cover returned failures and exceptions after a successful save. |
| BUG-010 | Convert the final local recurrence day to UTC using the event's time zone for timed iCalendar UNTIL values. | Winter/summer cutoff regression tests. |
| BUG-011 | Select and expand recurring events whose final multi-day or modified occurrence overlaps a requested range. | Ongoing normal and extended-exception range tests. |
| DEP-006 | Install esbuild in Vite 8's compatible range; update fflate and Browserslist lockfile resolutions. | Frozen install, build, XLSX tests and production audit. |
| SEC-006 | Development admin bypass requires the explicit LOCAL_ADMIN_BYPASS flag and a nonproduction environment; Host alone cannot enable it. | Bypass matrix tests. |
| A11Y-005 | Provide exact leaderboard data in a screen-reader table, including districts beyond the chart's top ten; label the native confirmation file input and its errors. | Leaderboard and upload component tests. |
| BUG-007 | Parse district request boundaries at local midnight and tolerate malformed locale cookies. | Inclusive final-day route tests, including the Auckland test run. |

The existing District 14 change moving its September 2026 meeting from September 7 to September 14 is retained with stable occurrence identity and regression coverage.

## Release validation

- `pnpm typecheck`: passed.
- `pnpm lint`: passed with zero warnings.
- `pnpm test:run`: 91 files, 327 tests passed.
- Targeted date/API suite with `TZ=Pacific/Auckland`: 5 files, 21 tests passed.
- Fresh Next.js production build and `pnpm exec opennextjs-cloudflare build`: passed.
- All migrations, including 0029 and 0030, applied to fresh local D1 successfully.
- `pnpm audit --prod --json`: zero advisories on September 6, 2026.
- Headless Chrome 152 / Playwright 1.62.1: 320px home and Events with synthetic long filenames and a multi-day event in UTC, America/Chicago and Pacific/Auckland; no overflow, no axe 4.13 violations, and next-month navigation works.
- Events performance lab: 375×812 mobile, 4× CPU slowdown, 150ms latency, 1.6Mbps down / 0.75Mbps up, three cold and three warm samples. Cold median LCP 2.268s; warm median 0.352s; CLS 0 in every sample. These are local lab results, not production field metrics.

Build/browser checks used an isolated copy without environment secrets or existing Cloudflare state. Browser external requests were blocked and form submissions were not sent. No production database, Google service or deployment was changed.

## Remaining constraints and rollout

DEP-005 is open: ESLint 9 is outside upstream maintenance, but the current Next ESLint configuration depends on React, import and jsx-a11y plugins whose published peer ranges do not yet support ESLint 10. Retain the working lint gate until compatible releases exist; do not force unsupported peers or disable rules. Development-tool advisories remain and are not evidence of a reachable production vulnerability.

Use `pnpm deploy:production` for the eventual release so migrations 0029 and 0030 precede Worker deployment. A missing public HTML revision bypasses the outer cache; unavailable shared rate-limit storage denies protected submissions in production. The revision covers database mutations, while separate API/data caches retain their existing invalidation and TTL behavior; direct Google edits are outside its scope. Existing pre-release cached HTML can expire normally within its previous TTL.

Real multi-region Workers latency/capacity, authenticated assistive-technology journeys, and live provider delivery still require observation in the deployed environment. Component, synthetic D1 and loopback browser checks establish the tested behavior described above; they do not establish production capacity or complete WCAG conformance. The existing Next.js middleware deprecation warning also remains pending the compatible OpenNext migration path.
