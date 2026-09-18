ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_consultations_patient_idempotency
  ON consultations(patient_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_availability_slot_id
  ON consultations(availability_slot_id);

INSERT INTO schema_migrations (version)
VALUES ('004_booking_idempotency')
ON CONFLICT (version) DO NOTHING;
