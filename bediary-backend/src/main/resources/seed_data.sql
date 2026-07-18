-- ============================================================
--  BEDIARY - SEED DATA (Demo / Testing)
--  Baby: Khai Minh, born 2026-02-17 (~4.5 months on 2026-07-03)
--  User 1: Nguyen Thi Mai  (Mom, PARENT)   | pass: Password123
--  User 2: Nguyen Van Nam  (Dad, VIEWER)  | pass: Password123
--  Invite code: KM2026
-- ============================================================

SET session_replication_role = replica;

-- ────────────────────────────────────────────────────────────
-- 1. USERS  (BCrypt hash of "Password123")
-- ────────────────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, avatar_url, is_premium, created_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001',
   'mai.nguyen@bediary.app',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh9S',
   'Nguyen Thi Mai', NULL, false, '2026-05-01T03:00:00Z'),

  ('a2000000-0000-0000-0000-000000000002',
   'nam.nguyen@bediary.app',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh9S',
   'Nguyen Van Nam',  NULL, false, '2026-05-01T03:10:00Z');

-- ────────────────────────────────────────────────────────────
-- 2. FAMILY  (baby born 2026-02-17, Male)
-- ────────────────────────────────────────────────────────────
INSERT INTO families (id, baby_name, baby_dob, baby_gender, invite_code)
VALUES
  ('b1000000-0000-0000-0000-000000000001',
   'Khai Minh', '2026-02-17', 'MALE', 'KM2026');

-- ────────────────────────────────────────────────────────────
-- 3. FAMILY MEMBERS
-- ────────────────────────────────────────────────────────────
INSERT INTO family_members (id, family_id, user_id, role)
VALUES
  ('c1000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001', 'PARENT'),

  ('c2000000-0000-0000-0000-000000000002',
   'b1000000-0000-0000-0000-000000000001',
   'a2000000-0000-0000-0000-000000000002', 'VIEWER');

-- ────────────────────────────────────────────────────────────
-- 4. GROWTH RECORDS  (2m, 3m, 4m, today=4.5m)
-- ────────────────────────────────────────────────────────────
INSERT INTO growth_records (
  id, family_id, recorded_by, recorded_at,
  weight_kg, height_cm, age_days,
  weight_status, height_status,
  weight_z_score, height_z_score,
  weight_percentile, height_percentile, growth_source
) VALUES
  ('d1000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   '2026-04-18T07:00:00Z',
   5.20, 58.5, 60, 'NORMAL','NORMAL', 0.12, 0.08, 55.0, 53.0, 'WHO 2006'),

  ('d2000000-0000-0000-0000-000000000002',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   '2026-05-17T08:00:00Z',
   6.00, 61.2, 89, 'NORMAL','NORMAL', 0.25, 0.18, 60.0, 57.0, 'WHO 2006'),

  ('d3000000-0000-0000-0000-000000000003',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   '2026-06-17T08:30:00Z',
   6.85, 64.0, 120, 'NORMAL','NORMAL', 0.32, 0.21, 63.0, 58.0, 'WHO 2006'),

  ('d4000000-0000-0000-0000-000000000004',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   '2026-07-03T01:00:00Z',
   7.00, 64.8, 136, 'NORMAL','NORMAL', 0.35, 0.22, 64.0, 58.5, 'WHO 2006');

