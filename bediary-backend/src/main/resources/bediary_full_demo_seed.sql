-- Bediary full demo seed for PostgreSQL.
-- Purpose: reset demo data and create 2 users, 1 family, a 4-5 month old baby,
-- routines, today/recent tracking logs, growth records, vaccinations, notifications,
-- and care tips.
--
-- Login accounts:
--   parent@bediary.test  / password123
--   viewer@bediary.test  / password123
--
-- Notes:
--   - This file intentionally does not seed avatar_url or media_posts.
--   - Run after the backend has started once so Hibernate can create/update tables.
--   - It uses CURRENT_DATE so today's tracking data and upcoming vaccines stay relevant.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep compatibility with older local schemas before recent backend updates.
ALTER TABLE IF EXISTS vaccination_records
  ADD COLUMN IF NOT EXISTS schedule_key varchar(120),
  ADD COLUMN IF NOT EXISTS category varchar(20),
  ADD COLUMN IF NOT EXISTS age_label varchar(80);

ALTER TABLE IF EXISTS growth_records
  ADD COLUMN IF NOT EXISTS weight_z_score double precision,
  ADD COLUMN IF NOT EXISTS height_z_score double precision,
  ADD COLUMN IF NOT EXISTS weight_percentile double precision,
  ADD COLUMN IF NOT EXISTS height_percentile double precision,
  ADD COLUMN IF NOT EXISTS growth_source varchar(120);

ALTER TABLE IF EXISTS families
  ADD COLUMN IF NOT EXISTS baby_avatar_url varchar(500),
  ADD COLUMN IF NOT EXISTS baby_avatar_storage_path varchar(700);

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS avatar_storage_path varchar(700);

ALTER TABLE IF EXISTS media_posts
  ADD COLUMN IF NOT EXISTS media_storage_path varchar(700);

-- Older local schemas may still have the former enum-like CHECK constraint.
-- The current backend stores activity_type as a free String so routines/tracking
-- can support BATH, PLAY, MEDICINE, NOTE, and future activity types.
ALTER TABLE IF EXISTS tracking_logs
  DROP CONSTRAINT IF EXISTS tracking_logs_activity_type_check;

-- Reset app demo data. This is intended for local testing only.
TRUNCATE TABLE
  post_reactions,
  post_comments,
  notifications,
  routine_logs,
  routines,
  tracking_logs,
  growth_records,
  vaccination_records,
  media_posts,
  user_streaks,
  family_members,
  families,
  users,
  care_tips
RESTART IDENTITY CASCADE;

INSERT INTO users (
  id, email, password_hash, full_name, avatar_url, is_premium, premium_expires_at, fcm_token, created_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'parent@bediary.test',
    '$2a$10$sRifByn/U.jNYdxzJcF8GuqLW81dmC9VhlB9Nt.SbOXLKJl/k9aQa',
    'Nguyen Nhat',
    NULL,
    false,
    NULL,
    NULL,
    now() - interval '30 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'viewer@bediary.test',
    '$2a$10$sRifByn/U.jNYdxzJcF8GuqLW81dmC9VhlB9Nt.SbOXLKJl/k9aQa',
    'Tran Mai',
    NULL,
    false,
    NULL,
    NULL,
    now() - interval '25 days'
  );

INSERT INTO families (
  id, baby_name, baby_dob, baby_gender, invite_code
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Be Bap',
    CURRENT_DATE - 135,
    'MALE',
    'BAP135'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Be Na',
    CURRENT_DATE - 72,
    'FEMALE',
    'NA072'
  );

INSERT INTO family_members (
  id, family_id, user_id, role
) VALUES
  (
    'f1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'PARENT'
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'VIEWER'
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'PARENT'
  ),
  (
    'f4444444-4444-4444-4444-444444444444',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'CAREGIVER'
  );

INSERT INTO routines (
  id, family_id, label, activity_type, scheduled_time, is_active, created_at
) VALUES
  ('30000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sua sang', 'FEED', '06:30', true, now() - interval '20 days'),
  ('30000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ngu giac sang', 'SLEEP', '08:30', true, now() - interval '20 days'),
  ('30000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sua giua ngay', 'FEED', '10:30', true, now() - interval '20 days'),
  ('30000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ngu trua', 'SLEEP', '12:30', true, now() - interval '20 days'),
  ('30000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sua chieu', 'FEED', '15:00', true, now() - interval '20 days'),
  ('30000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tam chieu', 'BATH', '17:30', true, now() - interval '20 days'),
  ('30000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sua toi', 'FEED', '20:00', true, now() - interval '20 days'),
  ('30000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ngu dem', 'SLEEP', '21:00', true, now() - interval '20 days');

