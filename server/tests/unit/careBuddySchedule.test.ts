import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/db/storageAdapter.js';
import { CareBuddyService } from '../../src/services/careBuddyService.js';
import type { DoseStatus, MedicationAdministrationRecord } from '../../src/types/index.js';

const patientId = 'schedule-fixture';
const ask = (query = 'What pills do I have left today?') => CareBuddyService.askCareBuddy(patientId, query);
function slot(name: string, time: string, status: DoseStatus): MedicationAdministrationRecord {
  return {
    id: name, patient_id: patientId, medication_id: name, scheduled_time: time, status,
    medication: { id: name, patient_id: patientId, name, category: 'Fixture', dosage: 'As prescribed',
      frequency: 'Daily', times_of_day: [], is_active: true },
  };
}

describe('CareBuddy schedule answers', () => {
  const records: MedicationAdministrationRecord[] = [];
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-26T02:00:00Z')); // Nov 25 at 21:00 for the patient
    records.length = 0;
    vi.spyOn(db, 'getPatientTimeZone').mockReturnValue('America/New_York');
    vi.spyOn(db, 'getAdministrationRecords').mockReturnValue(records);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('lists unresolved doses in patient-local time order and distinguishes due from upcoming', async () => {
    records.push(slot('Later fixture', '2026-11-26T04:45:00Z', 'upcoming'), slot('Earlier fixture', '2026-11-26T01:15:00Z', 'upcoming'));
    const reply = (await ask()).reply;
    expect(reply).toContain('America/New_York');
    expect(reply).toMatch(/Earlier fixture[^\n]*20:15[^\n]*awaiting a record/i);
    expect(reply).toMatch(/Later fixture[^\n]*23:45[^\n]*upcoming/i);
    expect(reply.indexOf('Earlier fixture')).toBeLessThan(reply.indexOf('Later fixture'));
  });

  it('excludes recorded outcomes and adjacent patient-local dates', async () => {
    records.push(slot('Open fixture', '2026-11-26T03:00:00Z', 'upcoming'),
      slot('Taken fixture', '2026-11-25T20:00:00Z', 'taken'), slot('Skipped fixture', '2026-11-25T21:00:00Z', 'skipped'),
      slot('Missed fixture', '2026-11-25T22:00:00Z', 'missed'), slot('Other day', '2026-11-26T05:15:00Z', 'upcoming'));
    const reply = (await ask()).reply;
    expect(reply).toContain('Open fixture');
    expect(reply).not.toMatch(/Taken fixture|Skipped fixture|Missed fixture|Other day/);
  });

  it('keeps an acknowledged reminder visible until a dose outcome is recorded', async () => {
    records.push(slot('Ack fixture', '2026-11-26T02:00:00Z', 'acknowledged'));
    expect((await ask()).reply).toMatch(/Ack fixture[^\n]*21:00[^\n]*awaiting a record/i);
  });

  it('reports an empty schedule without asserting completion', async () => {
    expect((await ask()).reply).toMatch(/no doses (?:are )?scheduled/i);
  });

  it('distinguishes a fully recorded schedule from an empty one', async () => {
    records.push(slot('Closed fixture', '2026-11-26T01:00:00Z', 'skipped'));
    expect((await ask()).reply).toMatch(/all scheduled doses have a recorded outcome/i);
  });

  it.each(['What should I do if I miss a dose?', 'What happens if I miss a dose?'])('routes the suggested question "%s" to a clinician', async query => {
    expect((await ask(query)).reply).toMatch(/prescribing clinic or local pharmacist/);
  });
});
