ALTER TABLE consultations
  ADD CONSTRAINT consultations_valid_status
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

INSERT INTO schema_migrations (version)
VALUES ('005_consultation_lifecycle')
ON CONFLICT (version) DO NOTHING;
