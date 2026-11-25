export type UserRole = 'elderly' | 'family' | 'caregiver' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  preferred_language?: 'en' | 'ta' | 'hi';
  patient_id?: string;
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
  profile?: UserProfile;
  relationship?: string;
  permissions?: {
    can_view: boolean;
    can_manage_meds: boolean;
    can_manage_appointments: boolean;
    can_add_notes: boolean;
  };
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
  member?: UserProfile;
}

export interface Invitation {
  id: string;
  patient_id: string;
  invited_email: string;
  relationship: string;
  role: 'family' | 'caregiver';
  raw_token?: string;
  invitation_code?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
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
  times_of_day: string[];
  instructions?: string;
  prescribing_doctor?: string;
  pharmacy?: string;
  icon_type?: 'pill' | 'capsule' | 'liquid' | 'injection' | 'drops';
  refill_date?: string;
  total_supply?: number;
  remaining_supply?: number;
  is_active: boolean;
}

export interface MedicationAdministrationRecord {
  id: string;
  patient_id: string;
  medication_id: string;
  scheduled_time: string;
  actual_time?: string;
  status: DoseStatus;
  recorded_by?: string;
  notes?: string;
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
  appointment_date: string;
  appointment_time: string;
  contact_number?: string;
  appointment_purpose: string;
  preparation_checklist: PreparationTask[];
  notes?: string;
  follow_up_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface WellbeingCheckin {
  id: string;
  patient_id: string;
  checkin_date: string;
  mood: 'great' | 'good' | 'okay' | 'tired' | 'unwell';
  energy_level: number;
  pain_level: number;
  symptoms: string[];
  notes?: string;
}

export interface CareNote {
  id: string;
  patient_id: string;
  author_id: string;
  category: 'general' | 'medical' | 'diet' | 'vitals';
  title: string;
  content: string;
  is_priority: boolean;
  created_at: string;
  author?: UserProfile;
}

export interface NotificationRecord {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  scheduled_for: string;
  sent_at?: string;
  metadata?: any;
  recipient?: UserProfile;
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
}

export interface DailyCareScore {
  date: string;
  timeZone: string;
  score: number | null;
  rating: 'Excellent' | 'Good' | 'Needs Attention' | 'In Progress';
  disclaimer: string;
  metrics: {
    scheduledDoses: number;
    completedDoses: number;
    pendingDoses: number;
    missedDoses: number;
    skippedDoses: number;
    dueDoses: number;
    upcomingDoses: number;
    recordedDoses: number;
    completedItems: number;
    routineItems: number;
    doseAdherencePercentage: number | null;
    wellbeingCheckinRecorded: boolean;
    upcomingAppointmentsCount: number;
  };
}

export interface AdherenceTrend {
  timeRangeDays: number;
  timeZone: string;
  averageAdherence: number | null;
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  totalSkipped: number;
  totalPending: number;
  dailyTrends: {
    date: string;
    dayName: string;
    scheduled: number;
    taken: number;
    missed: number;
    skipped: number;
    pending: number;
    adherenceRate: number | null;
  }[];
  categoryBreakdown: { category: string; total: number; taken: number; rate: number | null }[];
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  patient_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  created_at: string;
  actor?: UserProfile;
}
