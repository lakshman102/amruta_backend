CREATE INDEX IF NOT EXISTS idx_profiles_lower_display_name
  ON profiles (LOWER(display_name));

CREATE INDEX IF NOT EXISTS idx_users_lower_email
  ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_availability_slots_doctor_status_starts_at
  ON availability_slots (doctor_id, status, starts_at);
