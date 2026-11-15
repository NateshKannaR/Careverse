-- =====================================================================
-- CAREVERSE DATABASE SEED: 001_seed_realistic_demo_data.sql
-- Description: Realistic fictional seed data for hackathon evaluation
-- =====================================================================

-- Passwords for demo users are hashed 'Demo1234!'
-- Using fixed UUIDs for deterministic testing & demo switching

-- 1. Insert Demo Profiles
INSERT INTO profiles (id, email, password_hash, full_name, role, phone, preferred_language, timezone)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'eleanor@careverse.demo', '$2b$10$w8T0mI40Qh5e1.7rYd1/reQy9P98k5v71mJ4V2Q7V8m.1r7V3c3z2', 'Eleanor Vance', 'elderly', '+1 (555) 234-5678', 'en', 'America/New_York'),
  ('22222222-2222-2222-2222-222222222222', 'david@careverse.demo', '$2b$10$w8T0mI40Qh5e1.7rYd1/reQy9P98k5v71mJ4V2Q7V8m.1r7V3c3z2', 'David Vance', 'family', '+1 (555) 345-6789', 'en', 'America/New_York'),
  ('33333333-3333-3333-3333-333333333333', 'sarah@careverse.demo', '$2b$10$w8T0mI40Qh5e1.7rYd1/reQy9P98k5v71mJ4V2Q7V8m.1r7V3c3z2', 'Sarah Jenkins, RN', 'caregiver', '+1 (555) 456-7890', 'en', 'America/New_York'),
  ('44444444-4444-4444-4444-444444444444', 'admin@careverse.demo', '$2b$10$w8T0mI40Qh5e1.7rYd1/reQy9P98k5v71mJ4V2Q7V8m.1r7V3c3z2', 'Dr. Marcus Chen', 'admin', '+1 (555) 999-0000', 'en', 'America/New_York')
ON CONFLICT (email) DO NOTHING;

-- 2. Patient Profile for Eleanor Vance
INSERT INTO patient_profiles (id, user_id, date_of_birth, blood_group, primary_condition, emergency_notes, primary_address, allergies)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '1950-04-12',
  'O+',
  'Hypertension, Type 2 Diabetes, Mild Osteoarthritis',
  'Keep walker nearby. Penicillin allergy. Daughter lives 10 miles away.',
  '742 Evergreen Terrace, Springfield, OR 97477',
  ARRAY['Penicillin', 'Sulfa drugs']
) ON CONFLICT (user_id) DO NOTHING;

-- 3. Care Circle Members
INSERT INTO care_circle_members (id, patient_id, member_user_id, relationship, can_view, can_manage_meds, can_manage_appointments, can_add_notes, status)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Son (Family Guardian)', TRUE, FALSE, TRUE, TRUE, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Primary Home Health Nurse', TRUE, TRUE, TRUE, TRUE, 'active')
ON CONFLICT (patient_id, member_user_id) DO NOTHING;

-- 4. Emergency Contacts
INSERT INTO emergency_contacts (id, patient_id, name, relationship, phone_number, is_primary, notify_on_sos)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'David Vance', 'Son', '+1 (555) 345-6789', TRUE, TRUE),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sarah Jenkins, RN', 'Home Nurse', '+1 (555) 456-7890', FALSE, TRUE),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Springfield Metro Emergency Services', 'Emergency Dispatch', '911 / 112', FALSE, FALSE);

-- 5. Medications
INSERT INTO medications (id, patient_id, name, category, dosage, strength, frequency, times_of_day, instructions, prescribing_doctor, pharmacy, icon_type, refill_date, total_supply, remaining_supply, is_active)
VALUES
  ('mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lisinopril', 'Blood Pressure', '1 Tablet', '10mg', 'Once daily', ARRAY['08:00'], 'Take in the morning with a full glass of water. Do not skip.', 'Dr. Robert Mehta', 'CVS Pharmacy #4102', 'pill', CURRENT_DATE + INTERVAL '12 days', 30, 18, TRUE),
  ('mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Metformin HCl', 'Diabetes', '1 Tablet', '500mg', 'Twice daily', ARRAY['08:00', '19:00'], 'Take with breakfast and dinner to avoid upset stomach.', 'Dr. Priya Sharma', 'Walgreens #8819', 'capsule', CURRENT_DATE + INTERVAL '5 days', 60, 14, TRUE),
  ('mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Atorvastatin', 'Cholesterol', '1 Tablet', '20mg', 'Once daily', ARRAY['21:00'], 'Take before bedtime.', 'Dr. Robert Mehta', 'CVS Pharmacy #4102', 'pill', CURRENT_DATE + INTERVAL '22 days', 30, 26, TRUE),
  ('mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Glucosamine & Chondroitin', 'Joint Health', '2 Capsules', '1500mg', 'Once daily', ARRAY['12:00'], 'Take with lunch for joint stiffness.', 'Dr. Eleanor Campbell', 'Costco Pharmacy', 'capsule', CURRENT_DATE + INTERVAL '28 days', 60, 52, TRUE);

