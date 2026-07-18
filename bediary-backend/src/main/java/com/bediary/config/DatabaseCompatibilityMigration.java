package com.bediary.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DatabaseCompatibilityMigration {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void migrate() {
        ensureFamilyMemberRoleConstraint();
        ensureTrackingLogActivityTypeConstraint();
    }

    private void ensureFamilyMemberRoleConstraint() {
        jdbcTemplate.execute("""
                DO $$
                DECLARE
                    constraint_name text;
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_name = 'family_members'
                    ) THEN
                        RETURN;
                    END IF;

                    FOR constraint_name IN
                        SELECT c.conname
                        FROM pg_constraint c
                        JOIN pg_class t ON t.oid = c.conrelid
                        WHERE t.relname = 'family_members'
                          AND c.contype = 'c'
                          AND pg_get_constraintdef(c.oid) LIKE '%role%'
                    LOOP
                        EXECUTE format('ALTER TABLE family_members DROP CONSTRAINT IF EXISTS %I', constraint_name);
                    END LOOP;

                    ALTER TABLE family_members
                        ADD CONSTRAINT family_members_role_check
                        CHECK (role IN ('ADMIN', 'PARENT', 'CAREGIVER', 'VIEWER'));
                END $$;
                """);
    }

    private void ensureTrackingLogActivityTypeConstraint() {
        jdbcTemplate.execute("""
                DO $$
                DECLARE
                    constraint_name text;
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_name = 'tracking_logs'
                    ) THEN
                        RETURN;
                    END IF;

                    FOR constraint_name IN
                        SELECT c.conname
                        FROM pg_constraint c
                        JOIN pg_class t ON t.oid = c.conrelid
                        WHERE t.relname = 'tracking_logs'
                          AND c.contype = 'c'
                          AND pg_get_constraintdef(c.oid) LIKE '%activity_type%'
                    LOOP
                        EXECUTE format('ALTER TABLE tracking_logs DROP CONSTRAINT IF EXISTS %I', constraint_name);
                    END LOOP;

                    UPDATE tracking_logs
                    SET activity_type = CASE
                        WHEN activity_type IS NULL OR trim(activity_type) = '' THEN 'CUSTOM'
                        WHEN upper(trim(activity_type)) IN ('SLEEP', 'NAP', 'BEDTIME') THEN 'SLEEP'
                        WHEN upper(trim(activity_type)) IN ('FEED', 'FEEDING', 'MILK', 'BREASTFEED', 'BOTTLE', 'MEAL', 'EAT') THEN 'FEED'
                        WHEN upper(trim(activity_type)) IN ('DIAPER', 'DIAPER_CHANGE', 'NAPPY') THEN 'DIAPER'
                        WHEN upper(trim(activity_type)) IN ('PEE', 'URINE', 'WET') THEN 'PEE'
                        WHEN upper(trim(activity_type)) IN ('POOP', 'STOOL', 'BOWEL', 'BOWEL_MOVEMENT') THEN 'POOP'
                        WHEN upper(trim(activity_type)) IN ('BATH', 'BATHE', 'SHOWER') THEN 'BATH'
                        WHEN upper(trim(activity_type)) IN ('MEDICINE', 'MEDICATION', 'DRUG') THEN 'MEDICINE'
                        WHEN upper(trim(activity_type)) IN ('CUSTOM', 'OTHER', 'NOTE', 'ACTIVITY') THEN 'CUSTOM'
                        ELSE 'CUSTOM'
                    END
                    WHERE activity_type IS NULL
                       OR upper(trim(activity_type)) NOT IN ('SLEEP', 'FEED', 'DIAPER', 'PEE', 'POOP', 'BATH', 'MEDICINE', 'CUSTOM');

                    ALTER TABLE tracking_logs
                        ADD CONSTRAINT tracking_logs_activity_type_check
                        CHECK (activity_type IN ('SLEEP', 'FEED', 'DIAPER', 'PEE', 'POOP', 'BATH', 'MEDICINE', 'CUSTOM'));
                END $$;
                """);
    }
}
