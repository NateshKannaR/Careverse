import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  UserProfile,
  PatientProfile,
  CareCircleMember,
  Invitation,
  Medication,
  MedicationAdministrationRecord,
  Appointment,
  WellbeingCheckin,
  CareNote,
  NotificationRecord,
  NotificationPreferences,
  NotificationDeliveryLog,
  EmergencyContact,
  AuditLog,
  PasscodeInvite
} from '../types/index.js';

interface DatabaseStore {
  profiles: UserProfile[];
  patientProfiles: PatientProfile[];
  careCircleMembers: CareCircleMember[];
  invitations: Invitation[];
  passcodeInvites: PasscodeInvite[];
  medications: Medication[];
  administrationRecords: MedicationAdministrationRecord[];
  appointments: Appointment[];
  wellbeingCheckins: WellbeingCheckin[];
  careNotes: CareNote[];
  notifications: NotificationRecord[];
  notificationPreferences: NotificationPreferences[];
  deliveryLogs: NotificationDeliveryLog[];
  emergencyContacts: EmergencyContact[];
  auditLogs: AuditLog[];
}

const STORAGE_FILE_PATH = process.env.VERCEL
  ? path.resolve('/tmp', '.storage_careverse.json')
  : path.resolve(process.cwd(), '.storage_careverse.json');