-- ────────────────────────────────────────────────────────────
-- 5. VACCINATION RECORDS
-- ────────────────────────────────────────────────────────────
INSERT INTO vaccination_records (
  id, family_id, schedule_key, vaccine_name, dose_number,
  scheduled_date, category, age_label,
  completed_at, completed_by, notes, created_at
) VALUES
  -- DONE: BCG birth
  ('e1000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   'BCG_1','BCG (Lao)',1,'2026-02-17','MANDATORY','So sinh',
   '2026-02-17T05:00:00Z','a1000000-0000-0000-0000-000000000001',
   'Tiem tai BV Phu san Trung Uong. Be khong phan ung bat thuong.',
   '2026-02-17T05:00:00Z'),

  -- DONE: HBV birth
  ('e2000000-0000-0000-0000-000000000002',
   'b1000000-0000-0000-0000-000000000001',
   'HBV_0','Viem gan B (Mui 0)',1,'2026-02-17','MANDATORY','So sinh',
   '2026-02-17T05:30:00Z','a1000000-0000-0000-0000-000000000001',
   'Tiem cung luc voi BCG.',
   '2026-02-17T05:30:00Z'),

  -- DONE: Pentaxim Dose 1 (2 months)
  ('e3000000-0000-0000-0000-000000000003',
   'b1000000-0000-0000-0000-000000000001',
   'PENTA_1','Pentaxim 5in1 (Mui 1)',1,'2026-04-17','MANDATORY','2 thang tuoi',
   '2026-04-17T08:00:00Z','a1000000-0000-0000-0000-000000000001',
   'Bach hau-Ho ga-Uon van-Viem gan B-Hib. Be sot nhe 37.8C, ha sau 1 ngay.',
   '2026-04-17T08:00:00Z'),

  -- DONE: OPV Dose 1
  ('e4000000-0000-0000-0000-000000000004',
   'b1000000-0000-0000-0000-000000000001',
   'OPV_1','Bai Biet Bai OPV (Mui 1)',1,'2026-04-17','MANDATORY','2 thang tuoi',
   '2026-04-17T08:15:00Z','a1000000-0000-0000-0000-000000000001',
   NULL,'2026-04-17T08:15:00Z'),

  -- DONE: Rotarix Dose 1
  ('e5000000-0000-0000-0000-000000000005',
   'b1000000-0000-0000-0000-000000000001',
   'ROTA_1','Rotarix (Mui 1)',1,'2026-04-17','OPTIONAL','2 thang tuoi',
   '2026-04-17T08:20:00Z','a1000000-0000-0000-0000-000000000001',
   'Uong vac xin phong viem da day Rotavirus.',
   '2026-04-17T08:20:00Z'),

  -- DONE: Pentaxim Dose 2 (3 months)
  ('e6000000-0000-0000-0000-000000000006',
   'b1000000-0000-0000-0000-000000000001',
   'PENTA_2','Pentaxim 5in1 (Mui 2)',2,'2026-05-17','MANDATORY','3 thang tuoi',
   '2026-05-17T09:00:00Z','a1000000-0000-0000-0000-000000000001',
   'Mui nhac lan 2. Be chiu tot, khong sot.',
   '2026-05-17T09:00:00Z'),

  -- DONE: OPV Dose 2
  ('e7000000-0000-0000-0000-000000000007',
   'b1000000-0000-0000-0000-000000000001',
   'OPV_2','Bai Biet Bai OPV (Mui 2)',2,'2026-05-17','MANDATORY','3 thang tuoi',
   '2026-05-17T09:10:00Z','a1000000-0000-0000-0000-000000000001',
   NULL,'2026-05-17T09:10:00Z'),

  -- DONE: Rotarix Dose 2
  ('e8000000-0000-0000-0000-000000000008',
   'b1000000-0000-0000-0000-000000000001',
   'ROTA_2','Rotarix (Mui 2)',2,'2026-05-17','OPTIONAL','3 thang tuoi',
   '2026-05-17T09:15:00Z','a1000000-0000-0000-0000-000000000001',
   NULL,'2026-05-17T09:15:00Z'),

  -- OVERDUE: Pentaxim Dose 3 (was 2026-06-17, not done)
  ('e9000000-0000-0000-0000-000000000009',
   'b1000000-0000-0000-0000-000000000001',
   'PENTA_3','Pentaxim 5in1 (Mui 3)',3,'2026-06-17','MANDATORY','4 thang tuoi',
   NULL, NULL,
   'Chua tiem - QUA HAN 16 ngay. Can tiem som!',
   '2026-05-17T09:00:00Z'),

  -- OVERDUE: OPV Dose 3
  ('e0a00000-0000-0000-0000-000000000010',
   'b1000000-0000-0000-0000-000000000001',
   'OPV_3','Bai Biet Bai OPV (Mui 3)',3,'2026-06-17','MANDATORY','4 thang tuoi',
   NULL, NULL, NULL,'2026-05-17T09:00:00Z'),

  -- UPCOMING: Viem nao Nhat Ban (6 months)
  ('e0b00000-0000-0000-0000-000000000011',
   'b1000000-0000-0000-0000-000000000001',
   'JEV_1','Viem nao Nhat Ban (Mui 1)',1,'2026-08-17','MANDATORY','6 thang tuoi',
   NULL, NULL,
   'Du kien tiem khi be duoc 6 thang tuoi.',
   '2026-05-01T03:00:00Z'),

  -- UPCOMING: Cum (6 months)
  ('e0c00000-0000-0000-0000-000000000012',
   'b1000000-0000-0000-0000-000000000001',
   'FLU_1','Vac xin Cum (Mui 1)',1,'2026-08-17','OPTIONAL','6 thang tuoi',
   NULL, NULL,
   'Khuyen khich tiem tu 6 thang tuoi tro len.',
   '2026-05-01T03:00:00Z');

