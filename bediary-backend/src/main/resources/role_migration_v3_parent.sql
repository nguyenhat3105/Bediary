-- ============================================================
-- Bediary Role Migration v3
-- Role model:
--   ADMIN     = system admin account only
--   PARENT    = ba mẹ, owns/manages baby journal
--   CAREGIVER = người chăm sóc thay, can log care/upload memories
--   VIEWER    = người thân, read/interact lightly
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hibernate ddl-auto=update does not rewrite PostgreSQL CHECK constraints.
-- Older local databases may still reject PARENT/CAREGIVER here, causing
-- POST /families/create to fail with 500 when the service inserts role=PARENT.
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE t.relname = 'family_members'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%role%'
    LOOP
        EXECUTE format('ALTER TABLE family_members DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE family_members
    ADD CONSTRAINT family_members_role_check
    CHECK (role IN ('ADMIN', 'PARENT', 'CAREGIVER', 'VIEWER'));

-- If older local databases used ADMIN for parents, convert them to PARENT.
-- Keep the fixed system admin account as ADMIN.
UPDATE family_members fm
SET role = 'PARENT'
FROM users u
WHERE fm.user_id = u.id
  AND fm.role = 'ADMIN'
  AND u.email <> 'admin@bediary.app';

-- If role_migration_v2 converted parents to CAREGIVER, promote existing family creators/test parents back to PARENT.
-- This keeps CAREGIVER available for relatives explicitly upgraded by parents later.
UPDATE family_members fm
SET role = 'PARENT'
FROM users u
WHERE fm.user_id = u.id
  AND fm.role = 'CAREGIVER'
  AND (
    u.email = 'parent@bediary.test'
    OR u.email LIKE '%parent%'
  );

-- Ensure the system admin exists. Password hash corresponds to Admin@123.
INSERT INTO users (
    id,
    email,
    full_name,
    password_hash,
    fcm_token,
    created_at
)
SELECT
    gen_random_uuid(),
    'admin@bediary.app',
    'Quản trị viên Bediary',
    '$2a$12$8VJkQxzmZU0zKF3TqH2fUONXcqn2MlV3J0EuF8S6d2LQ4kqhz1TT2',
    NULL,
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@bediary.app'
);

-- Add the system admin to every family as ADMIN if missing.
INSERT INTO family_members (id, family_id, user_id, role)
SELECT
    gen_random_uuid(),
    f.id,
    u.id,
    'ADMIN'
FROM families f
CROSS JOIN users u
WHERE u.email = 'admin@bediary.app'
  AND NOT EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE fm.family_id = f.id
        AND fm.user_id = u.id
  );