class StorageAdapter {
  private store: DatabaseStore = {
    profiles: [],
    patientProfiles: [],
    careCircleMembers: [],
    invitations: [],
    passcodeInvites: [],
    medications: [],
    administrationRecords: [],
    appointments: [],
    wellbeingCheckins: [],
    careNotes: [],
    notifications: [],
    notificationPreferences: [],
    deliveryLogs: [],
    emergencyContacts: [],
    auditLogs: []
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(STORAGE_FILE_PATH)) {
        const raw = fs.readFileSync(STORAGE_FILE_PATH, 'utf-8');
        this.store = JSON.parse(raw);
        console.log('[StorageAdapter] Loaded persistent state from file:', STORAGE_FILE_PATH);
      } else {
        const bundledPath = path.resolve(process.cwd(), '.storage_careverse.json');
        if (bundledPath !== STORAGE_FILE_PATH && fs.existsSync(bundledPath)) {
          try {
            const raw = fs.readFileSync(bundledPath, 'utf-8');
            this.store = JSON.parse(raw);
            console.log('[StorageAdapter] Loaded state from bundled seed file.');
          } catch {
            this.seedInitialData();
          }
        } else {
          this.seedInitialData();
        }
        this.persist();
        console.log('[StorageAdapter] Initialized with realistic demo healthcare seed data.');
      }
    } catch (err) {
      console.warn('[StorageAdapter] Warning reading storage file, re-seeding demo data:', err);
      this.seedInitialData();
      this.persist();
    }
  }

  public persist() {
    try {
      fs.writeFileSync(STORAGE_FILE_PATH, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.error('[StorageAdapter] Error persisting store to disk:', err);
    }
  }

  public seedInitialData() {
    const passwordHash = bcrypt.hashSync('Demo1234!', 10);
    const today = new Date().toISOString().split('T')[0];

    // Profiles
    const eleanor: UserProfile = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'eleanor@careverse.demo',
      password_hash: passwordHash,
      full_name: 'Eleanor Vance',
      role: 'elderly',
      phone: '+1 (555) 234-5678',
      preferred_language: 'en',
      timezone: 'America/New_York',
      created_at: new Date().toISOString()
    };

    const david: UserProfile = {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'david@careverse.demo',
      password_hash: passwordHash,
      full_name: 'David Vance',
      role: 'family',
      phone: '+1 (555) 345-6789',
      preferred_language: 'en',
      timezone: 'America/New_York',
      created_at: new Date().toISOString()
    };

    const sarah: UserProfile = {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'sarah@careverse.demo',
      password_hash: passwordHash,
      full_name: 'Sarah Jenkins, RN',
      role: 'caregiver',
      phone: '+1 (555) 456-7890',
      preferred_language: 'en',
      timezone: 'America/New_York',
      created_at: new Date().toISOString()
    };

    const admin: UserProfile = {
      id: '44444444-4444-4444-4444-444444444444',
      email: 'admin@careverse.demo',
      password_hash: passwordHash,
      full_name: 'Dr. Marcus Chen',
      role: 'admin',
      phone: '+1 (555) 999-0000',
      preferred_language: 'en',
      timezone: 'America/New_York',
      created_at: new Date().toISOString()
    };

    this.store.profiles = [eleanor, david, sarah, admin];

    // Patient Profile
    const patientProfile: PatientProfile = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      user_id: eleanor.id,
      date_of_birth: '1950-04-12',
      blood_group: 'O+',
      primary_condition: 'Hypertension, Type 2 Diabetes, Mild Osteoarthritis',
      emergency_notes: 'Keep walker nearby. Penicillin allergy. Daughter lives 10 miles away.',
      primary_address: '742 Evergreen Terrace, Springfield, OR 97477',
      allergies: ['Penicillin', 'Sulfa drugs'],
      created_at: new Date().toISOString()
    };

    this.store.patientProfiles = [patientProfile];

    // Care Circle Members
    this.store.careCircleMembers = [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
        patient_id: patientProfile.id,
        member_user_id: david.id,
        relationship: 'Son (Family Guardian)',
        can_view: true,
        can_manage_meds: false,
        can_manage_appointments: true,
        can_add_notes: true,
        status: 'active',
        permissions: {
          medications: true,
          appointments: true,
          wellbeing: true,
          care_notes: true
        },
        created_at: new Date().toISOString()
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
        patient_id: patientProfile.id,
        member_user_id: sarah.id,
        relationship: 'Primary Home Health Nurse',
        can_view: true,
        can_manage_meds: true,
        can_manage_appointments: true,
        can_add_notes: true,
        status: 'active',
        permissions: {
          medications: true,
          appointments: true,
          wellbeing: true,
          care_notes: true
        },
        created_at: new Date().toISOString()
      }
    ];

    // Seed Demo Passcode Invite (CARE-2026 for evaluators)
    this.store.passcodeInvites = [
      {
        id: 'pppppppp-pppp-pppp-pppp-ppppppppppp1',
        patient_id: patientProfile.id,
        created_by: eleanor.id,
        passcode_hash: bcrypt.hashSync('CARE-2026', 10),
        passcode_prefix: 'CA',
        raw_passcode: 'CARE-2026',
        role: 'family',
        relationship: 'Family Caregiver',
        can_view: true,
        can_manage_meds: true,
        can_manage_appointments: true,
        can_add_notes: true,
        max_uses: 10,
        uses_count: 0,
        is_revoked: false,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        created_at: new Date().toISOString()
      }
    ];

    // Emergency Contacts
    this.store.emergencyContacts = [
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
        patient_id: patientProfile.id,
        name: 'David Vance',
        relationship: 'Son',
        phone_number: '+1 (555) 345-6789',
        is_primary: true,
        notify_on_sos: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
        patient_id: patientProfile.id,
        name: 'Sarah Jenkins, RN',
        relationship: 'Home Nurse',
        phone_number: '+1 (555) 456-7890',
        is_primary: false,
        notify_on_sos: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3',
        patient_id: patientProfile.id,
        name: 'Springfield Metro Emergency Services',
        relationship: 'Emergency Dispatch',
        phone_number: '911 / 112',
        is_primary: false,
        notify_on_sos: false,
        created_at: new Date().toISOString()
      }
    ];

    // Medications
    const med1: Medication = {
      id: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm1',
      patient_id: patientProfile.id,
      name: 'Lisinopril',
      category: 'Blood Pressure',
      dosage: '1 Tablet',
      strength: '10mg',
      frequency: 'Once daily',
      times_of_day: ['08:00'],
      instructions: 'Take in the morning with a full glass of water. Do not skip.',
      prescribing_doctor: 'Dr. Robert Mehta',
      pharmacy: 'CVS Pharmacy #4102',
      icon_type: 'pill',
      refill_date: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
      total_supply: 30,
      remaining_supply: 18,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const med2: Medication = {
      id: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm2',
      patient_id: patientProfile.id,
      name: 'Metformin HCl',
      category: 'Diabetes',
      dosage: '1 Tablet',
      strength: '500mg',
      frequency: 'Twice daily',
      times_of_day: ['08:00', '19:00'],
      instructions: 'Take with breakfast and dinner to avoid upset stomach.',
      prescribing_doctor: 'Dr. Priya Sharma',
      pharmacy: 'Walgreens #8819',
      icon_type: 'capsule',
      refill_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      total_supply: 60,
      remaining_supply: 14,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const med3: Medication = {
      id: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm3',
      patient_id: patientProfile.id,
      name: 'Atorvastatin',
      category: 'Cholesterol',
      dosage: '1 Tablet',
      strength: '20mg',
      frequency: 'Once daily',
      times_of_day: ['21:00'],
      instructions: 'Take before bedtime.',
      prescribing_doctor: 'Dr. Robert Mehta',
      pharmacy: 'CVS Pharmacy #4102',
      icon_type: 'pill',
      refill_date: new Date(Date.now() + 22 * 86400000).toISOString().split('T')[0],
      total_supply: 30,
      remaining_supply: 26,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const med4: Medication = {
      id: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmm4',
      patient_id: patientProfile.id,
      name: 'Glucosamine & Chondroitin',
      category: 'Joint Health',
      dosage: '2 Capsules',
      strength: '1500mg',
      frequency: 'Once daily',
      times_of_day: ['12:00'],
      instructions: 'Take with lunch for joint stiffness.',
      prescribing_doctor: 'Dr. Eleanor Campbell',
      pharmacy: 'Costco Pharmacy',
      icon_type: 'capsule',
      refill_date: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
      total_supply: 60,
      remaining_supply: 52,
      is_active: true,
      created_at: new Date().toISOString()
    };

    this.store.medications = [med1, med2, med3, med4];

    // Today's Doses
    const morningIso = `${today}T08:00:00.000Z`;
    const noonIso = `${today}T12:00:00.000Z`;
    const eveningIso = `${today}T19:00:00.000Z`;
    const nightIso = `${today}T21:00:00.000Z`;

    this.store.administrationRecords = [
      {
        id: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr1',
        patient_id: patientProfile.id,
        medication_id: med1.id,
        scheduled_time: morningIso,
        actual_time: `${today}T08:05:00.000Z`,
        status: 'taken',
        recorded_by: eleanor.id,
        notes: 'Taken with warm oatmeal.',
        created_at: new Date().toISOString()
      },
      {
        id: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr2',
        patient_id: patientProfile.id,
        medication_id: med2.id,
        scheduled_time: morningIso,
        actual_time: `${today}T08:06:00.000Z`,
        status: 'taken',
        recorded_by: eleanor.id,
        notes: 'Taken with breakfast.',
        created_at: new Date().toISOString()
      },
      {
        id: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr3',
        patient_id: patientProfile.id,
        medication_id: med4.id,
        scheduled_time: noonIso,
        actual_time: `${today}T12:15:00.000Z`,
        status: 'taken',
        recorded_by: sarah.id,
        notes: 'Administered during lunch visit.',
        created_at: new Date().toISOString()
      },
      {
        id: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr4',
        patient_id: patientProfile.id,
        medication_id: med2.id,
        scheduled_time: eveningIso,
        status: 'upcoming',
        created_at: new Date().toISOString()
      },
      {
        id: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrr5',
        patient_id: patientProfile.id,
        medication_id: med3.id,
        scheduled_time: nightIso,
        status: 'upcoming',
        created_at: new Date().toISOString()
      }
    ];

    // Appointments
    const apptDate1 = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const apptDate2 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    this.store.appointments = [
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc1',
        patient_id: patientProfile.id,
        doctor_name: 'Dr. Robert Mehta',
        specialty: 'Cardiologist',
        hospital_clinic: 'Springfield Heart & Vascular Institute',
        address: '100 Medical Center Dr, Suite 300, Springfield, OR',
        appointment_date: apptDate1,
        appointment_time: '10:30',
        contact_number: '+1 (555) 789-1122',
        appointment_purpose: 'Routine 6-month blood pressure and cardiac review',
        preparation_checklist: [
          { task: 'Bring morning BP log of past 2 weeks', completed: true },
          { task: 'Fasting blood sample at 08:00 AM', completed: false },
          { task: 'Carry list of current active medications', completed: true }
        ],
        notes: 'Son David will accompany Eleanor in the morning.',
        status: 'scheduled',
        created_at: new Date().toISOString()
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc2',
        patient_id: patientProfile.id,
        doctor_name: 'Dr. Priya Sharma',
        specialty: 'Endocrinologist',
        hospital_clinic: 'Willamette Health Center',
        address: '450 Oak Grove Blvd, Springfield, OR',
        appointment_date: apptDate2,
        appointment_time: '14:00',
        contact_number: '+1 (555) 890-3344',
        appointment_purpose: 'Quarterly HbA1c and Diabetic Foot Check',
        preparation_checklist: [
          { task: 'HbA1c Lab test 3 days prior', completed: false },
          { task: 'Wear comfortable shoes for foot examination', completed: false }
        ],
        notes: 'Check blood sugar records for past month.',
        status: 'scheduled',
        created_at: new Date().toISOString()
      }
    ];

    // Wellbeing Checkin
    this.store.wellbeingCheckins = [
      {
        id: 'wwwwwwww-wwww-wwww-wwww-wwwwwwwwwww1',
        patient_id: patientProfile.id,
        recorded_by: eleanor.id,
        checkin_date: today,
        mood: 'good',
        energy_level: 4,
        pain_level: 2,
        symptoms: ['Mild morning knee stiffness'],
        notes: 'Had a peaceful walk in the garden. Drank plenty of water.',
        created_at: new Date().toISOString()
      }
    ];

    // Care Notes
    this.store.careNotes = [
      {
        id: 'nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnn01',
        patient_id: patientProfile.id,
        author_id: sarah.id,
        category: 'vitals',
        title: 'Morning Vitals Recorded',
        content: 'Blood pressure: 122/78 mmHg. Pulse: 72 bpm. Blood sugar: 110 mg/dL (fasting). Eleanor was energetic and cheerful.',
        is_priority: false,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnn02',
        patient_id: patientProfile.id,
        author_id: david.id,
        category: 'general',
        title: 'Weekend Grocery & Fresh Fruit Delivery',
        content: 'Stocked fresh blueberries, low-sodium vegetable soup, and herbal teas. Checked pantry for expired items.',
        is_priority: false,
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    // Notifications
    this.store.notifications = [
      {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffff01',
        recipient_id: eleanor.id,
        patient_id: patientProfile.id,
        type: 'medication_reminder',
        title: 'Morning Doses Recorded',
        message: 'Your morning Lisinopril and Metformin doses were successfully marked as taken.',
        channel: 'both',
        status: 'sent',
        scheduled_for: new Date(Date.now() - 3600000).toISOString(),
        sent_at: new Date(Date.now() - 3590000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffff02',
        recipient_id: david.id,
        patient_id: patientProfile.id,
        type: 'medication_reminder',
        title: 'Family Update: Eleanor took morning doses',
        message: 'Eleanor recorded her scheduled morning medications on time today.',
        channel: 'email',
        status: 'sent',
        scheduled_for: new Date(Date.now() - 3600000).toISOString(),
        sent_at: new Date(Date.now() - 3590000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    // Notification Preferences
    this.store.notificationPreferences = [
      {
        id: uuidv4(),
        user_id: eleanor.id,
        email_enabled: true,
        upcoming_dose_minutes: 15,
        missed_dose_grace_minutes: 30,
        appointment_reminders_enabled: true,
        caregiver_escalation_enabled: true,
        daily_digest_enabled: true,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        user_id: david.id,
        email_enabled: true,
        upcoming_dose_minutes: 15,
        missed_dose_grace_minutes: 30,
        appointment_reminders_enabled: true,
        caregiver_escalation_enabled: true,
        daily_digest_enabled: true,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        user_id: sarah.id,
        email_enabled: true,
        upcoming_dose_minutes: 15,
        missed_dose_grace_minutes: 30,
        appointment_reminders_enabled: true,
        caregiver_escalation_enabled: true,
        daily_digest_enabled: true,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        user_id: admin.id,
        email_enabled: true,
        upcoming_dose_minutes: 15,
        missed_dose_grace_minutes: 30,
        appointment_reminders_enabled: true,
        caregiver_escalation_enabled: true,
        daily_digest_enabled: true,
        created_at: new Date().toISOString()
      }
    ];

    // Audit logs
    this.store.auditLogs = [
      {
        id: uuidv4(),
        actor_id: eleanor.id,
        patient_id: patientProfile.id,
        action: 'LOGIN',
        resource_type: 'SESSION',
        resource_id: eleanor.email,
        details: { role: 'elderly', client: 'Web App' },
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: uuidv4(),
        actor_id: eleanor.id,
        patient_id: patientProfile.id,
        action: 'MEDICATION_ADMINISTERED',
        resource_type: 'MEDICATION',
        resource_id: med1.id,
        details: { status: 'taken', name: 'Lisinopril' },
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: uuidv4(),
        actor_id: sarah.id,
        patient_id: patientProfile.id,
        action: 'CARE_NOTE_ADDED',
        resource_type: 'CARE_NOTE',
        resource_id: 'nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnn01',
        details: { title: 'Morning Vitals Recorded' },
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }

  // --- Profiles & Users ---
  public getProfileByEmail(email: string): UserProfile | undefined {
    return this.store.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  }

  public getProfileById(id: string): UserProfile | undefined {
    return this.store.profiles.find(p => p.id === id);
  }

  public createProfile(profile: UserProfile): UserProfile {
    this.store.profiles.push(profile);
    this.persist();
    return profile;
  }

  public getAllProfiles(): UserProfile[] {
    return [...this.store.profiles];
  }

  // --- Patient Profiles ---
  public getPatientProfileByUserId(userId: string): PatientProfile | undefined {
    return this.store.patientProfiles.find(p => p.user_id === userId);
  }

  public getPatientProfileById(id: string): PatientProfile | undefined {
    return this.store.patientProfiles.find(p => p.id === id);
  }

  public getAllPatientProfiles(): PatientProfile[] {
    return [...this.store.patientProfiles];
  }

  public createPatientProfile(profile: PatientProfile): PatientProfile {
    this.store.patientProfiles.push(profile);
    this.persist();
    return profile;
  }

  public updatePatientProfile(id: string, updates: Partial<PatientProfile>): PatientProfile | null {
    const idx = this.store.patientProfiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.store.patientProfiles[idx] = {
      ...this.store.patientProfiles[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.store.patientProfiles[idx];
  }

  // --- Care Circle Members ---
  public getCareCircleMembers(patientId: string): CareCircleMember[] {
    return this.store.careCircleMembers
      .filter(m => m.patient_id === patientId && m.status === 'active')
      .map(m => ({
        ...m,
        member: this.getProfileById(m.member_user_id)
      }));
  }

  public getCareCircleMembershipsForUser(userId: string): CareCircleMember[] {
    return this.store.careCircleMembers.filter(m => m.member_user_id === userId && m.status === 'active');
  }

  public isMemberOfPatientCareCircle(patientId: string, userId: string): boolean {
    return this.store.careCircleMembers.some(
      m => m.patient_id === patientId && m.member_user_id === userId && m.status === 'active'
    );
  }

  public getCareCircleMember(patientId: string, userId: string): CareCircleMember | undefined {
    return this.store.careCircleMembers.find(
      m => m.patient_id === patientId && m.member_user_id === userId && m.status === 'active'
    );
  }

  public addCareCircleMember(member: CareCircleMember): CareCircleMember {
    this.store.careCircleMembers.push(member);
    this.persist();
    return member;
  }

  public updateCareCircleMember(id: string, updates: Partial<CareCircleMember>): CareCircleMember | null {
    const idx = this.store.careCircleMembers.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.store.careCircleMembers[idx] = {
      ...this.store.careCircleMembers[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.store.careCircleMembers[idx];
  }

  // --- Invitations ---
  public createInvitation(invitation: Invitation): Invitation {
    this.store.invitations.push(invitation);
    this.persist();
    return invitation;
  }

  public getInvitationByHash(hash: string): Invitation | undefined {
    return this.store.invitations.find(i => i.token_hash === hash && i.status === 'pending');
  }

  public getInvitationsForPatient(patientId: string): Invitation[] {
    return this.store.invitations.filter(i => i.patient_id === patientId);
  }

  public updateInvitation(id: string, updates: Partial<Invitation>): Invitation | null {
    const idx = this.store.invitations.findIndex(i => i.id === id);
    if (idx === -1) return null;
    this.store.invitations[idx] = {
      ...this.store.invitations[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.store.invitations[idx];
  }

  // --- Passcode Invites ---
  public createPasscodeInvite(invite: PasscodeInvite): PasscodeInvite {
    if (!this.store.passcodeInvites) this.store.passcodeInvites = [];
    this.store.passcodeInvites.push(invite);
    this.persist();
    return invite;
  }

  public getPasscodeInvitesForPatient(patientId: string): PasscodeInvite[] {
    return (this.store.passcodeInvites || []).filter(p => p.patient_id === patientId && !p.is_revoked);
  }

  public getAllActivePasscodeInvites(): PasscodeInvite[] {
    return (this.store.passcodeInvites || []).filter(p => !p.is_revoked);
  }

  public getPasscodeInviteById(id: string): PasscodeInvite | undefined {
    return (this.store.passcodeInvites || []).find(p => p.id === id);
  }

  public updatePasscodeInvite(id: string, updates: Partial<PasscodeInvite>): PasscodeInvite | null {
    if (!this.store.passcodeInvites) this.store.passcodeInvites = [];
    const idx = this.store.passcodeInvites.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.store.passcodeInvites[idx] = {
      ...this.store.passcodeInvites[idx],
      ...updates
    };
    this.persist();
    return this.store.passcodeInvites[idx];
  }

  public getPendingCareCircleMembers(patientId: string): CareCircleMember[] {
    return this.store.careCircleMembers
      .filter(m => m.patient_id === patientId && m.status === 'pending')
      .map(m => ({
        ...m,
        member: this.getProfileById(m.member_user_id)
      }));
  }

  public getCareCircleMemberById(id: string): CareCircleMember | undefined {
    return this.store.careCircleMembers.find(m => m.id === id);
  }

  // --- Medications ---
  public getMedications(patientId: string, activeOnly: boolean = false): Medication[] {
    return this.store.medications.filter(
      m => m.patient_id === patientId && (!activeOnly || m.is_active)
    );
  }

  public getMedicationById(id: string): Medication | undefined {
    return this.store.medications.find(m => m.id === id);
  }

  public createMedication(medication: Medication): Medication {
    this.store.medications.push(medication);
    this.persist();
    return medication;
  }

  public updateMedication(id: string, updates: Partial<Medication>): Medication | null {
    const idx = this.store.medications.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.store.medications[idx] = {
      ...this.store.medications[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.store.medications[idx];
  }

  public deleteMedication(id: string): boolean {
    const idx = this.store.medications.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this.store.medications.splice(idx, 1);
    // Also remove associated administration records
    this.store.administrationRecords = this.store.administrationRecords.filter(r => r.medication_id !== id);
    this.persist();
    return true;
  }

  // --- Administration Records (Doses) ---
  public getAdministrationRecords(patientId: string, startDate?: string, endDate?: string): MedicationAdministrationRecord[] {
    let records = this.store.administrationRecords.filter(r => r.patient_id === patientId);
    if (startDate) {
      records = records.filter(r => r.scheduled_time >= startDate);
    }
    if (endDate) {
      records = records.filter(r => r.scheduled_time <= endDate);
    }
    return records.map(r => ({
      ...r,
      medication: this.getMedicationById(r.medication_id),
      recorded_by_user: r.recorded_by ? this.getProfileById(r.recorded_by) : undefined
    }));
  }

  public getAdministrationRecordById(id: string): MedicationAdministrationRecord | undefined {
    return this.store.administrationRecords.find(r => r.id === id);
  }

  public createAdministrationRecord(record: MedicationAdministrationRecord): MedicationAdministrationRecord {
    // Check for duplicate administration record
    const exists = this.store.administrationRecords.some(
      r => r.patient_id === record.patient_id &&
           r.medication_id === record.medication_id &&
           r.scheduled_time === record.scheduled_time
    );
    if (exists) {
      throw new Error('An administration record already exists for this scheduled time.');
    }
    this.store.administrationRecords.push(record);
    this.persist();
    return record;
  }

  public updateAdministrationRecord(id: string, updates: Partial<MedicationAdministrationRecord>): MedicationAdministrationRecord | null {
    const idx = this.store.administrationRecords.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.store.administrationRecords[idx] = {
      ...this.store.administrationRecords[idx],
      ...updates
    };
    this.persist();
    return this.store.administrationRecords[idx];
  }

  // --- Appointments ---
  public getAppointments(patientId: string): Appointment[] {
    return this.store.appointments.filter(a => a.patient_id === patientId);
  }

  public getAppointmentById(id: string): Appointment | undefined {
    return this.store.appointments.find(a => a.id === id);
  }

  public createAppointment(appointment: Appointment): Appointment {
    this.store.appointments.push(appointment);
    this.persist();
    return appointment;
  }

  public updateAppointment(id: string, updates: Partial<Appointment>): Appointment | null {
    const idx = this.store.appointments.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.store.appointments[idx] = {
      ...this.store.appointments[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.store.appointments[idx];
  }

  public deleteAppointment(id: string): boolean {
    const idx = this.store.appointments.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.store.appointments.splice(idx, 1);
    this.persist();
    return true;
  }

  // --- Wellbeing Check-ins ---
  public getWellbeingCheckinToday(patientId: string): WellbeingCheckin | undefined {
    const today = new Date().toISOString().split('T')[0];
    return this.store.wellbeingCheckins.find(
      w => w.patient_id === patientId && w.checkin_date === today
    );
  }

  public getWellbeingCheckins(patientId: string, limit: number = 30): WellbeingCheckin[] {
    return this.store.wellbeingCheckins
      .filter(w => w.patient_id === patientId)
      .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))
      .slice(0, limit);
  }

  public recordWellbeingCheckin(checkin: WellbeingCheckin): WellbeingCheckin {
    const idx = this.store.wellbeingCheckins.findIndex(
      w => w.patient_id === checkin.patient_id && w.checkin_date === checkin.checkin_date
    );
    if (idx >= 0) {
      this.store.wellbeingCheckins[idx] = checkin;
    } else {
      this.store.wellbeingCheckins.push(checkin);
    }
    this.persist();
    return checkin;
  }

  // --- Care Notes ---
  public getCareNotes(patientId: string): CareNote[] {
    return this.store.careNotes
      .filter(n => n.patient_id === patientId)
      .map(n => ({
        ...n,
        author: this.getProfileById(n.author_id)
      }))
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }

  public createCareNote(note: CareNote): CareNote {
    this.store.careNotes.push(note);
    this.persist();
    return note;
  }

  // --- Notifications ---
  public getNotificationsForUser(userId: string): NotificationRecord[] {
    return this.store.notifications
      .filter(n => n.recipient_id === userId)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }

  public createNotification(notification: NotificationRecord): NotificationRecord {
    this.store.notifications.push(notification);
    this.persist();
    return notification;
  }

  public getAllNotifications(): NotificationRecord[] {
    return [...this.store.notifications];
  }

  public getNotificationPreferences(userId: string): NotificationPreferences | undefined {
    return this.store.notificationPreferences.find(p => p.user_id === userId);
  }

  public updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>): NotificationPreferences {
    let pref = this.store.notificationPreferences.find(p => p.user_id === userId);
    if (!pref) {
      pref = {
        id: uuidv4(),
        user_id: userId,
        email_enabled: true,
        upcoming_dose_minutes: 15,
        missed_dose_grace_minutes: 30,
        appointment_reminders_enabled: true,
        caregiver_escalation_enabled: true,
        daily_digest_enabled: true,
        created_at: new Date().toISOString(),
        ...updates
      };
      this.store.notificationPreferences.push(pref);
    } else {
      Object.assign(pref, updates, { updated_at: new Date().toISOString() });
    }
    this.persist();
    return pref;
  }

  // --- Delivery Logs ---
  public createDeliveryLog(log: NotificationDeliveryLog): NotificationDeliveryLog {
    if (!this.store.deliveryLogs) this.store.deliveryLogs = [];
    this.store.deliveryLogs.push(log);
    this.persist();
    return log;
  }

  public getDeliveryLogs(notificationId?: string): NotificationDeliveryLog[] {
    if (!this.store.deliveryLogs) this.store.deliveryLogs = [];
    if (notificationId) {
      return this.store.deliveryLogs.filter(l => l.notification_id === notificationId);
    }
    return [...this.store.deliveryLogs];
  }

  // --- Emergency Contacts ---
  public getEmergencyContacts(patientId: string): EmergencyContact[] {
    return this.store.emergencyContacts.filter(c => c.patient_id === patientId);
  }

  public createEmergencyContact(contact: EmergencyContact): EmergencyContact {
    this.store.emergencyContacts.push(contact);
    this.persist();
    return contact;
  }

  // --- Audit Logs ---
  public logAudit(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const fullLog: AuditLog = {
      ...log,
      id: uuidv4(),
      created_at: new Date().toISOString()
    };
    this.store.auditLogs.unshift(fullLog);
    if (this.store.auditLogs.length > 500) {
      this.store.auditLogs.pop(); // keep recent 500
    }
    this.persist();
    return fullLog;
  }

  public getAuditLogs(patientId?: string): AuditLog[] {
    let logs = this.store.auditLogs;
    if (patientId) {
      logs = logs.filter(l => l.patient_id === patientId);
    }
    return logs.map(l => ({
      ...l,
      actor: l.actor_id ? this.getProfileById(l.actor_id) : undefined
    }));
  }
}

export const db = new StorageAdapter();
