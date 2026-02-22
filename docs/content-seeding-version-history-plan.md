# Content Seeding + Version History Plan

## Goals

- Seed the current site content into `content_documents` so content is DB-driven.
- Keep code defaults as structural fallback only, not as the effective source of current live copy.
- Preserve existing production content as highest priority during seeding.
- Add version history so editors can inspect and restore past values per field.

## Current State (Repository-Scoped)

- Content source table: `content_documents` (`scope`, `locale`, `draft_json`, `published_json`, timestamps, `updated_by`).
- Runtime read behavior (`lib/content/repo.ts`):
  - Merge order: defaults (code) -> published English -> published locale.
  - Draft mode is preview-only via cookie + auth.
- Admin write behavior (`app/admin/(dashboard)/content/actions.ts`):
  - Save updates `draft_json`.
  - Publish copies current `draft_json` to `published_json`.

## Requirement Interpretation

- "Current content should be seeded, defaults should not represent current content":
  - Keep defaults minimal/structural and safe fallback.
  - Populate `content_documents` with the current rendered content baseline.
- "Production takes precedence":
  - Never overwrite existing `(scope, locale)` rows in production.
  - Seed only missing rows/columns (idempotent upsert that preserves existing published values).
- "Version history per field":
  - History is loaded on demand from UI (not auto-hydrated for all fields).
  - Revert can target draft immediately; publish remains explicit.

## Data Model Changes

### 1) Add versions table

Create migration `lib/db/migrations/0019_content_document_versions.sql`:

```sql
CREATE TABLE IF NOT EXISTS content_document_versions (
  id TEXT PRIMARY KEY,                           -- nanoid/uuid
  scope TEXT NOT NULL,
  locale TEXT NOT NULL,
  field_path TEXT,                              -- null = whole-document snapshot event
  old_value_json TEXT,                          -- JSON-encoded scalar/object/array/null
  new_value_json TEXT NOT NULL,                 -- JSON-encoded value
  source TEXT NOT NULL,                         -- 'seed' | 'draft-save' | 'publish' | 'revert'
  editor_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_versions_scope_locale_path_time
  ON content_document_versions(scope, locale, field_path, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_versions_scope_locale_time
  ON content_document_versions(scope, locale, created_at DESC);
```

### 2) Optional publish pointer metadata (future-safe)

If needed later for fast rollback UX across many fields, add:
- `content_documents.last_version_at` (timestamp) or
- `content_documents.last_change_id` (text).

Not required for initial implementation.

## Seeding Plan

### Inputs

- Canonical list of scopes/locales from `CONTENT_SCHEMAS` + `SUPPORTED_LOCALES`.
- Seed payload generated from current code content (including static page text now wired to CMS scopes).

### Output

- For each `(scope, locale)` missing in DB:
  - `draft_json = seed_doc`
  - `published_json = seed_doc`
  - `updated_by = 'seed:script'` (or deploy actor)
  - timestamps set by DB.

### Precedence Rules

For each `(scope, locale)`:

1. If row exists and `published_json` is non-null: keep as-is.
2. Else if row exists and `draft_json` is non-null:
   - keep draft
   - set `published_json = draft_json` only if published is null and this is explicitly allowed by rollout flag.
3. Else insert seed payload.

This guarantees existing production values win.

### Script Design

Add script: `scripts/seed-content-documents.ts`.

- Runs in Node with Drizzle DB wiring used by app.
- Flags:
  - `--env=local|production`
  - `--dry-run`
  - `--allow-promote-draft` (default false)
  - `--scopes=global,home,...` (optional subset)
- Emits:
  - inserted row count
  - skipped-existing row count
  - promoted-draft count
  - JSON diff summary per row in dry-run mode.

### Seed Provenance

For each inserted field/document, insert history rows with:
- `source='seed'`
- `old_value_json = NULL`
- `new_value_json = value`
- `field_path` populated for all leaf fields (or null for doc snapshot if leaf expansion is too large initially).

Recommended: leaf-level entries for revert-per-field UX.

## Version History Behavior

### Write Path Hooks

When saving a draft (`saveContentDraft`):

1. Load previous `draft_json` for `(scope, locale)` (or `{}`).
2. Diff old vs new document by field path (leaf paths + changed objects).
3. Write draft as today.
4. Insert one version row per changed field (`source='draft-save'`).

When publishing (`publishContent`):

1. Diff previous `published_json` vs new published doc.
2. Insert version rows with `source='publish'`.

When reverting:

1. User chooses a previous value for one field.
2. Apply value into current draft only.
3. Insert version row with `source='revert'` (old=current, new=selected historical value).
4. Publish remains a separate explicit action.

### Field-Level History API

Add server actions:

- `loadFieldHistory({ scope, locale, fieldPath, limit, cursor? })`
  - returns newest-first history rows for that exact field path.
- `revertFieldToVersion({ scope, locale, versionId })`
  - validates row belongs to scope/locale.
  - updates draft for `field_path` to `new_value_json`.
  - logs a `revert` version row.

### UI in Content Studio

Per editable field:

- Add small `History` trigger (clock icon/button) near label.
- On click, open popover/dialog and fetch history lazily.
- Show timeline: timestamp, editor, source, old -> new preview.
- `Use this value` action writes to draft field immediately.
- No auto-load of all field histories on page render.

## Rollout Phases

1. **Phase 1: Seed + Guardrails**
   - Add seed script.
   - Run dry-run on local + staging snapshot.
   - Run production seed with no-overwrite guarantees.

2. **Phase 2: Version Storage**
   - Add versions migration and schema bindings.
   - Add diff + version writes for save/publish.

3. **Phase 3: Editor UX**
   - Add per-field lazy history panel.
   - Add revert-to-draft action.

4. **Phase 4: Hardening**
   - Add tests and metrics.
   - Add retention policy decision (if required).

## Test Plan

- Unit:
  - document diff algorithm (add/remove/change nested fields, arrays, nulls).
  - seed precedence logic.
- Integration:
  - save creates version rows only for changed fields.
  - publish creates version rows only for published changes.
  - revert updates draft and creates revert history row.
- E2E:
  - open field history lazily.
  - restore old value and publish.
  - confirm public page reflects restored value.

## Operational Notes

- Keep seeding idempotent; safe to re-run.
- Use transaction boundaries per `(scope, locale)` write batch.
- Add lightweight logging around history row creation volume.
- If version volume grows, archive by month/quarter later.

## Suggested Execution Order (Concrete)

1. Ship migration `0019_content_document_versions.sql`.
2. Add drizzle schema for `content_document_versions`.
3. Implement shared content diff helper (`lib/content/diff.ts`).
4. Hook `saveContentDraft` + `publishContent` to write version rows.
5. Add seed script and run dry-run in local.
6. Seed production with "skip existing published rows" policy.
7. Add lazy field-history UI + revert action in `content-editor.tsx`.

