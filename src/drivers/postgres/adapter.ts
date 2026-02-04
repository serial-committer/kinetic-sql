/* The generic broadcaster function */
export const BROADCAST_FUNC_SQL = `
CREATE OR REPLACE FUNCTION notify_changes() RETURNS TRIGGER AS $$
DECLARE
  payload json;
BEGIN
  payload = json_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'data', COALESCE(NEW, OLD)
  );
  PERFORM pg_notify('table_events', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

/* Helper to create a trigger safely (Idempotent) */
export const createTriggerSql = (tableName: string) => `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'watch_${tableName}') THEN
    CREATE TRIGGER watch_${tableName}
    AFTER INSERT OR UPDATE OR DELETE ON "${tableName}"
    FOR EACH ROW EXECUTE FUNCTION notify_changes();
  END IF;
END
$$;`;