-- ────────────────────────────────────────────────────────────
-- 6. ROUTINES (daily schedule for 4-month baby)
-- ────────────────────────────────────────────────────────────
INSERT INTO routines (id, family_id, label, activity_type, scheduled_time, is_active, created_at)
VALUES
  ('f1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','Bu sang som','FEED','05:30:00',true,'2026-05-01T03:00:00Z'),
  ('f2000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','Giac ngu sang','SLEEP','07:00:00',true,'2026-05-01T03:00:00Z'),
  ('f3000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','Bu bua 2','FEED','09:30:00',true,'2026-05-01T03:00:00Z'),
  ('f4000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001','Giac ngu trua','SLEEP','11:00:00',true,'2026-05-01T03:00:00Z'),
  ('f5000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001','Bu bua trua','FEED','13:30:00',true,'2026-05-01T03:00:00Z'),
  ('f6000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000001','Bu chieu','FEED','16:30:00',true,'2026-05-01T03:00:00Z'),
  ('f7000000-0000-0000-0000-000000000007','b1000000-0000-0000-0000-000000000001','Tam be','BATH','18:00:00',true,'2026-05-01T03:00:00Z'),
  ('f8000000-0000-0000-0000-000000000008','b1000000-0000-0000-0000-000000000001','Bu truoc ngu','FEED','20:00:00',true,'2026-05-01T03:00:00Z'),
  ('f9000000-0000-0000-0000-000000000009','b1000000-0000-0000-0000-000000000001','Ngu dem','SLEEP','21:00:00',true,'2026-05-01T03:00:00Z');

-- ────────────────────────────────────────────────────────────
-- 7. TRACKING LOGS (6 days: today + 5 days back)
--    Times stored as UTC (Vietnam = UTC+7, so 5:30 VN = 22:30 UTC prev day)
-- ────────────────────────────────────────────────────────────

-- == TODAY 2026-07-03 ==
INSERT INTO tracking_logs (id, family_id, created_by, activity_type, start_time, end_time, metadata)
VALUES
  ('g101-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-07-02T22:30:00Z','2026-07-02T22:45:00Z',
   '{"feedType":"BREAST","durationMin":15,"side":"LEFT","note":"Be bu ngon mieng"}'::jsonb),

  ('g102-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'SLEEP','2026-07-03T00:00:00Z','2026-07-03T01:30:00Z',
   '{"quality":"GOOD","location":"Crib","note":"Ngu ngon, tu ngu lai"}'::jsonb),

  ('g103-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-07-03T02:30:00Z','2026-07-03T02:48:00Z',
   '{"feedType":"BREAST","durationMin":18,"side":"RIGHT"}'::jsonb),

  ('g104-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'SLEEP','2026-07-03T04:00:00Z','2026-07-03T05:30:00Z',
   '{"quality":"GOOD","note":"Giac ngu trua tot"}'::jsonb),

  ('g105-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'DIAPER','2026-07-03T06:30:00Z','2026-07-03T06:35:00Z',
   '{"type":"WET_DIRTY","color":"YELLOW","note":"Binh thuong"}'::jsonb),

  ('g106-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-07-03T06:35:00Z','2026-07-03T06:50:00Z',
   '{"feedType":"BREAST","durationMin":15,"side":"LEFT"}'::jsonb);

-- == YESTERDAY 2026-07-02 ==
INSERT INTO tracking_logs (id, family_id, created_by, activity_type, start_time, end_time, metadata)
VALUES
  ('g201-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-07-01T22:30:00Z','2026-07-01T22:45:00Z',
   '{"feedType":"BREAST","durationMin":15}'::jsonb),

  ('g202-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'SLEEP','2026-07-02T00:00:00Z','2026-07-02T01:45:00Z',
   '{"quality":"FAIR","note":"Be tinh giac 1 lan"}'::jsonb),

  ('g203-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-07-02T02:30:00Z','2026-07-02T02:45:00Z',
   '{"feedType":"BOTTLE","amountMl":120,"note":"Me di vang, bo cho bu binh"}'::jsonb),

  ('g204-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002',
   'DIAPER','2026-07-02T04:00:00Z','2026-07-02T04:05:00Z',
   '{"type":"WET","note":"Bo thay bim"}'::jsonb),

  ('g205-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-07-02T06:30:00Z','2026-07-02T06:48:00Z',
   '{"feedType":"BREAST","durationMin":18}'::jsonb),

  ('g206-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'BATH','2026-07-02T11:00:00Z','2026-07-02T11:20:00Z',
   '{"waterTempC":36,"note":"Be vui ve khi tam"}'::jsonb),

  ('g207-0000-0000-0000-000000000007','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'SLEEP','2026-07-02T13:00:00Z','2026-07-02T19:00:00Z',
   '{"quality":"GOOD","note":"Ngu dem ngon"}'::jsonb);

