/*
# Create KV store table for Fotomanager

1. New Tables
- `kv_store_b2ee3d82` — key-value store used by the Edge Function to persist all app data (orders, photographers, locations, etc.)
  - `key` (text, primary key) — unique identifier for each record
  - `value` (jsonb, not null) — JSON data stored for each key
2. Security
- Enable RLS on `kv_store_b2ee3d82`.
- Allow anon + authenticated full CRUD since this is a single-tenant app with no sign-in.
*/

CREATE TABLE IF NOT EXISTS kv_store_b2ee3d82 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE kv_store_b2ee3d82 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_kv" ON kv_store_b2ee3d82;
CREATE POLICY "anon_select_kv"
ON kv_store_b2ee3d82 FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "anon_insert_kv" ON kv_store_b2ee3d82;
CREATE POLICY "anon_insert_kv"
ON kv_store_b2ee3d82 FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_kv" ON kv_store_b2ee3d82;
CREATE POLICY "anon_update_kv"
ON kv_store_b2ee3d82 FOR UPDATE
TO anon, authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_kv" ON kv_store_b2ee3d82;
CREATE POLICY "anon_delete_kv"
ON kv_store_b2ee3d82 FOR DELETE
TO anon, authenticated
USING (true);
