/*
# Secure app_state by authenticated user

This migration replaces the previous single-tenant/no-auth access model.
Each authenticated Supabase user owns one app_state row through user_id.
*/

ALTER TABLE app_state
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE app_state
  DROP CONSTRAINT IF EXISTS app_state_pkey;

ALTER TABLE app_state
  ALTER COLUMN id DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS app_state_user_id_key ON app_state(user_id);

DROP POLICY IF EXISTS "anon_select_app_state" ON app_state;
DROP POLICY IF EXISTS "anon_insert_app_state" ON app_state;
DROP POLICY IF EXISTS "anon_update_app_state" ON app_state;
DROP POLICY IF EXISTS "anon_delete_app_state" ON app_state;

DROP POLICY IF EXISTS "authenticated_select_own_app_state" ON app_state;
CREATE POLICY "authenticated_select_own_app_state" ON app_state FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated_insert_own_app_state" ON app_state;
CREATE POLICY "authenticated_insert_own_app_state" ON app_state FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated_update_own_app_state" ON app_state;
CREATE POLICY "authenticated_update_own_app_state" ON app_state FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated_delete_own_app_state" ON app_state;
CREATE POLICY "authenticated_delete_own_app_state" ON app_state FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
