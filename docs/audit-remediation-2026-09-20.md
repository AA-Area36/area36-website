# September 19 audit remediation

This change set responds to the September 19 weekly audit on `staging`, starting at `008d70361d91580afc68d8b5aeef3e822499549a`. It is intended for one staging-to-main pull request, with no automatic merge. Historical audit reports are not rewritten.

## Finding map

| Audit ID | Remediation / verification |
| --- | --- |
| A11Y-008 | Quorum success receives focus; returning for another check-in restores the first field. Component regression test. |
| A11Y-009 | Not reproduced in the new production-browser scan. Exact dark-theme computed text colors and gradient endpoints checked; see browser evidence below. No speculative token change. |
| A11Y-010 | Prose links have a persistent underline, independent of hover/color. |
| A11Y-011 | Flyer errors use an alert and are associated with the upload controls; rejected uploads recover their pending state. |
| DEP-005 | ESLint 10.11.0 with the official compatibility layer preserves legacy plugin rules. A behavioral test checks React, accessibility, import and Next rule execution. |
| DEP-007 | Next and eslint-config-next aligned at 16.3.5; patched sharp and baseline-browser-mapping resolutions. |
| DEP-008 | Patched OpenNext/Wrangler, Vite/Vitest, Happy DOM, Drizzle Kit and affected transitive packages. Production and development advisories rechecked. |
| DEP-009 | Root Vitest gate fails when no tests are discovered. Positive suite plus negative no-match sentinel. |
| SEC-010 | Flyer GET checks approved-event ownership or Area-admin access, is non-cacheable, and uploads validate signatures. Denial queues storage cleanup. |
| SEC-011 | Password unlock returns tokenless URLs; file authorization uses the signed HttpOnly cookie, not query bearer tokens. |
| SEC-012 | Public Drive health is shallow and causes no Google request. |
| SEC-013 | Compatible CSP is enforced; preview route explicitly permits same-origin framing. Inline script/style allowances remain a documented compatibility limitation, not a claim of complete XSS prevention. |
| SEC-014 | Shared event URL validation accepts only explicit HTTP(S), excluding credentials and control characters. |
| SEC-015 | Recording details are filtered server-side using current registered-folder authorization; responses are private/no-store. Public category shells use application IDs rather than Drive IDs. |
| BUG-009 | Corrections success uses the server's actual result message, including partial notification outcomes. |
| BUG-012 | Monthly occurrence comparison starts at local midnight, retaining today's occurrence. |
| BUG-013 | Calendar selections serialize local calendar fields instead of UTC ISO slicing. |
| BUG-014 | Flyer object keys use UUIDs instead of timestamp/name combinations. |
| BUG-015 | Admin uploads reuse the shared compensated upload/persistence path. |
| BUG-016 | Stable creation attempts, recoverable initialization and an atomic featured pointer; committed creation returns success with a warning if secondary refresh/feature work fails. |
| BUG-017 | Stable check-in attempt IDs and atomic D1 row reservations make Sheets updates target the same row on retry. |
| BUG-018 | Public/admin event schemas share cross-field time, date, location and TBD invariants; actions persist parsed values. |
| BUG-019 | Occurrence mutations validate current series membership and guard the parent snapshot during the database write. |
| BUG-020 | Affected dialogs handle rejected promises and restore interactive state. |
| BUG-021 | Metadata deletion and durable cleanup enqueue are atomic; scheduled retries finish R2 deletion. |
| PERF-005 | Upcoming-event candidate SQL applies a conservative upper horizon before relationship hydration. |
| PERF-006 | Metadata lookup selects requested IDs in bounded batches; callers share a map; category lookups use an expression index. |
| PERF-007 | Concurrent public catalog consumers share one in-flight request. Private recording refreshes remain independent and discard stale responses. |
| PERF-008 | Drive detail enrichment uses bounded concurrency rather than serial requests. |

## Dependency compatibility

