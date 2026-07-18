-- Bediary Supabase Storage migration
-- Purpose:
--   Store private Supabase object refs separately from legacy local URLs.
--   API responses should resolve these refs into short-lived signed URLs.

BEGIN;

ALTER TABLE IF EXISTS media_posts
  ADD COLUMN IF NOT EXISTS media_storage_path varchar(700);

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS avatar_storage_path varchar(700);

ALTER TABLE IF EXISTS families
  ADD COLUMN IF NOT EXISTS baby_avatar_storage_path varchar(700);

CREATE INDEX IF NOT EXISTS idx_media_posts_media_storage_path
  ON media_posts (media_storage_path);

CREATE INDEX IF NOT EXISTS idx_users_avatar_storage_path
  ON users (avatar_storage_path);

CREATE INDEX IF NOT EXISTS idx_families_baby_avatar_storage_path
  ON families (baby_avatar_storage_path);

COMMIT;
