# Security Review

Last updated: 2026-04-18

Static review of `app/`, `lib/`, `middleware.ts`, and `app/api/**`. Each finding includes the file and line reference, the actual impact, and the suggested remediation. Findings are ordered by severity. No fixes have been applied.

## Summary

| # | Severity | Area | File |
| --- | --- | --- | --- |
| 1 | High | Session cookies | `lib/security/unlock-cookie.ts:161-188` |
| 2 | Medium | Dead code | `lib/files/access.ts:111-120` |
| 3 | Medium | Rate limiting | `lib/security/rate-limit.ts:15-36` |
| 4 | Medium | Auth / authorization | `app/api/reports/[month]/route.ts` |
| 5 | Medium | Redirect validation | `lib/auth/index.ts:124-131` |
| 6 | Low | Error disclosure | `app/api/gdrive/[type]/route.ts:571-591` |
| 7 | Low | Dev bypass | `lib/auth/dev-bypass.ts:10-21` |

Things the review explicitly cleared (so they do not reappear as pseudo-findings):

- `.env.local` is not committed. `.gitignore` covers `.env*`, and `git log --all -- .env.local` is empty.
- Live file-password verification (`lib/actions/verify-password.ts:48-99`) correctly uses PBKDF2 via `verifyPassword` from `lib/security/passwords.ts`.
- `verifyFileUnlockToken` (`lib/security/unlock-cookie.ts:125-159`) does enforce `FILE_UNLOCK_TOKEN_MAX_AGE_MS` at line 156. Only the multi-file session cookie is missing expiry (Finding 1).

---

## 1. `verifyUnlockCookie` does not validate `iat` expiry — High

**Where:** `lib/security/unlock-cookie.ts:161-188`.

**What:** The unlock-cookie payload carries `iat` (line 78) but `verifyUnlockCookie` only checks the HMAC signature (line 173-174) and payload shape (line 181). It never compares `iat` against the current time.

**Why it matters:** The browser enforces the 7-day `maxAge` set by `cookies.set` in `lib/files/session.ts:44` and `lib/recordings/session.ts`, but nothing on the server does. Two realistic attacks:

1. A cookie value that leaks (exfiltrated logs, support-tool screenshot, shared device) is indefinitely replayable. An attacker with the cookie string can access the unlocked files/recordings months later even after the victim's browser has dropped the cookie.
2. If `UNLOCK_COOKIE_SECRET` (or the fallback `AUTH_SECRET`) is ever rotated without server-side revocation, old tokens signed with the old secret are invalid — good. But if the secret leaks, an attacker can mint cookies with arbitrary `ids` and they will never expire.

Symmetric single-file tokens (`verifyFileUnlockToken`) correctly cap lifetime at `FILE_UNLOCK_TOKEN_MAX_AGE_MS` (7 days). The session cookie should match.

**Remediation:** Add an expiry check before returning the payload:

```ts
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
if (typeof payload.iat !== "number" || Date.now() - payload.iat > MAX_AGE_MS) {
  return null
}
```

---

## 2. Dead `verifyFilePassword` performs plaintext comparison — Medium

**Where:** `lib/files/access.ts:111-120`.

**What:** The function compares `metadata.password === password` directly, with no hashing and no timing-safe comparison. The identically named, actually-used function lives at `lib/actions/verify-password.ts:48` and does the right thing via `verifyPassword()` (PBKDF2, timing-safe). Grep confirms nothing imports the one in `lib/files/access.ts`.

**Why it matters:** Two concrete risks even though the code is currently dead:

1. A future developer looking for "verifyFilePassword" could autocomplete or import the wrong one. Next.js will happily ship it; there is no compile-time marker telling them it is the wrong file.
2. Because stored passwords are PBKDF2 hashes (written via `hashPassword` in `app/admin/(dashboard)/files/actions.ts:411`), a caller of the dead function would always get `false` — which is a silent authn failure that looks like "user typed the wrong password." Annoying but not exploitable.

**Remediation:** Delete the function and its named export. There is exactly one correct implementation and it already lives in `lib/actions/verify-password.ts`.

---

## 3. Rate limiter is per-isolate and IP source is partially spoofable — Medium

**Where:** `lib/security/rate-limit.ts:15-23` (store) and `lib/security/rate-limit.ts:25-36` (IP extraction).

**What:**

- `getStore()` hangs the rate-limit map off `globalThis`. On Cloudflare Workers, each isolate has its own memory; there is no shared store. Every request that hits a cold isolate starts at count 0, and Cloudflare routinely spawns new isolates.
- `getClientIp()` reads `cf-connecting-ip` first (trustworthy when traffic actually flows through Cloudflare), then falls back to `x-forwarded-for` and `x-real-ip`. The fallbacks are attacker-controlled if the origin is reachable directly or if any edge other than Cloudflare is involved.

**Why it matters:** Public form endpoints (`app/(public)/contact/actions.ts`, `app/(public)/events/actions.ts`, `app/(public)/grapevine/actions.ts`) rely on `checkRateLimit` for abuse prevention (reCAPTCHA submission storms, email-spam via `contact`, flyer-upload floods). In practice the in-app limit trips only a small fraction of the time, and a determined attacker can bypass it by rotating isolates or spoofing forwarding headers.

This is not a code bug in the narrow sense — the implementation does what it says. It is a defense-in-depth claim that does not hold the weight the calling code puts on it.

