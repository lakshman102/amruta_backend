CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_created_at
  ON audit_logs(entity_type, created_at DESC);
