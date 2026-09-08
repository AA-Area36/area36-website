-- Public HTML spans shared navigation, localized content and district/event data.
-- One atomic revision invalidates every host/locale without cross-colo purges.
-- Keep this table list aligned with data rendered into public HTML. This does
-- not invalidate separate data/API caches or changes made directly in Google.
CREATE TABLE IF NOT EXISTS public_html_revision (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO public_html_revision (id, revision) VALUES (1, 0);

CREATE TRIGGER IF NOT EXISTS public_html_content_documents_insert
AFTER INSERT ON content_documents
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_content_documents_update
AFTER UPDATE ON content_documents
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_content_documents_delete
AFTER DELETE ON content_documents
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_events_insert
AFTER INSERT ON events
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_events_update
AFTER UPDATE ON events
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_events_delete
AFTER DELETE ON events
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_event_to_types_insert
AFTER INSERT ON event_to_types
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_event_to_types_update
AFTER UPDATE ON event_to_types
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_event_to_types_delete
AFTER DELETE ON event_to_types
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_event_flyers_insert
AFTER INSERT ON event_flyers
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_event_flyers_update
AFTER UPDATE ON event_flyers
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_event_flyers_delete
AFTER DELETE ON event_flyers
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_event_exceptions_insert
AFTER INSERT ON event_exceptions
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_event_exceptions_update
AFTER UPDATE ON event_exceptions
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_event_exceptions_delete
AFTER DELETE ON event_exceptions
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_sites_insert
AFTER INSERT ON district_sites
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_sites_update
AFTER UPDATE ON district_sites
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_sites_delete
AFTER DELETE ON district_sites
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_contacts_insert
AFTER INSERT ON district_contacts
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_contacts_update
AFTER UPDATE ON district_contacts
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_contacts_delete
AFTER DELETE ON district_contacts
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_positions_insert
AFTER INSERT ON district_positions
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_positions_update
AFTER UPDATE ON district_positions
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_positions_delete
AFTER DELETE ON district_positions
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_updates_insert
AFTER INSERT ON district_updates
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_updates_update
AFTER UPDATE ON district_updates
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_district_updates_delete
AFTER DELETE ON district_updates
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_subscription_drives_insert
AFTER INSERT ON subscription_drives
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_subscription_drives_update
AFTER UPDATE ON subscription_drives
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_subscription_drives_delete
AFTER DELETE ON subscription_drives
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_drive_submissions_insert
AFTER INSERT ON drive_submissions
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_drive_submissions_update
AFTER UPDATE ON drive_submissions
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_drive_submissions_delete
AFTER DELETE ON drive_submissions
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_recording_folders_insert
AFTER INSERT ON recording_folders
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_recording_folders_update
AFTER UPDATE ON recording_folders
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_recording_folders_delete
AFTER DELETE ON recording_folders
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_file_metadata_insert
AFTER INSERT ON file_metadata
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_file_metadata_update
AFTER UPDATE ON file_metadata
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_file_metadata_delete
AFTER DELETE ON file_metadata
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_reports_monthly_insert
AFTER INSERT ON reports_monthly
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_reports_monthly_update
AFTER UPDATE ON reports_monthly
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS public_html_reports_monthly_delete
AFTER DELETE ON reports_monthly
BEGIN
  UPDATE public_html_revision SET revision = revision + 1 WHERE id = 1;
END;