- ESLint's [official compatibility utilities](https://eslint.org/blog/2024/05/eslint-compatibility-utilities/) restore removed plugin rule-context APIs. An unwrapped ESLint 10 probe reproduced a React rule crash; `fixupConfigRules` repairs it without disabling the rule set.
- Exact peer exceptions are limited to the three currently installed legacy plugins and ESLint 10.11.0. They are not broad permission to accept future incompatible versions. Recheck/remove these exceptions when those plugins publish native support.
- The legacy Drizzle transitive esbuild override is scoped to `@esbuild-kit/core-utils`; no exposed development server is added. New direct Vite pins the compatible patched peer resolution.
- Next remains on the same major version. Follow the [Next 16 upgrade guidance](https://nextjs.org/docs/app/guides/upgrading/version-16) for future migrations. The deprecated middleware convention remains an informational follow-up, not a newly introduced defect.
- Actual Worker browser verification reproduced `__name is not defined` inside the serialized next-themes bootstrap. Wrangler now sets `keep_names: false`, following [OpenNext's documented guidance](https://opennext.js.org/cloudflare/howtos/keep_names); a configuration regression test protects this setting. Node-only builds do not expose this bundling failure.

## Local browser evidence

Secret-free isolated production build, Next 16.3.5; Playwright 1.62.1, Chromium 151, axe-core 4.11.0. Only loopback requests allowed. Local D1 migrations and a synthetic hosted district were used; no live Google credentials or protected production data.

- Home, About, Contact, Events, General Service Conference and admin login: zero automated WCAG A/AA violations in light and dark at 1365×768. The first unconfigured district visit correctly returned 404; a subsequent synthetic district route returned 200.
- Home, Events, Contact and the synthetic district: no page overflow at 320px or 1365px, in both themes. The first keyboard focus target is the skip link. Event submission dialog scans passed and Escape restored focus to its trigger.
- Conference navigation issued one request each for background materials, service resources and conference materials, replacing duplicate requests.
- Dark computed foregrounds were `lab(53.3277 -13.7061 -46.5518)` (primary) and `lab(59.426 -3.16039 -6.53952)` (muted), with opacity 1. Browser canvas conversion/compositing measured primary/background 5.316:1 and muted/background 6.308:1. Against the primary-at-5%-opacity gradient endpoint the ratios were 5.131:1 and 6.090:1. Axe reported no contrast violation in the checked states; gradient cases flagged for manual analysis were checked explicitly. This does not establish contrast for every possible content/state combination.

Automated checks do not establish WCAG conformance. Real screen-reader, native zoom, forced-colors, authenticated admin/provider and live CAPTCHA/OAuth checks remain manual acceptance work.

## Rollout and operational boundaries

Staging uses the same D1/R2 bindings as production. Do not perform synthetic form, upload, check-in or destructive tests on that preview. Browser mutation/retry tests use local fixtures/mocks only.

With explicit rollout approval, existing `0030_public_html_revision.sql` and new `0031_audit_consistency.sql` were applied to the shared D1 database before the staging application push. Wrangler reported both successful in about 12 ms total. Post-migration checks found no pending migrations, five expected tables, 42 revision triggers, one category index and the singleton revision row; the four operational queues/pointers were empty. Production and the old staging version both returned HTTP 200 afterward. A pre-migration Time Travel bookmark was captured. A rollback to the old application can leave these additive tables/indexes in place.

At rollout, check whether any configured CDN/proxy rule retained the old public flyer or recording API responses. If so, invalidate those legacy entries: a new no-store policy does not retroactively remove an already cached response. Recheck anonymous responses after deployment without reading protected metadata into logs.

Quorum retries retain a stable attempt key. Ambiguous external writes must be reconciled, not retried under a fresh identity. Sheets cannot provide a transaction with concurrent manual spreadsheet edits; administrators must avoid sorting/deleting/reordering submission rows during active check-in. The code detects an occupied reserved row rather than knowingly overwriting another check-in. See [the consistency operations guide](audit-consistency-operations.md) for recovery instructions.

CSP enforcement intentionally retains inline allowances required by the current cached Next rendering strategy. A nonce/hashing rollout is separate hardening and must account for HTML cache reuse; this change does not claim arbitrary inline injection would be blocked. No client CSP report body is ingested or logged.

## Verification record

Local verification on September 20:

- Frozen install passed without lockfile changes; production and development dependency audits each report zero advisories.
- Zero-warning lint and typecheck pass. Final full suite: 109 files / 396 tests passed. The deterministic no-test sentinel exits 1 as required. Sheets tests include committed-response-loss retries, occupied rows, preserved corrections/timestamps and grid expansion before out-of-bounds row access.
- Pacific/Auckland schema/SQL/recurrence subset: 3 files / 11 tests passed.
- Secret-free Next and OpenNext production builds pass. Fresh local D1 migrations pass. Actual Wrangler/workerd preview serves all seven representative routes successfully in both themes with zero JavaScript errors and zero automated accessibility violations after the theme-bundling correction.
- Worker preview at 320px and 1365px repeats the no-overflow, skip-link and event-dialog focus checks. The local scheduled handler drains a synthetic object-cleanup job; its queued count becomes zero.
- Build warnings remain for the deprecated middleware convention, older Workers compatibility date, and generated third-party duplicate object keys. They did not prevent these checks. pnpm blocked optional dependency lifecycle scripts in the isolated install; builds and workerd still operated successfully.

The approved remote migrations have been applied. The application push, staging deployment and PR are recorded in the pull request once their checks complete. Tests do not establish live Google integration or production capacity.

Pre-existing untracked audit reports, guide assets and the weekly audit prompt are excluded from this change set. No production member data or credentials belong in test fixtures or review artifacts.
