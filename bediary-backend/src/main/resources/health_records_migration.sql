-- Family health book: checkups, conditions, hereditary diseases, medication, allergies.
-- Run this once against the current PostgreSQL database before using /api/v1/health-records.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    record_type VARCHAR(30) NOT NULL CHECK (record_type IN ('CHECKUP', 'CONDITION', 'HEREDITARY', 'MEDICATION', 'ALLERGY', 'NOTE')),
    title VARCHAR(160) NOT NULL,
    event_date DATE,
    next_follow_up_date DATE,
    facility VARCHAR(160),
    doctor_name VARCHAR(120),
    diagnosis TEXT,
    medication_name VARCHAR(180),
    medication_dosage VARCHAR(180),
    medication_status VARCHAR(30) CHECK (medication_status IS NULL OR medication_status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
    hereditary_side VARCHAR(30) CHECK (hereditary_side IS NULL OR hereditary_side IN ('MATERNAL', 'PATERNAL', 'BOTH', 'UNKNOWN')),
    severity VARCHAR(30) CHECK (severity IS NULL OR severity IN ('LOW', 'MEDIUM', 'HIGH')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_records_family_type_date
    ON health_records(family_id, record_type, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_health_records_family_next_date
    ON health_records(family_id, next_follow_up_date);