INSERT INTO tracking_logs (
  id, family_id, created_by, activity_type, start_time, end_time, metadata
) VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'FEED',
    ((CURRENT_DATE::timestamp + time '06:35') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    ((CURRENT_DATE::timestamp + time '06:55') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"milkMl":150,"method":"bottle","note":"Uong het binh, khong tron"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'DIAPER',
    ((CURRENT_DATE::timestamp + time '07:20') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    NULL,
    '{"type":"wet","note":"Ta uot vua"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'SLEEP',
    ((CURRENT_DATE::timestamp + time '08:45') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    ((CURRENT_DATE::timestamp + time '10:05') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"quality":"good","note":"Ngu sau, thuc day vui ve"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'FEED',
    ((CURRENT_DATE::timestamp + time '10:30') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    ((CURRENT_DATE::timestamp + time '10:50') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"milkMl":140,"method":"bottle","note":"Can vo nhe khi uong"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'SLEEP',
    ((CURRENT_DATE::timestamp + time '12:40') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    ((CURRENT_DATE::timestamp + time '14:15') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"quality":"normal","note":"Ngu trua on dinh"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'FEED',
    ((CURRENT_DATE::timestamp + time '14:35') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    ((CURRENT_DATE::timestamp + time '14:55') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"milkMl":135,"method":"bottle","note":"Bu it hon binh thuong mot chut"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000007',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'BATH',
    ((CURRENT_DATE::timestamp + time '17:35') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    ((CURRENT_DATE::timestamp + time '17:50') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"waterTempC":37,"note":"Tam nhanh, da kho thoang"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000008',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'PLAY',
    ((CURRENT_DATE::timestamp + time '18:10') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    ((CURRENT_DATE::timestamp + time '18:35') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"activity":"tummy_time","minutes":25,"note":"Nam sap va voi do choi tot"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000009',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'FEED',
    (((CURRENT_DATE - interval '1 day')::timestamp + time '06:40') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (((CURRENT_DATE - interval '1 day')::timestamp + time '07:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"milkMl":155,"method":"bottle","note":"Uong tot"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000010',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'SLEEP',
    (((CURRENT_DATE - interval '1 day')::timestamp + time '09:00') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (((CURRENT_DATE - interval '1 day')::timestamp + time '10:20') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"quality":"good","note":"Ngu sang du"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000011',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'FEED',
    (((CURRENT_DATE - interval '1 day')::timestamp + time '15:05') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (((CURRENT_DATE - interval '1 day')::timestamp + time '15:25') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"milkMl":145,"method":"bottle","note":"Nen giu cu sua chieu"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000012',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'DIAPER',
    (((CURRENT_DATE - interval '2 days')::timestamp + time '11:15') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    NULL,
    '{"type":"dirty","note":"Phan vang mem"}'::jsonb
  ),
  (
    '40000000-0000-0000-0000-000000000013',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'SLEEP',
    (((CURRENT_DATE - interval '3 days')::timestamp + time '20:55') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    (((CURRENT_DATE - interval '2 days')::timestamp + time '05:45') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    '{"quality":"normal","note":"Dem day 1 lan de bu"}'::jsonb
  );

INSERT INTO routine_logs (
  id, family_id, routine_id, logged_by, executed_at, deviation_minutes, schedule_updated, note
) VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '30000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    ((CURRENT_DATE::timestamp + time '06:35') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    5,
    false,
    'Da uong 150ml'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '30000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    ((CURRENT_DATE::timestamp + time '08:45') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    15,
    false,
    'Ngu sau'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '30000000-0000-0000-0000-000000000006',
    '11111111-1111-1111-1111-111111111111',
    ((CURRENT_DATE::timestamp + time '17:35') AT TIME ZONE 'Asia/Ho_Chi_Minh'),
    5,
    false,
    'Da tam'
  );

INSERT INTO growth_records (
  id, family_id, recorded_by, recorded_at, weight_kg, height_cm, age_days,
  weight_status, height_status, weight_z_score, height_z_score,
  weight_percentile, height_percentile, growth_source
) VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    now() - interval '60 days',
    5.70,
    59.8,
    75,
    'NORMAL',
    'NORMAL',
    -0.22,
    -0.10,
    41.3,
    46.0,
    'WHO LMS demo seed'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    now() - interval '30 days',
    6.35,
    62.4,
    105,
    'NORMAL',
    'NORMAL',
    -0.08,
    0.03,
    46.8,
    51.2,
    'WHO LMS demo seed'
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    now() - interval '2 days',
    6.95,
    64.6,
    135,
    'NORMAL',
    'NORMAL',
    0.05,
    0.12,
    52.0,
    54.8,
    'WHO LMS demo seed'
  );

INSERT INTO vaccination_records (
  id, family_id, schedule_key, vaccine_name, dose_number, scheduled_date,
  category, age_label, completed_at, completed_by, notes, created_at
) VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'hep-b-birth',
    'Viem gan B',
    1,
    CURRENT_DATE - 134,
    'REQUIRED',
    'So sinh',
    now() - interval '134 days',
    '11111111-1111-1111-1111-111111111111',
    'Da tiem trong 24 gio dau sau sinh',
    now() - interval '130 days'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bcg-birth',
    'BCG',
    1,
    CURRENT_DATE - 130,
    'REQUIRED',
    'So sinh',
    now() - interval '130 days',
    '11111111-1111-1111-1111-111111111111',
    'Da tiem phong lao',
    now() - interval '129 days'
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'dpt-hib-polio-hepb-1',
    'DPT-VGB-Hib-IPV',
    1,
    CURRENT_DATE - 75,
    'REQUIRED',
    '2 thang',
    now() - interval '75 days',
    '11111111-1111-1111-1111-111111111111',
    'Mui 1, theo doi sau tiem on dinh',
    now() - interval '75 days'
  ),
  (
    '70000000-0000-0000-0000-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'rota-1',
    'Rotavirus',
    1,
    CURRENT_DATE - 74,
    'OPTIONAL',
    '2 thang',
    now() - interval '74 days',
    '11111111-1111-1111-1111-111111111111',
    'Uong lieu 1',
    now() - interval '74 days'
  ),
  (
    '70000000-0000-0000-0000-000000000005',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'pneumo-1',
    'Phe cau',
    1,
    CURRENT_DATE - 73,
    'OPTIONAL',
    '2 thang',
    now() - interval '73 days',
    '11111111-1111-1111-1111-111111111111',
    'Mui 1',
    now() - interval '73 days'
  ),
  (
    '70000000-0000-0000-0000-000000000006',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'dpt-hib-polio-hepb-2',
    'DPT-VGB-Hib-IPV',
    2,
    CURRENT_DATE - 43,
    'REQUIRED',
    '3 thang',
    now() - interval '43 days',
    '11111111-1111-1111-1111-111111111111',
    'Mui 2',
    now() - interval '43 days'
  ),
  (
    '70000000-0000-0000-0000-000000000007',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'rota-2',
    'Rotavirus',
    2,
    CURRENT_DATE - 42,
    'OPTIONAL',
    '3 thang',
    now() - interval '42 days',
    '11111111-1111-1111-1111-111111111111',
    'Uong lieu 2',
    now() - interval '42 days'
  ),
  (
    '70000000-0000-0000-0000-000000000008',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'dpt-hib-polio-hepb-3',
    'DPT-VGB-Hib-IPV',
    3,
    CURRENT_DATE + 5,
    'REQUIRED',
    '4 thang',
    NULL,
    NULL,
    'Sap den lich tiem mui 3',
    now() - interval '10 days'
  ),
  (
    '70000000-0000-0000-0000-000000000009',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'pneumo-2',
    'Phe cau',
    2,
    CURRENT_DATE + 12,
    'OPTIONAL',
    '4 thang',
    NULL,
    NULL,
    'Nhac phu huynh dat lich tiem',
    now() - interval '10 days'
  ),
  (
    '70000000-0000-0000-0000-000000000010',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'influenza-1',
    'Cum mua',
    1,
    CURRENT_DATE + 50,
    'OPTIONAL',
    '6 thang',
    NULL,
    NULL,
    'Du kien khi be du 6 thang tuoi',
    now() - interval '5 days'
  );

INSERT INTO notifications (
  id, family_id, user_id, type, title, body, is_read, payload, created_at
) VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'VACCINATION',
    'Sap den lich tiem',
    'Be Bap con 5 ngay den mui DPT-VGB-Hib-IPV mui 3.',
    false,
    '{"recordId":"70000000-0000-0000-0000-000000000008","route":"/vaccinations"}'::jsonb,
    now() - interval '2 hours'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'GROWTH',
    'Nen cap nhat can nang',
    'Lan cap nhat tang truong gan nhat cach day 2 ngay.',
    true,
    '{"route":"/growth"}'::jsonb,
    now() - interval '1 day'
  ),
  (
    '80000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'ROUTINE',
    'Lich sinh hoat hom nay',
    'Hom nay be da co du lich sua, ngu, tam va van dong.',
    false,
    '{"route":"/routines"}'::jsonb,
    now() - interval '3 hours'
  );

INSERT INTO user_streaks (
  id, family_id, current_streak, longest_streak, last_activity_date
) VALUES (
  '90000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  8,
  14,
  CURRENT_DATE
);

INSERT INTO care_tips (
  id, start_day, end_day, category, title, content, source_type, is_premium, created_at
) VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    90,
    150,
    'routine',
    'Giu nhat quan cu ngu ngay',
    'O giai doan 3-5 thang, be thuong can nhieu giac ngu ngan ban ngay. Neu be cau kinh, hay uu tien moi truong yen tinh va lich ngu lap lai.',
    'seed',
    false,
    now()
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    120,
    180,
    'feeding',
    'Theo doi luong sua moi cu',
    'Neu be bu it hon binh thuong nhieu cu lien tiep, nen ghi lai ml, thoi gian, bieu hien kem theo de hoi bac si khi can.',
    'seed',
    false,
    now()
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    120,
    180,
    'development',
    'Tang thoi gian nam sap',
    'Moi ngay co the chia nho tummy time thanh nhieu lan ngan khi be tinh tao. Luon co nguoi lon theo sat trong luc be nam sap.',
    'seed',
    false,
    now()
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    120,
    180,
    'vaccination',
    'Chuan bi lich tiem tiep theo',
    'Truoc ngay tiem, phu huynh nen kiem tra than nhiet, tinh trang bu ngu va ghi lai cac phan ung sau lan tiem truoc neu co.',
    'seed',
    false,
    now()
  );

COMMIT;
