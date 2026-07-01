-- ============================================================
-- BEDIARY TEST SEED DATA
-- ============================================================
-- Purpose:
--   Reset and seed enough data to test Home Dashboard, Feed,
--   Tracking, Growth, Vaccination, Routines, Notifications,
--   Streaks, comments/reactions, and role permissions.
--
-- How to run:
--   1. Start PostgreSQL and create database if needed:
--        CREATE DATABASE bediary_db;
--   2. Start backend once so Hibernate creates tables, or run with ddl-auto=update.
--   3. Execute this file:
--        psql -U postgres -d bediary_db -f bediary_test_seed.sql
--
-- Test accounts:
--   ADMIN  email: parent@bediary.test   password: password123
--   VIEWER email: grandma@bediary.test  password: password123
--
-- Invite code:
--   BEDIARY1
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Minimal schema for standalone local testing.
-- If Hibernate already created these tables, these statements are skipped.
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email varchar(255) NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    full_name varchar(100) NOT NULL,
    avatar_url varchar(500),
    is_premium boolean DEFAULT false,
    premium_expires_at timestamp,
    fcm_token varchar(500),
    created_at timestamp
);

CREATE TABLE IF NOT EXISTS families (
    id uuid PRIMARY KEY,
    baby_name varchar(100) NOT NULL,
    baby_dob date NOT NULL,
    baby_gender varchar(10),
    invite_code varchar(20) UNIQUE
);