**Remediation:** Move abuse throttling to Cloudflare WAF rate-limit rules (per-IP, per-endpoint, bound to the actual edge). Keep the in-app limiter as a trip-wire but add a comment in `rate-limit.ts` making clear that it is not authoritative. Optionally tighten `getClientIp` to accept only `cf-connecting-ip` when running in the Workers runtime (detectable via the Cloudflare context).

---

## 4. `/api/reports/[month]` is unauthenticated — Medium

**Where:** `app/api/reports/[month]/route.ts`.

**What:** The route validates that `month` matches `/^\d{4}-\d{2}$/` and that `format` is `html` or `json`, then fetches the object straight out of R2 and streams it back. There is no `auth()` call, no signed URL, no allowlist.

**Why it matters:** If the monthly reports contain any internal operational data — uptime, traffic by district, submission counts, email logs, admin activity — enumerating `YYYY-MM` for the last few years is trivial. The worker that generates these reports (`workers/monthly-report/`) suggests they are operational summaries, not public press releases. This is a classic IDOR-adjacent "it's only a guess away" exposure.

This may be intentional (e.g., the reports are meant to be publicly linkable), but the decision is not documented in code and the route name does not imply public access.

**Remediation:** Either

1. Add `await auth()` + area-admin check at the top of the handler, matching `app/api/admin/files/route.ts:159-163`; or
2. Leave it public and add a single-line comment above the handler stating the policy decision and who made it, so future readers don't have to reverse-engineer intent.

---

## 5. Hardcoded district whitelist in `isAllowedRedirectHost` — Medium

**Where:** `lib/auth/index.ts:124-131`.

**What:** Redirect allowlist regex accepts `area36.org`, `www.area36.org`, and `d{1..27}.area36.org` except `d10`. District membership is hardcoded rather than queried from `district_sites` in D1.

**Why it matters:** Not currently exploitable — an attacker cannot register a subdomain of `area36.org`. But the list is authoritative for OAuth redirect validation, and if the canonical district list diverges from this regex, two failure modes appear:

- A newly provisioned district is unreachable via the redirect flow until someone remembers to update this file.
- A district that gets decommissioned still passes the regex long after the D1 record is removed. If the subdomain's DNS is ever reused (unlikely at area36.org, more plausible for district-owned external redirects), that becomes an open-redirect primitive.

**Remediation:** Query `district_sites` once at startup (or with a short TTL cache) and validate against the result. Middleware already does this via `getDistrictSiteForMiddleware`; the auth layer can share the same source of truth.

---

## 6. Raw error messages returned on 500 from GDrive API — Low

**Where:** `app/api/gdrive/[type]/route.ts:571-591`.

**What:** On a caught exception, the handler returns `{ error: errorMessage }` where `errorMessage` is the raw `error.message`. The stack is logged, which is good, but the message itself goes back to the client.

**Why it matters:** Google API errors, Drizzle/D1 errors, and Cloudflare binding errors can surface internal file IDs, folder IDs, quota state, service-account email, or SQL fragments. None of these are catastrophic on their own, but they speed up reconnaissance. Compare to the admin files route, which returns only `{ error: "Unauthorized" }` / generic 500s.

**Remediation:** Return a generic `{ error: "Failed to fetch", requestId }` to the client; keep the structured log entry unchanged. The `requestId` already serves as the correlation handle for support.

---

## 7. Dev bypass trusts `Host` header when `NODE_ENV !== "production"` — Low

**Where:** `lib/auth/dev-bypass.ts:10-21`.

**What:**

```ts
if (process.env.NODE_ENV === "production") return false
if (process.env.LOCAL_ADMIN_BYPASS === "0") return false
if (process.env.LOCAL_ADMIN_BYPASS === "1") return true
const host = (await headers()).get("host") ?? ""
return isLocalHost(host)  // fallback: Host-header sniffing
```

**Why it matters:** The production check is correct and hard-coded, so production is safe. The risk is entirely about non-production environments:

- Any preview / staging deployment that forgets to set `NODE_ENV=production` (or `LOCAL_ADMIN_BYPASS=0`) falls through to the `isLocalHost(host)` fallback.
- `Host` is client-supplied. A curl with `-H 'Host: localhost'` against the public origin passes `isLocalHost` and yields a full area-admin session via `createLocalAdminBypassSession()` with admin rights for all 27 districts.
- Cloudflare normally rewrites `Host` to the canonical hostname, so this is probably not exploitable through the CF front door. But direct-to-origin requests, or any environment where CF does not sit in front, are at risk.

**Remediation:** Flip the default to fail-closed. Require an explicit `LOCAL_ADMIN_BYPASS=1` before granting bypass, and drop the Host-header fallback entirely:

```ts
export async function isLocalAdminBypassEnabled(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false
  return process.env.LOCAL_ADMIN_BYPASS === "1"
}
```

Document in `README.md` that local developers set `LOCAL_ADMIN_BYPASS=1` in `.env.local`.

---

## Suggested fix order

1. Finding 1 (one-line fix, biggest replay-risk reduction).
2. Finding 2 (delete dead function, zero behavior change, prevents future foot-gun).
3. Finding 4 (policy decision that blocks a one-line code change either way).
4. Findings 6 and 7 (small, clear, fail-closed changes).
5. Findings 3 and 5 (require either infra work in Cloudflare dashboard or a small DB-query refactor).
