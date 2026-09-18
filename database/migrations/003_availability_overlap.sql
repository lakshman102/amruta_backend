CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping availability windows for the same doctor.
-- This is enforced by PostgreSQL so concurrent create requests cannot create conflicting slots.
ALTER TABLE availability_slots
  ADD CONSTRAINT availability_slots_no_overlap
  EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  );
