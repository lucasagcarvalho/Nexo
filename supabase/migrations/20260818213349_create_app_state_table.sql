/*
# Create app_state table for personal finance app (single-tenant, no auth)

1. New Tables
- `app_state`
  - `id` (int, primary key, always 1 — single-row table)
  - `data` (jsonb, not null — stores the entire AppData object)
  - `updated_at` (timestamptz, auto-updated on change)

2. Security
- Enable RLS on `app_state`.
- Allow anon + authenticated CRUD because this is a single-tenant app with no sign-in.
  The data is intentionally shared/public within this project instance.

3. Notes
- The app stores all its state (incomes, expenses, cards, debts, etc.) as a single
  JSONB document. This matches the existing localStorage approach and avoids the
  complexity of 15+ tables with nested vigência arrays.
- Only one row (id=1) will ever exist.
*/

CREATE TABLE IF NOT EXISTS app_state (
  id int PRIMARY KEY DEFAULT 1,
  data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_state" ON app_state;
CREATE POLICY "anon_select_app_state" ON app_state FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_state" ON app_state;
CREATE POLICY "anon_insert_app_state" ON app_state FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_state" ON app_state;
CREATE POLICY "anon_update_app_state" ON app_state FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_state" ON app_state;
CREATE POLICY "anon_delete_app_state" ON app_state FOR DELETE
  TO anon, authenticated USING (true);

-- Create a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_state_updated_at ON app_state;
CREATE TRIGGER app_state_updated_at
  BEFORE UPDATE ON app_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
