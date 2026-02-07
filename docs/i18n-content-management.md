# Internationalization + Admin-Managed Content (Plan)

## Goals
- Support 4 locales: `en` (default), `es`, `hmn`, `so`.
- Language selection sources (priority order):
  1. Explicit user choice (cookie)
  2. Browser settings / locale headers (`Accept-Language`)
  3. Default fallback (`en`)
- All public pages render **only** from editable content documents (no hardcoded copy), including buttons, headings, paragraphs, and link labels/URLs.
- Content can be updated from the admin UI and becomes live immediately (no redeploy, no bucket/file updates).

## Runtime Design

### Locale Selection
- Cookie: `a36_locale`
- Middleware behavior:
  - If cookie is missing/invalid, derive locale from `Accept-Language`, set cookie, and continue.
  - If cookie is present, do not override it.

### Content Fetching
- Source of truth: Cloudflare D1 table `content_documents`.
- Public render reads `published_json` only.
- Missing locale content falls back to English at read-time.

### Content Scopes
Content is stored by `(scope, locale)`:
- `global`: header, footer, shared labels
- `home`: homepage hero + cards
- (planned) one scope per route, e.g. `about`, `events`, `contact`, etc.

## Data Model

### `content_documents`
- Primary key: `(scope, locale)`
- Columns:
  - `draft_json`: JSON text edited in admin
  - `published_json`: JSON text served to the public
  - timestamps + `updated_by`

This supports an editorial workflow (draft vs publish) while keeping reads fast (1 row per scope+locale).

## Admin UX (Content Studio)
- Scope switcher (Global, Home, etc.)
- Locale tabs (English, Spanish, Hmong, Somali)
- Field-based editor with:
  - English reference shown when editing non-English locales
  - "Copy missing from English"
  - Save draft / Publish actions
- Status panel showing missing field counts and timestamps.

## Migration Strategy (How We Get To "All Content Is Managed")
1. Convert shared chrome first:
   - Header nav labels
   - Footer headings + links + contact block
2. Convert the home page sections (hero, CTAs, previews) next.
3. Convert remaining routes one-by-one:
   - For each route, define a content scope and schema fields.
   - Replace hardcoded strings with `t("...")` lookups.
4. Enforce "no hardcoded strings" gradually:
   - Add a lightweight lint/check later (optional) to flag new literal UI copy in public routes.

## Notes / Tradeoffs
- Schema-driven editing (fields defined in code) keeps the admin UI usable and avoids a raw JSON editor.
- Adding brand-new content fields still requires code changes (to define the field and render it on the page), but changing copy and link targets does not.

