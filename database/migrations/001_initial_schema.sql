-- =====================================================================
-- CAREVERSE DATABASE SCHEMA MIGRATION: 001_initial_schema.sql
-- Description: Core schema for Elderly Healthcare Management Ecosystem
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table (User Accounts)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('elderly', 'family', 'caregiver', 'admin')),
    phone VARCHAR(50),
    avatar_url TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC',
    preferred_language VARCHAR(10) DEFAULT 'en' CHECK (preferred_language IN ('en', 'ta', 'hi')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patient Profiles (Specific health context for elderly individuals)
CREATE TABLE IF NOT EXISTS patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    blood_group VARCHAR(10),
    primary_condition TEXT,
    emergency_notes TEXT,
    primary_address TEXT,
    allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_patient_user UNIQUE (user_id)
);

-- 3. Care Circle Members (Authorized relationships around patient)
CREATE TABLE IF NOT EXISTS care_circle_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    member_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship VARCHAR(100) NOT NULL, -- e.g., 'Daughter', 'Son', 'Primary Nurse', 'Doctor'
    can_view BOOLEAN DEFAULT TRUE,
    can_manage_meds BOOLEAN DEFAULT FALSE,
    can_manage_appointments BOOLEAN DEFAULT FALSE,
    can_add_notes BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_patient_member UNIQUE (patient_id, member_user_id)
);

-- 4. Invitations (Hashed tokens, expiration, role, permissions)
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('family', 'caregiver')),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    can_view BOOLEAN DEFAULT TRUE,
    can_manage_meds BOOLEAN DEFAULT FALSE,
    can_manage_appointments BOOLEAN DEFAULT FALSE,
    can_add_notes BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Medications
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Blood Pressure', 'Diabetes', 'Cardiac', 'Pain Relief', 'Vitamin', etc.
    dosage VARCHAR(100) NOT NULL,    -- '1 Tablet', '5 ml', '10 mg'
    strength VARCHAR(50),            -- '50mg', '100mg'
    frequency VARCHAR(50) NOT NULL,  -- 'Once daily', 'Twice daily', 'Three times daily', 'As needed'
    times_of_day TEXT[] NOT NULL,    -- e.g. ['08:00', '20:00']
    instructions TEXT,               -- 'Take with food and water'
    prescribing_doctor VARCHAR(255),
    pharmacy VARCHAR(255),
    icon_type VARCHAR(50) DEFAULT 'pill', -- 'pill', 'capsule', 'liquid', 'injection', 'drops'
    refill_date DATE,
    total_supply INT DEFAULT 30,
    remaining_supply INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Medication Schedules (Individual daily time slots)
CREATE TABLE IF NOT EXISTS medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    scheduled_time TIME NOT NULL, -- e.g. 08:00:00
    days_of_week INT[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=Sun, 6=Sat
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Medication Administration Records (Source of truth for doses)
CREATE TABLE IF NOT EXISTS medication_administration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMPTZ NOT NULL,
    actual_time TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL CHECK (status IN ('upcoming', 'due_now', 'taken', 'missed', 'skipped', 'acknowledged')),
    recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_patient_med_slot UNIQUE (patient_id, medication_id, scheduled_time)
);

-- 8. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(150) NOT NULL,
    hospital_clinic VARCHAR(255) NOT NULL,
    address TEXT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    contact_number VARCHAR(50),
    appointment_purpose TEXT NOT NULL,
    preparation_checklist JSONB DEFAULT '[]'::jsonb, -- [{"task": "Bring blood reports", "completed": false}]
    notes TEXT,
    follow_up_date DATE,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    reminder_24h_sent BOOLEAN DEFAULT FALSE,
    reminder_2h_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Daily Wellbeing Check-ins
CREATE TABLE IF NOT EXISTS wellbeing_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mood VARCHAR(50) NOT NULL, -- 'great', 'good', 'okay', 'tired', 'unwell'
    energy_level INT CHECK (energy_level BETWEEN 1 AND 5),
    pain_level INT CHECK (pain_level BETWEEN 0 AND 10),
    symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_daily_checkin UNIQUE (patient_id, checkin_date)
);

-- 10. Care Notes
CREATE TABLE IF NOT EXISTS care_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) DEFAULT 'general', -- 'general', 'medical', 'diet', 'vitals'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_priority BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- 'medication_reminder', 'missed_dose', 'appointment_reminder', 'care_escalation', 'refill_alert', 'emergency_sos'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(50) DEFAULT 'email' CHECK (channel IN ('email', 'in_app', 'both')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'simulated')),
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    dedup_hash VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    upcoming_dose_minutes INT DEFAULT 15,
    missed_dose_grace_minutes INT DEFAULT 30,
    appointment_reminders_enabled BOOLEAN DEFAULT TRUE,
    caregiver_escalation_enabled BOOLEAN DEFAULT TRUE,
    daily_digest_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Notification Delivery Logs
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'resend', 'simulator'
    status VARCHAR(50) NOT NULL,   -- 'delivered', 'failed', 'simulated'
    attempt_count INT DEFAULT 1,
    error_message TEXT,
    response_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    notify_on_sos BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'LOGIN', 'MEDICATION_ADMINISTERED', 'MEDICATION_ADDED', 'APPOINTMENT_SCHEDULED', 'INVITATION_SENT', 'EMERGENCY_TRIGGERED', etc.
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    ip_address VARCHAR(100),
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_user ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_care_circle_patient ON care_circle_members(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_circle_member ON care_circle_members(member_user_id);
CREATE INDEX IF NOT EXISTS idx_meds_patient ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_records_patient ON medication_administration_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_records_scheduled ON medication_administration_records(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient ON audit_logs(patient_id);