-- == 2 DAYS AGO 2026-07-01 ==
INSERT INTO tracking_logs (id, family_id, created_by, activity_type, start_time, end_time, metadata)
VALUES
  ('g301-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-07-01T00:30:00Z','2026-07-01T00:45:00Z',
   '{"feedType":"BREAST","durationMin":15}'::jsonb),

  ('g302-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'SLEEP','2026-07-01T02:00:00Z','2026-07-01T03:30:00Z',
   '{"quality":"GOOD"}'::jsonb),

  ('g303-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-07-01T04:30:00Z','2026-07-01T04:45:00Z',
   '{"feedType":"BREAST","durationMin":15}'::jsonb),

  ('g304-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'DIAPER','2026-07-01T05:00:00Z','2026-07-01T05:05:00Z',
   '{"type":"DIRTY","color":"YELLOW"}'::jsonb),

  ('g305-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'HEALTH','2026-07-01T06:00:00Z','2026-07-01T06:10:00Z',
   '{"symptom":"Sot nhe 37.5C","action":"Lap nhiet do, theo doi","note":"Co the do phan ung sau tiem"}'::jsonb),

  ('g306-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-07-01T09:30:00Z','2026-07-01T09:48:00Z',
   '{"feedType":"BREAST","durationMin":18,"note":"Be an ngon hon"}'::jsonb);

-- == 3 DAYS AGO 2026-06-30 ==
INSERT INTO tracking_logs (id, family_id, created_by, activity_type, start_time, end_time, metadata)
VALUES
  ('g401-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-06-30T00:30:00Z','2026-06-30T00:45:00Z',
   '{"feedType":"BREAST","durationMin":15}'::jsonb),

  ('g402-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'SLEEP','2026-06-30T01:00:00Z','2026-06-30T02:30:00Z',
   '{"quality":"POOR","note":"Be quay khoc nhieu, kho ngu"}'::jsonb),

  ('g403-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-06-30T04:30:00Z','2026-06-30T04:50:00Z',
   '{"feedType":"BREAST","durationMin":20}'::jsonb),

  ('g404-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'BATH','2026-06-30T11:00:00Z','2026-06-30T11:15:00Z',
   '{"waterTempC":36,"note":"Be cuoi khi tam"}'::jsonb),

  ('g405-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-06-30T07:30:00Z','2026-06-30T07:45:00Z',
   '{"feedType":"BREAST","durationMin":15}'::jsonb);

-- == 4 DAYS AGO 2026-06-29 ==
INSERT INTO tracking_logs (id, family_id, created_by, activity_type, start_time, end_time, metadata)
VALUES
  ('g501-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-06-28T22:30:00Z','2026-06-28T22:45:00Z',
   '{"feedType":"BREAST","durationMin":15}'::jsonb),

  ('g502-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'SLEEP','2026-06-29T01:00:00Z','2026-06-29T02:30:00Z',
   '{"quality":"GOOD","note":"Ngu ngoan"}'::jsonb),

  ('g503-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002',
   'FEED','2026-06-29T02:30:00Z','2026-06-29T02:45:00Z',
   '{"feedType":"BOTTLE","amountMl":100,"note":"Bo cho bu binh"}'::jsonb),

  ('g504-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'DIAPER','2026-06-29T06:00:00Z','2026-06-29T06:05:00Z',
   '{"type":"WET_DIRTY"}'::jsonb),

  ('g505-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-06-29T06:30:00Z','2026-06-29T06:48:00Z',
   '{"feedType":"BREAST","durationMin":18}'::jsonb);

