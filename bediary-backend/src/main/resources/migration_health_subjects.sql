-- ================================================
-- Migration: Health Subjects (Dynamic Tabs)
-- Chạy file này trong pgAdmin / DBeaver / psql
-- ================================================

-- 1. Tạo bảng health_subjects
CREATE TABLE IF NOT EXISTS health_subjects (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    relationship VARCHAR(30) NOT NULL,
    display_name VARCHAR(80),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Thêm cột subject_id vào health_records
--    NULL = hồ sơ của Bé (giữ nguyên)
--    UUID = hồ sơ của người thân (Ba/Mẹ/Ông/Bà...)
ALTER TABLE health_records
    ADD COLUMN IF NOT EXISTS subject_id UUID NULL
        REFERENCES health_subjects(id) ON DELETE SET NULL;

-- 3. Index cho query nhanh
CREATE INDEX IF NOT EXISTS idx_health_records_subject_id
    ON health_records(subject_id);

CREATE INDEX IF NOT EXISTS idx_health_subjects_family_id
    ON health_subjects(family_id);

-- Xác nhận
SELECT 'Migration health_subjects OK ✓' AS result;
