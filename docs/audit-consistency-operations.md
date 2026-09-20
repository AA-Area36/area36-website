# Audit consistency changes, September 2026

Apply additive D1 migration `0031_audit_consistency.sql` before the updated Worker. It adds an indexed case-insensitive metadata category lookup, an object cleanup queue, quorum submission reservations, creation attempts and a singleton featured-event pointer. Existing migrations must run first. No existing member records are changed. Staging uses shared bindings: application verification must use local fixtures unless an authorized operator explicitly arranges a production-data-safe staging exercise.

## Quorum operations

Check-in keeps an 18-character random attempt ID across retries and tab reloads using session storage (with an in-memory fallback if unavailable). D1 atomically binds that ID to a hash of the validated registration, original timestamp and a unique Sheets row. Retries write the same row, not another append. CAPTCHA tokens are excluded from the hash. Changing registration details after an uncertain attempt is rejected rather than overwriting an attendee. An existing matching Sheets ID is treated as committed; subsequent administrator corrections are preserved. Grid expansion only appends rows.

The private submissions sheet must retain its row order and submission IDs. Do not physically sort, insert or delete attendance rows while check-in is open; use filter views and application correction controls. An unexpected occupied reservation fails closed. Concurrent external edits cannot be made transactional with D1; an operator must reconcile the reservation with the Sheet before retrying. The form stores only its random attempt ID, not attendance PII. After a reload, enter the same details for a retry; if session storage was disabled or the tab was closed, ask an administrator to verify attendance before starting another attempt.

Creation keeps a random event key and its form draft in this tab's session storage until confirmed. Configuration and owner-token preflight happen before claiming it. Definitive Drive create rejection (400/401/403/404/429) releases the claim. Transport errors and 5xx preserve it because a file may have been committed. Retrying discovers the same key; a partially initialized spreadsheet is hidden from public/event-list reads and initialized idempotently before its status becomes open. No spreadsheet is deleted on ambiguous failure. Featured selection is one atomic D1 pointer, so competing selections cannot leave several featured events. A feature/cache failure after creation returns the committed event and an explicit warning.

If a creation remains unconfirmed, the admin UI shows its exact attempt key. Search the configured private Quorum folder's `a36QuorumEventKey` app property using that key (see `QUORUM_APP_PROPERTIES.eventKey` for the authoritative property name). If an initializing file exists, retry the original form to resume it. If no file exists, an operator must establish that all outstanding Google requests have completed before removing only that attempt's `quorum_creation_attempts` row and retrying the same key. Never clear all attempts, delete an uncertain spreadsheet, or issue another create while its outcome is unknown. No cleanup command is automated because absence from a single Drive listing does not prove creation failed.

## Object cleanup and moderation

Flyer/subscription metadata deletion and per-object cleanup enqueue happen in one D1 batch. Immediate R2 deletion is best effort; the existing scheduled Worker drains up to 25 queued objects per invocation, keeping failed work for retry. R2 deletion is idempotent. Denied-event flyers use the existing event-prefix cleanup queue and lose their public metadata in the denial transaction. Anonymous flyer reads require a linked approved event and use private/no-store responses so status changes are checked on the next read. Area reviewers can preview pending flyers.

Admin flyer uploads reuse public compensated persistence. If metadata storage fails, cleanup is queued and attempted immediately, with direct R2 compensation if D1 itself is unavailable. A simultaneous D1 and R2 outage can still leave an unregistered object; provider-level inventory reconciliation is a manual follow-up. Signature checks recognize PDF/JPEG/PNG/GIF/WebP headers but are not malware/content scanning.

## Protected content and browser policy

File passwords establish an HttpOnly cookie; URL bearer tokens no longer authorize preview/download. Missing signing configuration fails the unlock action. Recording responses are private/no-store and server-filtered using current registered folders and signed cookie access. Locked shells carry public registry IDs/names only; Drive IDs, recording titles, details, years and counts stay hidden. Browser refetches after unlock bypass request sharing and ignore older in-flight results.

CSP is enforced, with same-origin frame ancestry specifically allowed on file previews. Inline script/style allowance remains necessary for the current cached Next bootstrap; the policy does not block inline injection. A nonce design would require coordinating Next rendering with shared HTML caching. There is no CSP telemetry sink; enforcement fixes the former observation-only policy without collecting browsing data. Validate reCAPTCHA, protected PDF/media flows and error states on staging before promotion.

## Remaining human checks

Verify VoiceOver/Safari and NVDA/Firefox focus and announcements, forced colors, zoom/reflow, real reCAPTCHA and authenticated provider flows. Automated fixtures establish retry/authorization/data consistency behavior, not provider permissions, real-user performance or production capacity. Dark composed-state contrast is validated separately in the parent remediation evidence.
