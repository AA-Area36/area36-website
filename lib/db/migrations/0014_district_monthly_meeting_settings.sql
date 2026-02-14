-- Monthly district meeting settings configured from district admin dashboard.
ALTER TABLE district_sites ADD COLUMN meeting_recurrence_mode TEXT NOT NULL DEFAULT 'weekday_of_month';
ALTER TABLE district_sites ADD COLUMN meeting_week_of_month INTEGER;
ALTER TABLE district_sites ADD COLUMN meeting_weekday INTEGER;
ALTER TABLE district_sites ADD COLUMN meeting_day_of_month INTEGER;
ALTER TABLE district_sites ADD COLUMN meeting_time TEXT;
ALTER TABLE district_sites ADD COLUMN meeting_location_type TEXT;
ALTER TABLE district_sites ADD COLUMN meeting_location_name TEXT;
ALTER TABLE district_sites ADD COLUMN meeting_address TEXT;
ALTER TABLE district_sites ADD COLUMN meeting_link TEXT;
ALTER TABLE district_sites ADD COLUMN meeting_contact_for_details INTEGER NOT NULL DEFAULT 0;