-- 6. Today's Medication Administration Records
INSERT INTO medication_administration_records (id, patient_id, medication_id, scheduled_time, actual_time, status, recorded_by, notes)
VALUES
  ('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm1', CURRENT_DATE + TIME '08:00:00', CURRENT_DATE + TIME '08:05:00', 'taken', '11111111-1111-1111-1111-111111111111', 'Taken on time with warm oatmeal.'),
  ('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm2', CURRENT_DATE + TIME '08:00:00', CURRENT_DATE + TIME '08:06:00', 'taken', '11111111-1111-1111-1111-111111111111', 'Taken with breakfast.'),
  ('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm4', CURRENT_DATE + TIME '12:00:00', CURRENT_DATE + TIME '12:15:00', 'taken', '33333333-3333-3333-3333-333333333333', 'Administered during lunch visit.'),
  ('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm2', CURRENT_DATE + TIME '19:00:00', NULL, 'upcoming', NULL, NULL),
  ('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm3', CURRENT_DATE + TIME '21:00:00', NULL, 'upcoming', NULL, NULL);

-- 7. Appointments
INSERT INTO appointments (id, patient_id, doctor_name, specialty, hospital_clinic, address, appointment_date, appointment_time, contact_phone, appointment_purpose, preparation_checklist, notes, status)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dr. Robert Mehta', 'Cardiologist', 'Springfield Heart & Vascular Institute', '100 Medical Center Dr, Suite 300, Springfield, OR', CURRENT_DATE + INTERVAL '3 days', '10:30:00', '+1 (555) 789-1122', 'Routine 6-month blood pressure and cardiac review', '[{"task": "Bring morning BP log of past 2 weeks", "completed": true}, {"task": "Fasting blood sample at 08:00 AM", "completed": false}, {"task": "Carry list of current active medications", "completed": true}]'::jsonb, 'Son David will accompany Eleanor in the morning.', 'scheduled'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dr. Priya Sharma', 'Endocrinologist', 'Willamette Health Center', '450 Oak Grove Blvd, Springfield, OR', CURRENT_DATE + INTERVAL '14 days', '14:00:00', '+1 (555) 890-3344', 'Quarterly HbA1c and Diabetic Foot Check', '[{"task": "HbA1c Lab test 3 days prior", "completed": false}, {"task": "Wear comfortable shoes for foot examination", "completed": false}]'::jsonb, 'Check blood sugar records for past month.', 'scheduled');

-- 8. Wellbeing Check-ins
INSERT INTO wellbeing_checkins (id, patient_id, recorded_by, checkin_date, mood, energy_level, pain_level, symptoms, notes)
VALUES
  ('wwwwwwww-wwww-wwww-wwww-wwwwwwwwwww1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE, 'good', 4, 2, ARRAY['Mild morning knee stiffness'], 'Had a peaceful walk in the garden. Drank plenty of water.')
ON CONFLICT (patient_id, checkin_date) DO NOTHING;

-- 9. Care Notes
INSERT INTO care_notes (id, patient_id, author_id, category, title, content, is_priority)
VALUES
  ('nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnn01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'vitals', 'Morning Vitals Recorded', 'Blood pressure: 122/78 mmHg. Pulse: 72 bpm. Blood sugar: 110 mg/dL (fasting). Eleanor looked vibrant and in good spirits.', FALSE),
  ('nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnn02', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'general', 'Weekend Grocery & Fruit Delivery', 'Stocked fresh blueberries, low-sodium vegetable soup, and herbal teas. Checked refrigerator for expired items.', FALSE);

-- 10. Notification Preferences
INSERT INTO notification_preferences (user_id, email_enabled, upcoming_dose_minutes, missed_dose_grace_minutes, appointment_reminders_enabled, caregiver_escalation_enabled, daily_digest_enabled)
VALUES
  ('11111111-1111-1111-1111-111111111111', TRUE, 15, 30, TRUE, TRUE, TRUE),
  ('22222222-2222-2222-2222-222222222222', TRUE, 15, 30, TRUE, TRUE, TRUE),
  ('33333333-3333-3333-3333-333333333333', TRUE, 15, 30, TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444444', TRUE, 15, 30, TRUE, TRUE, TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- 11. Notifications
INSERT INTO notifications (id, recipient_id, patient_id, type, title, message, channel, status, scheduled_for, sent_at)
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffff01', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medication_reminder', 'Morning Doses Recorded', 'Your morning Lisinopril and Metformin doses were successfully recorded as taken.', 'email', 'sent', CURRENT_DATE + TIME '08:06:00', CURRENT_DATE + TIME '08:06:01'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff02', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medication_reminder', 'Family Update: Morning Meds Taken', 'Eleanor took her scheduled morning medications on time today.', 'email', 'sent', CURRENT_DATE + TIME '08:06:00', CURRENT_DATE + TIME '08:06:02');

-- 12. Audit Logs
INSERT INTO audit_logs (actor_id, patient_id, action, resource_type, resource_id, details)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'LOGIN', 'SESSION', 'eleanor@careverse.demo', '{"role": "elderly", "device": "iPad Safari"}'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEDICATION_ADMINISTERED', 'MEDICATION', 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm1', '{"status": "taken", "dose": "1 Tablet"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CARE_NOTE_ADDED', 'CARE_NOTE', 'nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnn01', '{"title": "Morning Vitals Recorded"}'::jsonb);
