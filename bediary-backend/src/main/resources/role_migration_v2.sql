-- ============================================================
-- Bediary Role Migration v2
-- Mục đích:
--   1. Chuyển Ba mẹ (family creators) từ ADMIN → CAREGIVER
--   2. Seed 1 tài khoản ADMIN hệ thống cố định
--   3. Gán tài khoản ADMIN vào tất cả gia đình hiện có với role ADMIN
-- ============================================================

-- BƯỚC 1: Chuyển tất cả family member đang có role ADMIN sang CAREGIVER
-- (đây là những user tạo gia đình, thực chất là Ba mẹ)
UPDATE family_members
SET role = 'CAREGIVER'
WHERE role = 'ADMIN';

-- ============================================================
-- BƯỚC 2: Tạo tài khoản ADMIN hệ thống (nếu chưa tồn tại)
-- Password hash bên dưới tương ứng với: Admin@123
-- Thay đổi password sau khi deploy lần đầu
-- ============================================================
INSERT INTO users (
    id,
    email,
    full_name,
    password_hash,
    is_premium,
    created_at
)
SELECT
    gen_random_uuid(),
    'admin@bediary.app',
    'Quản trị viên Bediary',
    '$2a$12$8VJkQxzmZU0zKF3TqH2fUONXcqn2MlV3J0EuF8S6d2LQ4kqhz1TT2',
    true,
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@bediary.app'
);

-- ============================================================
-- BƯỚC 3: Thêm ADMIN vào tất cả các gia đình hiện có
-- Để ADMIN có thể xem và quản lý toàn bộ gia đình
-- ============================================================
INSERT INTO family_members (id, family_id, user_id, role)
SELECT
    gen_random_uuid(),
    f.id AS family_id,
    u.id AS user_id,
    'ADMIN'
FROM families f
CROSS JOIN users u
WHERE u.email = 'admin@bediary.app'
  AND NOT EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = f.id AND fm.user_id = u.id
  );

-- ============================================================
-- Kiểm tra kết quả
-- ============================================================
SELECT
    u.email,
    u.full_name,
    fm.role,
    f.baby_name
FROM users u
JOIN family_members fm ON fm.user_id = u.id
JOIN families f ON f.id = fm.family_id
ORDER BY fm.role, u.email;
