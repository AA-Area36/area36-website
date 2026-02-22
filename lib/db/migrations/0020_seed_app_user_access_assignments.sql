-- Backfill core seeded app role assignments that may be missing in production
-- when those accounts have not signed in yet.

WITH seed(email, role_key, additional_permissions_json) AS (
  VALUES
    ('webmaster@area36.org', 'admin', '[]'),
    ('technology@area36.org', 'admin', '[]'),
    ('alltechnology@area36.org', 'admin', '[]'),
    ('alttechnology@area36.org', 'admin', '[]'),
    ('corrections@area36.org', 'chair', '["corrections:view"]'),
    ('altcorrections@area36.org', 'chair', '["corrections:view"]'),
    ('ctcp@area36.org', 'chair', '["corrections:view","corrections:edit","corrections:match","corrections:delete"]'),
    ('treatment@area36.org', 'chair', '[]'),
    ('ttcc@area36.org', 'chair', '[]')
)
INSERT INTO users (id, email)
SELECT
  'seed-' || replace(replace(s.email, '@', '-'), '.', '-') AS id,
  s.email
FROM seed s
LEFT JOIN users u ON lower(u.email) = s.email
WHERE u.id IS NULL;

WITH seed(email, role_key, additional_permissions_json) AS (
  VALUES
    ('webmaster@area36.org', 'admin', '[]'),
    ('technology@area36.org', 'admin', '[]'),
    ('alltechnology@area36.org', 'admin', '[]'),
    ('alttechnology@area36.org', 'admin', '[]'),
    ('corrections@area36.org', 'chair', '["corrections:view"]'),
    ('altcorrections@area36.org', 'chair', '["corrections:view"]'),
    ('ctcp@area36.org', 'chair', '["corrections:view","corrections:edit","corrections:match","corrections:delete"]'),
    ('treatment@area36.org', 'chair', '[]'),
    ('ttcc@area36.org', 'chair', '[]')
)
INSERT INTO app_user_access (user_id, role_key, additional_permissions_json, created_at, updated_at)
SELECT
  u.id,
  s.role_key,
  s.additional_permissions_json,
  datetime('now'),
  datetime('now')
FROM seed s
JOIN users u ON lower(u.email) = s.email
LEFT JOIN app_user_access aua ON aua.user_id = u.id
WHERE aua.user_id IS NULL;
