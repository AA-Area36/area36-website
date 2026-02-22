-- Ensure alternate area leadership emails are seeded with expected baseline roles.

WITH seed(email, role_key, additional_permissions_json) AS (
  VALUES
    ('altchairperson@area36.org', 'officer', '[]'),
    ('altdelegate@area36.org', 'officer', '[]')
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
    ('altchairperson@area36.org', 'officer', '[]'),
    ('altdelegate@area36.org', 'officer', '[]')
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
