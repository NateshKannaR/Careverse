import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/db/storageAdapter.js';
import { CareBuddyService } from '../../src/services/careBuddyService.js';
import { CareScoreService } from '../../src/services/careScoreService.js';
import type { DoseStatus, MedicationAdministrationRecord, PatientProfile, UserProfile, WellbeingCheckin } from '../../src/types/index.js';

const patientId = 'synthetic-patient';
const profile: UserProfile = {
  id: 'synthetic-user', full_name: 'Demo patient', email: 'evidence@careverse.demo',
  role: 'elderly', timezone: 'America/New_York',
};
const patient: PatientProfile = { id: patientId, user_id: profile.id };
const checkin: WellbeingCheckin = {
  id: 'synthetic-checkin', patient_id: patientId, recorded_by: profile.id, checkin_date: '2026-11-25',
  mood: 'good', symptoms: [], energy_level: 4, pain_level: 0,
};

function dose(scheduled_time: string, status: DoseStatus): MedicationAdministrationRecord {
  return { id: scheduled_time, patient_id: patientId, medication_id: 'synthetic-medication', scheduled_time, status };
}

describe('Daily care evidence accuracy', () => {
  let records: MedicationAdministrationRecord[];
  let wellbeing: WellbeingCheckin[];

  beforeEach(() => {
    records = [];
    wellbeing = [];
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-25T18:00:00Z'));
    vi.spyOn(db, 'getPatientProfileById').mockReturnValue(patient);
    vi.spyOn(db, 'getProfileById').mockReturnValue(profile);
    vi.spyOn(db, 'getAppointments').mockReturnValue([]);
    vi.spyOn(db, 'getMedications').mockReturnValue([]);
    vi.spyOn(db, 'getAdministrationRecords').mockImplementation((_, start, end) => records.filter(record =>
      (!start || record.scheduled_time >= start) && (!end || record.scheduled_time <= end)));
    vi.spyOn(db, 'getWellbeingCheckins').mockImplementation(() => wellbeing);
    if (typeof db.getWellbeingCheckinForDate === 'function') {
      vi.spyOn(db, 'getWellbeingCheckinForDate').mockImplementation((_, date) =>
        wellbeing.find(item => item.checkin_date === date));
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('withholds the score and adherence rate when there is no recorded activity', () => {
    const outcome = CareScoreService.calculateDailyCareScore(patientId);
    expect(outcome.score).toBeNull();
    expect(outcome.metrics.doseAdherencePercentage).toBeNull();
  });

  it('ignores a future scheduled dose for scoring even if it has a status', () => {
    records.push(dose('2026-11-25T23:00:00Z', 'taken'));
    const outcome = CareScoreService.calculateDailyCareScore(patientId);
    expect(outcome.score).toBeNull();
    expect(outcome.metrics.completedDoses).toBe(0);
  });

  it('counts skipped doses in the known outcome denominator', () => {
    records.push(dose('2026-11-25T13:00:00Z', 'taken'), dose('2026-11-25T14:00:00Z', 'skipped'));
    expect(CareScoreService.calculateDailyCareScore(patientId).metrics.doseAdherencePercentage).toBe(50);
  });

  it('does not treat due records without outcomes as completed', () => {
    records.push(dose('2026-11-25T13:00:00Z', 'acknowledged'));
    expect(CareScoreService.calculateDailyCareScore(patientId)).toMatchObject({ score: null, rating: 'In Progress' });
  });

  it('counts only checked activities in the routine numerator', () => {
    records.push(dose('2026-11-25T13:00:00Z', 'taken'), dose('2026-11-25T14:00:00Z', 'due_now'));
    wellbeing.push(checkin);
    expect(CareScoreService.calculateDailyCareScore(patientId).score).toBe(67);
  });

  it('uses the previous local date after UTC midnight', () => {
    vi.setSystemTime(new Date('2026-11-26T02:00:00Z'));
    records.push(dose('2026-11-26T01:00:00Z', 'missed'), dose('2026-11-25T22:00:00Z', 'taken'));
    expect(CareScoreService.calculateDailyCareScore(patientId)).toMatchObject({
      date: '2026-11-25', metrics: { missedDoses: 1, completedDoses: 1, doseAdherencePercentage: 50 },
    });
  });

  it('counts distinct doses after the repeated DST hour', () => {
    vi.setSystemTime(new Date('2026-11-02T02:00:00Z'));
    records.push(dose('2026-11-01T05:30:00Z', 'taken'), dose('2026-11-01T06:30:00Z', 'missed'));
    expect(CareScoreService.calculateDailyCareScore(patientId)).toMatchObject({
      date: '2026-11-01', metrics: { completedDoses: 1, missedDoses: 1 },
    });
  });

  it('gives full completion when a recorded check-in is the only routine item due', () => {
    wellbeing.push(checkin);
    expect(CareScoreService.calculateDailyCareScore(patientId).score).toBe(100);
  });

  it('shows no numeric routine claim in the family digest if no outcomes exist', () => {
    expect(CareBuddyService.generateFamilyDigest(patientId)).toContain('Routine Completion: No activity recorded yet');
  });

  it('separates missed, skipped, and unresolved doses in the assistant summary', async () => {
    records.push(
      dose('2026-11-25T12:00:00Z', 'missed'),
      dose('2026-11-25T13:00:00Z', 'skipped'),
      dose('2026-11-25T14:00:00Z', 'due_now'),
    );
    const response = await CareBuddyService.askCareBuddy(patientId, 'Summarize my routine today');
    expect(response.reply).toContain('0 taken, 1 missed, 1 skipped, 1 awaiting a record');
  });

  it('handles a dosing question before a mixed daily-summary request', async () => {
    const response = await CareBuddyService.askCareBuddy(patientId, 'I missed my dose today. Should I take two?');
    expect(response.reply).toContain('Contact your prescribing clinic or local pharmacist');
    expect(response.reply).not.toContain('skip the missed dose');
  });
});