CREATE TABLE IF NOT EXISTS family_members (
    id uuid PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES families(id),
    user_id uuid NOT NULL REFERENCES users(id),
    role varchar(20) NOT NULL,
    CONSTRAINT uk_family_user UNIQUE (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS care_tips (
    id uuid PRIMARY KEY,
    start_day integer NOT NULL,
    end_day integer NOT NULL,
    category varchar(30) NOT NULL,
    title varchar(200) NOT NULL,
    content text NOT NULL,
    source_type varchar(20) NOT NULL,
    is_premium boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routines (
    id uuid PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES families(id),
    label varchar(100) NOT NULL,
    activity_type varchar(50) NOT NULL,
    scheduled_time time NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_logs (
    id uuid PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES families(id),
    routine_id uuid REFERENCES routines(id),
    logged_by uuid NOT NULL REFERENCES users(id),
    executed_at timestamp NOT NULL,
    deviation_minutes integer,
    schedule_updated boolean NOT NULL DEFAULT false,
    note varchar(500)
);

CREATE TABLE IF NOT EXISTS tracking_logs (
    id uuid PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES families(id),
    created_by uuid NOT NULL REFERENCES users(id),
    activity_type varchar(50) NOT NULL,
    start_time timestamp NOT NULL,
    end_time timestamp,
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS growth_records (
    id uuid PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES families(id),
    recorded_by uuid NOT NULL REFERENCES users(id),
    recorded_at timestamp NOT NULL,
    weight_kg numeric(5,2),
    height_cm numeric(5,1),
    age_days integer NOT NULL,
    weight_status varchar(30),
    height_status varchar(20)
);

CREATE TABLE IF NOT EXISTS vaccination_records (
    id uuid PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES families(id),
    vaccine_name varchar(100) NOT NULL,
    dose_number integer NOT NULL DEFAULT 1,
    scheduled_date date NOT NULL,
    completed_at timestamp,
    completed_by uuid REFERENCES users(id),
    notes varchar(500),
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_posts (
    id uuid PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES families(id),
    uploaded_by uuid NOT NULL REFERENCES users(id),
    media_url varchar(500) NOT NULL,
    media_type varchar(20) NOT NULL,
    caption text,
    reaction_count integer NOT NULL DEFAULT 0,
    comment_count integer NOT NULL DEFAULT 0,
    ai_captions jsonb,
    created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_reactions (
    id uuid PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES media_posts(id),
    user_id uuid NOT NULL REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT uk_post_user_reaction UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
    id uuid PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES media_posts(id),
    user_id uuid NOT NULL REFERENCES users(id),
    content text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY,
    family_id uuid NOT NULL REFERENCES families(id),
    user_id uuid NOT NULL REFERENCES users(id),
    type varchar(50) NOT NULL,
    title varchar(200) NOT NULL,
    body text,
    is_read boolean NOT NULL DEFAULT false,
    payload jsonb,
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_streaks (
    id uuid PRIMARY KEY,
    family_id uuid NOT NULL UNIQUE REFERENCES families(id),
    current_streak integer NOT NULL DEFAULT 0,
    longest_streak integer NOT NULL DEFAULT 0,
    last_activity_date date
);

-- Reset app data. Keep order explicit because there is no JPA cascade on most entities.
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

-- Stable IDs for repeatable manual testing.
-- admin_user_id  = 11111111-1111-1111-1111-111111111111
-- viewer_user_id = 22222222-2222-2222-2222-222222222222
-- family_id      = aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

INSERT INTO users (
    id, email, password_hash, full_name, avatar_url,
    is_premium, premium_expires_at, fcm_token, created_at
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'parent@bediary.test',
    '$2a$10$sRifByn/U.jNYdxzJcF8GuqLW81dmC9VhlB9Nt.SbOXLKJl/k9aQa',
    'Me Bediary',
    NULL,
    true,
    now() + interval '1 year',
    NULL,
    now() - interval '20 days'
),
(
    '22222222-2222-2222-2222-222222222222',
    'grandma@bediary.test',
    '$2a$10$sRifByn/U.jNYdxzJcF8GuqLW81dmC9VhlB9Nt.SbOXLKJl/k9aQa',
    'Ba Ngoai',
    NULL,
    false,
    NULL,
    NULL,
    now() - interval '18 days'
);

INSERT INTO families (
    id, baby_name, baby_dob, baby_gender, invite_code
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Bong',
    CURRENT_DATE - interval '120 days',
    'FEMALE',
    'BEDIARY1'
);

INSERT INTO family_members (id, family_id, user_id, role) VALUES
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'ADMIN'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'VIEWER'
);

INSERT INTO routines (
    id, family_id, label, activity_type, scheduled_time, is_active, created_at
) VALUES
(
    '33333333-3333-3333-3333-333333333301',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Uong sua sang',
    'FEED',
    '08:00',
    true,
    now() - interval '10 days'
),
(
    '33333333-3333-3333-3333-333333333302',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Ngu trua',
    'SLEEP',
    '12:30',
    true,
    now() - interval '10 days'
),
(
    '33333333-3333-3333-3333-333333333303',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Tam chieu',
    'BATH',
    '16:30',
    true,
    now() - interval '10 days'
);

INSERT INTO routine_logs (
    id, family_id, routine_id, logged_by, executed_at,
    deviation_minutes, schedule_updated, note
) VALUES
(
    '44444444-4444-4444-4444-444444444401',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333301',
    '11111111-1111-1111-1111-111111111111',
    date_trunc('day', now()) + interval '8 hours 5 minutes',
    5,
    false,
    'Bong uong sua tot'
);

INSERT INTO tracking_logs (
    id, family_id, created_by, activity_type, start_time, end_time, metadata
) VALUES
(
    '55555555-5555-5555-5555-555555555501',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'FEED',
    now() - interval '3 hours',
    now() - interval '2 hours 50 minutes',
    '{"milkMl": 120, "note": "Sua cong thuc"}'::jsonb
),
(
    '55555555-5555-5555-5555-555555555502',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'SLEEP',
    now() - interval '2 hours',
    now() - interval '30 minutes',
    '{"quality": "GOOD", "note": "Ngu ngoan"}'::jsonb
),
(
    '55555555-5555-5555-5555-555555555503',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'DIAPER',
    now() - interval '20 minutes',
    NULL,
    '{"type": "WET"}'::jsonb
);

INSERT INTO growth_records (
    id, family_id, recorded_by, recorded_at, weight_kg, height_cm,
    age_days, weight_status, height_status
) VALUES
(
    '66666666-6666-6666-6666-666666666601',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    now() - interval '20 days',
    6.80,
    62.5,
    100,
    'NORMAL',
    'NORMAL'
),
(
    '66666666-6666-6666-6666-666666666602',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    now() - interval '2 days',
    7.10,
    64.0,
    118,
    'NORMAL',
    'NORMAL'
);

INSERT INTO vaccination_records (
    id, family_id, vaccine_name, dose_number, scheduled_date,
    completed_at, completed_by, notes, created_at
) VALUES
(
    '77777777-7777-7777-7777-777777777701',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '5 trong 1',
    2,
    CURRENT_DATE + interval '5 days',
    NULL,
    NULL,
    'Moc tiem sap toi de test dashboard alert',
    now()
),
(
    '77777777-7777-7777-7777-777777777702',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Rotavirus',
    2,
    CURRENT_DATE + interval '12 days',
    NULL,
    NULL,
    'Theo lich bac si',
    now()
),
(
    '77777777-7777-7777-7777-777777777703',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Lao BCG',
    1,
    CURRENT_DATE - interval '90 days',
    now() - interval '90 days',
    '11111111-1111-1111-1111-111111111111',
    'Da tiem',
    now() - interval '90 days'
);

INSERT INTO care_tips (
    id, start_day, end_day, category, title, content,
    source_type, is_premium, created_at
) VALUES
(
    '88888888-8888-8888-8888-888888888801',
    91,
    130,
    'MILESTONE',
    'Be bat dau phat am',
    'Giai doan nay be co the bi bo va phan ung voi giong noi quen thuoc. Hay noi chuyen voi be moi ngay.',
    'MEDICAL',
    false,
    now()
),
(
    '88888888-8888-8888-8888-888888888802',
    91,
    130,
    'TIP',
    'Tummy time nhe nhang',
    'Cho be nam sap khi thuc va co nguoi lon ben canh 3-5 phut moi lan de ho tro co co va vai.',
    'MEDICAL',
    false,
    now()
),
(
    '88888888-8888-8888-8888-888888888803',
    91,
    130,
    'FOOD',
    'Sua van la nguon dinh duong chinh',
    'Truoc 6 thang, sua me hoac sua cong thuc van la nguon dinh duong chinh. Chua can an dam neu be chua san sang.',
    'MEDICAL',
    true,
    now()
),
(
    '88888888-8888-8888-8888-888888888804',
    0,
    365,
    'TIP',
    'Ghi lai khoanh khac moi ngay',
    'Mot buc anh ngan moi ngay giup gia dinh nhin lai hanh trinh lon len cua be ro rang hon.',
    'FOLK',
    false,
    now()
);

INSERT INTO media_posts (
    id, family_id, uploaded_by, media_url, media_type, caption,
    reaction_count, comment_count, ai_captions, created_at
) VALUES
(
    '99999999-9999-9999-9999-999999999901',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=900',
    'IMAGE',
    'Hom nay Bong cuoi that tuoi',
    1,
    1,
    '["Nang nhe tren doi mat be", "Mot ngay that diu dang cua Bong"]'::jsonb,
    now() - interval '2 days'
),
(
    '99999999-9999-9999-9999-999999999902',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=900',
    'IMAGE',
    'Buoi sang yen binh',
    0,
    0,
    NULL,
    now() - interval '1 day'
),
(
    '99999999-9999-9999-9999-999999999903',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=900',
    'IMAGE',
    'Ba ngoai luu lai khoanh khac nay',
    0,
    0,
    NULL,
    now() - interval '4 hours'
);

INSERT INTO post_reactions (
    id, post_id, user_id, created_at
) VALUES
(
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee01',
    '99999999-9999-9999-9999-999999999901',
    '22222222-2222-2222-2222-222222222222',
    now() - interval '1 day'
);

INSERT INTO post_comments (
    id, post_id, user_id, content, created_at
) VALUES
(
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee02',
    '99999999-9999-9999-9999-999999999901',
    '22222222-2222-2222-2222-222222222222',
    'Bong yeu qua!',
    now() - interval '1 day'
);

INSERT INTO notifications (
    id, family_id, user_id, type, title, body, is_read, payload, created_at
) VALUES
(
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee11',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'VACCINATION',
    'Sap den lich tiem',
    'Bong sap den lich tiem 5 trong 1 trong 5 ngay nua.',
    false,
    '{"vaccinationId": "77777777-7777-7777-7777-777777777701"}'::jsonb,
    now() - interval '1 hour'
),
(
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee12',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'MEDIA',
    'Anh moi trong gia dinh',
    'Me Bediary vua dang mot khoanh khac moi cua be.',
    false,
    '{"postId": "99999999-9999-9999-9999-999999999902"}'::jsonb,
    now() - interval '1 day'
);

INSERT INTO user_streaks (
    id, family_id, current_streak, longest_streak, last_activity_date
) VALUES
(
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee21',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    5,
    12,
    CURRENT_DATE
);

-- Quick sanity checks.
SELECT 'users' AS table_name, count(*) FROM users
UNION ALL SELECT 'families', count(*) FROM families
UNION ALL SELECT 'family_members', count(*) FROM family_members
UNION ALL SELECT 'routines', count(*) FROM routines
UNION ALL SELECT 'tracking_logs', count(*) FROM tracking_logs
UNION ALL SELECT 'growth_records', count(*) FROM growth_records
UNION ALL SELECT 'vaccination_records', count(*) FROM vaccination_records
UNION ALL SELECT 'care_tips', count(*) FROM care_tips
UNION ALL SELECT 'media_posts', count(*) FROM media_posts
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'user_streaks', count(*) FROM user_streaks;
