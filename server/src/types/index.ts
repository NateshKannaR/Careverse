export type UserRole = 'elderly' | 'family' | 'caregiver' | 'admin';

export interface UserProfile {
  id: string;
  auth_user_id?: string;
  email: string;
  password_hash?: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  timezone?: string;
  preferred_language?: 'en' | 'ta' | 'hi';
  created_at?: string;
  updated_at?: string;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  date_of_birth?: string;
  blood_group?: string;
  primary_condition?: string;
  emergency_notes?: string;
  primary_address?: string;
  allergies?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ElderPrivacyPermissions {
  medications: boolean;
  appointments: boolean;
  wellbeing: boolean;
  care_notes: boolean;
}

export interface CareCircleMember {
  id: string;
  patient_id: string;
  member_user_id: string;
  relationship: string;
  can_view: boolean;
  can_manage_meds: boolean;
  can_manage_appointments: boolean;
  can_add_notes: boolean;
  status: 'active' | 'revoked' | 'pending';
  permissions?: ElderPrivacyPermissions;
  created_at?: string;
  updated_at?: string;
  // Hydrated fields
  member?: UserProfile;
}

export interface PasscodeInvite {
  id: string;
  patient_id: string;
  created_by: string;
  passcode_hash: string;
  passcode_prefix: string; // first 2 chars for indexed lookup
  raw_passcode?: string; // only returned upon creation
  role: 'family' | 'caregiver';
  relationship: string;
  can_view: boolean;
  can_manage_meds: boolean;
  can_manage_appointments: boolean;
  can_add_notes: boolean;
  max_uses: number;
  uses_count: number;
  is_revoked: boolean;
  expires_at: string;
  created_at: string;
}

export interface RefillForecast {
  medication_id: string;
  medication_name: string;
  current_supply: number;
  daily_consumption: number;
  days_remaining: number;
  predicted_runout_date: string;
  is_low_stock: boolean;
  needs_urgent_refill: boolean;
}

export interface AdherencePattern {
  slot_name: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  time_window: string;
  total_scheduled: number;
  missed_count: number;
  missed_percentage: number;
  suggestion: string;
}

export interface AdherenceInsight {
  has_data: boolean;
  weekly_adherence_rate: number | null;
  monthly_adherence_rate: number | null;
  streak_days: number;
  total_scheduled_week: number;
  total_taken_week: number;
  total_missed_week: number;
  patterns: AdherencePattern[];
  disclaimer: string;
}

export interface Invitation {
  id: string;
  patient_id: string;
  invited_by: string;
  invited_email: string;
  relationship: string;
  role: 'family' | 'caregiver';
  token_hash: string;
  raw_token?: string; // only returned upon creation
  can_view: boolean;
  can_manage_meds: boolean;
  can_manage_appointments: boolean;
  can_add_notes: boolean;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at?: string;
  updated_at?: string;
}

export type DoseStatus = 'upcoming' | 'due_now' | 'taken' | 'missed' | 'skipped' | 'acknowledged';

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  category: string;
  dosage: string;
  strength?: string;
  frequency: string;
  times_of_day: string[]; // e.g. ["08:00", "20:00"]
  instructions?: string;
  prescribing_doctor?: string;
  pharmacy?: string;
  icon_type?: 'pill' | 'capsule' | 'liquid' | 'injection' | 'drops';
  refill_date?: string;
  total_supply?: number;
  remaining_supply?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MedicationAdministrationRecord {
  id: string;
  patient_id: string;
  medication_id: string;
  scheduled_time: string; // ISO string
  actual_time?: string;
  status: DoseStatus;
  recorded_by?: string;
  notes?: string;
  created_at?: string;
  // Hydrated field
  medication?: Medication;
  recorded_by_user?: UserProfile;
}

export interface PreparationTask {
  task: string;
  completed: boolean;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_name: string;
  specialty: string;
  hospital_clinic: string;
  address?: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  contact_number?: string;
  appointment_purpose: string;
  preparation_checklist: PreparationTask[];
  notes?: string;
  follow_up_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  reminder_24h_sent?: boolean;
  reminder_2h_sent?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WellbeingCheckin {
  id: string;
  patient_id: string;
  recorded_by: string;
  checkin_date: string; // YYYY-MM-DD
  mood: 'great' | 'good' | 'okay' | 'tired' | 'unwell';
  energy_level: number; // 1-5
  pain_level: number;   // 0-10
  symptoms: string[];
  notes?: string;
  created_at?: string;
}

export interface CareNote {
  id: string;
  patient_id: string;
  author_id: string;
  category: 'general' | 'medical' | 'diet' | 'vitals';
  title: string;
  content: string;
  is_priority: boolean;
  created_at?: string;
  updated_at?: string;
  author?: UserProfile;
}

export interface NotificationRecord {
  id: string;
  recipient_id: string;
  patient_id?: string;
  type: 'medication_reminder' | 'missed_dose' | 'appointment_reminder' | 'care_escalation' | 'refill_alert' | 'emergency_sos' | 'family_digest';
  title: string;
  message: string;
  channel: 'email' | 'in_app' | 'both';
  status: 'pending' | 'sent' | 'failed' | 'simulated';
  scheduled_for: string;
  sent_at?: string;
  metadata?: Record<string, any>;
  dedup_hash?: string;
  created_at?: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  upcoming_dose_minutes: number;
  missed_dose_grace_minutes: number;
  appointment_reminders_enabled: boolean;
  caregiver_escalation_enabled: boolean;
  daily_digest_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationDeliveryLog {
  id: string;
  notification_id: string;
  provider: 'resend' | 'simulator';
  status: 'delivered' | 'failed' | 'simulated';
  attempt_count: number;
  error_message?: string;
  response_payload?: Record<string, any>;
  created_at: string;
}


export interface EmergencyContact {
  id: string;
  patient_id: string;
  name: string;
  relationship: string;
  phone_number: string;
  is_primary: boolean;
  notify_on_sos: boolean;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  patient_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at: string;
  actor?: UserProfile;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  patient_id?: string; // If elderly, points to patient_profiles.id
}
