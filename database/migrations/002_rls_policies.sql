-- =====================================================================
-- CAREVERSE DATABASE RLS POLICIES: 002_rls_policies.sql
-- Description: Supabase Row Level Security (RLS) policies for cross-patient isolation
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_administration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellbeing_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS checks
CREATE OR REPLACE FUNCTION get_patient_id_for_user(user_uuid UUID)
RETURNS UUID AS $$
  SELECT id FROM patient_profiles WHERE user_id = user_uuid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_care_circle_member(check_patient_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_circle_members
    WHERE patient_id = check_patient_id
      AND member_user_id = check_user_id
      AND status = 'active'
      AND can_view = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_meds(check_patient_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_circle_members
    WHERE patient_id = check_patient_id
      AND member_user_id = check_user_id
      AND status = 'active'
      AND can_manage_meds = TRUE
  ) OR EXISTS (
    SELECT 1 FROM patient_profiles
    WHERE id = check_patient_id AND user_id = check_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_appointments(check_patient_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_circle_members
    WHERE patient_id = check_patient_id
      AND member_user_id = check_user_id
      AND status = 'active'
      AND can_manage_appointments = TRUE
  ) OR EXISTS (
    SELECT 1 FROM patient_profiles
    WHERE id = check_patient_id AND user_id = check_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = auth_user_id OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = auth_user_id OR auth.uid() = id);

-- 2. Patient Profiles Policies
CREATE POLICY "Patients can manage own patient profile"
  ON patient_profiles FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Care circle members can view patient profile"
  ON patient_profiles FOR SELECT
  USING (is_care_circle_member(id, auth.uid()));

-- 3. Care Circle Members Policies
CREATE POLICY "Patients can manage their care circle"
  ON care_circle_members FOR ALL
  USING (patient_id IN (SELECT id FROM patient_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Members can view care circle they belong to"
  ON care_circle_members FOR SELECT
  USING (member_user_id = auth.uid());

-- 4. Medications Policies
CREATE POLICY "Patients and authorized members can view medications"
  ON medications FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patient_profiles WHERE user_id = auth.uid())
    OR is_care_circle_member(patient_id, auth.uid())
  );

CREATE POLICY "Authorized users can manage medications"
  ON medications FOR ALL
  USING (can_manage_meds(patient_id, auth.uid()));

-- 5. Medication Administration Records Policies
CREATE POLICY "View administration records"
  ON medication_administration_records FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patient_profiles WHERE user_id = auth.uid())
    OR is_care_circle_member(patient_id, auth.uid())
  );

CREATE POLICY "Record medication administration"
  ON medication_administration_records FOR INSERT
  WITH CHECK (can_manage_meds(patient_id, auth.uid()));

CREATE POLICY "Update medication administration"
  ON medication_administration_records FOR UPDATE
  USING (can_manage_meds(patient_id, auth.uid()));

-- 6. Appointments Policies
CREATE POLICY "View appointments"
  ON appointments FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patient_profiles WHERE user_id = auth.uid())
    OR is_care_circle_member(patient_id, auth.uid())
  );

CREATE POLICY "Manage appointments"
  ON appointments FOR ALL
  USING (can_manage_appointments(patient_id, auth.uid()));

-- 7. Wellbeing Check-ins Policies
CREATE POLICY "View wellbeing check-ins"
  ON wellbeing_checkins FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patient_profiles WHERE user_id = auth.uid())
    OR is_care_circle_member(patient_id, auth.uid())
  );

CREATE POLICY "Record wellbeing check-ins"
  ON wellbeing_checkins FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM patient_profiles WHERE user_id = auth.uid())
    OR is_care_circle_member(patient_id, auth.uid())
  );

-- 8. Care Notes Policies
CREATE POLICY "View care notes"
  ON care_notes FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patient_profiles WHERE user_id = auth.uid())
    OR is_care_circle_member(patient_id, auth.uid())
  );

CREATE POLICY "Create care notes"
  ON care_notes FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM patient_profiles WHERE user_id = auth.uid())
    OR is_care_circle_member(patient_id, auth.uid())
  );

-- 9. Notifications Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

-- 10. Audit Logs Policies
CREATE POLICY "Patients view own audit logs"
  ON audit_logs FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patient_profiles WHERE user_id = auth.uid())
    OR actor_id = auth.uid()
  );