-- == 5 DAYS AGO 2026-06-28 ==
INSERT INTO tracking_logs (id, family_id, created_by, activity_type, start_time, end_time, metadata)
VALUES
  ('g601-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-06-27T22:30:00Z','2026-06-27T22:45:00Z',
   '{"feedType":"BREAST","durationMin":15}'::jsonb),

  ('g602-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'SLEEP','2026-06-28T01:00:00Z','2026-06-28T02:30:00Z',
   '{"quality":"GOOD"}'::jsonb),

  ('g603-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'BATH','2026-06-28T11:00:00Z','2026-06-28T11:15:00Z',
   '{"waterTempC":36,"note":"Tam buoi chieu"}'::jsonb),

  ('g604-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'FEED','2026-06-28T06:30:00Z','2026-06-28T06:45:00Z',
   '{"feedType":"BREAST","durationMin":15}'::jsonb),

  ('g605-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
   'HEALTH','2026-06-28T09:00:00Z',NULL,
   '{"note":"Kham dinh ky tai phong kham Hanh Phuc. BS cho biet be phat trien binh thuong."}'::jsonb);

-- ────────────────────────────────────────────────────────────
-- 8. USER STREAK
-- ────────────────────────────────────────────────────────────
INSERT INTO user_streaks (id, family_id, current_streak, longest_streak, last_activity_date)
VALUES
  ('h1000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   6, 12, '2026-07-03');

-- ────────────────────────────────────────────────────────────
-- 9. NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
INSERT INTO notifications (id, family_id, user_id, type, title, body, is_read, payload, created_at)
VALUES
  -- UNREAD: vaccination overdue alert
  ('i1000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'VACCINATION','Nhac lich tiem chung - QUA HAN',
   'Khai Minh chua tiem Pentaxim Mui 3 (du kien 17/06). Lich tiem da qua 16 ngay. Hay lien he bac si!',
   false,
   '{"vaccineId":"e9000000-0000-0000-0000-000000000009","vaccineName":"Pentaxim 5in1 Mui 3","scheduledDate":"2026-06-17"}'::jsonb,
   '2026-07-03T01:00:00Z'),

  -- UNREAD: growth update
  ('i2000000-0000-0000-0000-000000000002',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'GROWTH_REMINDER','Cap nhat can nang hom nay!',
   'Khai Minh can 7.0 kg, cao 64.8 cm. Be dang phat trien binh thuong theo chuan WHO.',
   false,
   '{"weightKg":7.0,"heightCm":64.8,"status":"NORMAL"}'::jsonb,
   '2026-07-03T01:10:00Z'),

  -- READ: streak milestone
  ('i3000000-0000-0000-0000-000000000003',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'STREAK','Chuoi 6 ngay lien tuc!',
   'Tuyet voi! Ban da ghi nhat ky cho Khai Minh 6 ngay lien tiep. Tiep tuc phat huy!',
   true,
   '{"currentStreak":6,"longestStreak":12}'::jsonb,
   '2026-07-02T13:00:00Z'),

  -- READ: routine reminder
  ('i4000000-0000-0000-0000-000000000004',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'ROUTINE','Nhac lich: Tam be luc 18:00',
   'Da den gio tam cho Khai Minh. Dung quen nhe!',
   true,
   '{"routineId":"f7000000-0000-0000-0000-000000000007","scheduledTime":"18:00"}'::jsonb,
   '2026-07-02T11:00:00Z'),

  -- READ: vaccine completed
  ('i5000000-0000-0000-0000-000000000005',
   'b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'VACCINATION','Tiem chung hoan thanh!',
   'Khai Minh da hoan thanh tiem Rotarix Mui 2. Theo doi 24h sau tiem nhe.',
   true,
   '{"vaccineId":"e8000000-0000-0000-0000-000000000008","vaccineName":"Rotarix Mui 2"}'::jsonb,
   '2026-05-17T09:20:00Z');

SET session_replication_role = DEFAULT;

-- ============================================================
-- VERIFY DATA:
-- SELECT u.full_name, fm.role FROM users u JOIN family_members fm ON u.id=fm.user_id;
-- SELECT baby_name, baby_dob, invite_code FROM families;
-- SELECT vaccine_name, dose_number, scheduled_date, completed_at IS NOT NULL as done FROM vaccination_records ORDER BY scheduled_date;
-- SELECT activity_type, count(*) FROM tracking_logs GROUP BY activity_type;
-- SELECT current_streak, longest_streak, last_activity_date FROM user_streaks;
-- SELECT title, is_read FROM notifications ORDER BY created_at DESC;
-- ============================================================
