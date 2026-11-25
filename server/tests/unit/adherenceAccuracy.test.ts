import { describe, expect, it } from 'vitest';
import { generateAdherenceInsight } from '../../src/services/adherencePatternService.js';
import type { DoseStatus, Medication, MedicationAdministrationRecord } from '../../src/types/index.js';

const now = new Date('2026-11-15T12:00:00Z');
const medication: Medication = {
  id: 'active', patient_id: 'synthetic', name: 'Example A', category: 'Example',
  dosage: 'As prescribed', frequency: 'Daily', times_of_day: ['08:00'], is_active: true,
};
const archivedMed = { ...medication, id: 'archived', is_active: false };

function record(scheduled_time: string, status: DoseStatus, medication_id = medication.id): MedicationAdministrationRecord {
  return { id: `${medication_id}-${scheduled_time}`, patient_id: medication.patient_id, medication_id, scheduled_time, status };
}

describe('Synthetic adherence accuracy scenarios', () => {
  it('reports no percentage when every due dose still lacks a recorded outcome', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-15T08:00:00Z', 'due_now'),
      record('2026-11-15T09:00:00Z', 'acknowledged'),
    ], now);
    expect(insight.weekly_adherence_rate).toBeNull();
    expect(insight.monthly_adherence_rate).toBeNull();
  });

  it('treats an empty history as no data', () => {
    expect(generateAdherenceInsight([medication], [], now)).toMatchObject({
      has_data: false, weekly_adherence_rate: null, monthly_adherence_rate: null, streak_days: 0,
    });
  });

  it('keeps upcoming doses out of the due count', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-15T08:00:00Z', 'taken'),
      record('2026-11-15T20:00:00Z', 'upcoming'),
      record('2026-11-16T08:00:00Z', 'upcoming'),
    ], now);
    expect(insight).toMatchObject({ weekly_adherence_rate: 100, total_scheduled_week: 1, total_taken_week: 1 });
  });

  it('ignores future records even when an outcome was entered for them', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-15T08:00:00Z', 'taken'),
      record('2026-11-15T20:00:00Z', 'missed'),
      record('2026-11-16T08:00:00Z', 'taken'),
    ], now);
    expect(insight).toMatchObject({ weekly_adherence_rate: 100, total_taken_week: 1, total_missed_week: 0 });
  });

  it('uses skipped and missed outcomes in the recorded adherence denominator', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-15T08:00:00Z', 'taken'),
      record('2026-11-14T08:00:00Z', 'skipped'),
      record('2026-11-13T08:00:00Z', 'missed'),
    ], now);
    expect(insight).toMatchObject({ weekly_adherence_rate: 33, total_missed_week: 2 });
  });

  it('recognizes a fully recorded day at 100 percent', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-15T08:00:00Z', 'taken'),
      record('2026-11-15T09:00:00Z', 'taken'),
    ], now);
    expect(insight).toMatchObject({ weekly_adherence_rate: 100, streak_days: 1, total_taken_week: 2 });
  });

  it('preserves genuine historical outcomes when a prescription is archived', () => {
    const insight = generateAdherenceInsight([archivedMed], [
      record('2026-11-14T08:00:00Z', 'taken', archivedMed.id),
    ], now);
    expect(insight).toMatchObject({ has_data: true, weekly_adherence_rate: 100, total_taken_week: 1 });
  });

  it('does not make an active pattern suggestion from archived doses', () => {
    const insight = generateAdherenceInsight([medication, archivedMed], [
      record('2026-11-12T08:00:00Z', 'missed', archivedMed.id),
      record('2026-11-13T08:00:00Z', 'missed', archivedMed.id),
      record('2026-11-14T08:00:00Z', 'taken', archivedMed.id),
      record('2026-11-15T08:00:00Z', 'taken'),
    ], now);
    expect(insight.patterns).toEqual([]);
  });

  it('preserves yesterday’s completed streak without counting an incomplete today', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-15T08:00:00Z', 'taken'),
      record('2026-11-15T20:00:00Z', 'upcoming'),
      record('2026-11-14T08:00:00Z', 'taken'),
    ], now);
    expect(insight.streak_days).toBe(1);
  });

  it('breaks the streak at an earlier day with an unresolved dose', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-15T08:00:00Z', 'taken'),
      record('2026-11-14T08:00:00Z', 'taken'),
      record('2026-11-14T20:00:00Z', 'due_now'),
      record('2026-11-13T08:00:00Z', 'taken'),
    ], now);
    expect(insight.streak_days).toBe(1);
  });

  it('places the same UTC timestamp in the patient’s local time slot', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-12T03:00:00Z', 'missed'),
      record('2026-11-13T03:00:00Z', 'skipped'),
      record('2026-11-14T03:00:00Z', 'taken'),
    ], now, 'Asia/Kolkata');
    expect(insight.patterns).toMatchObject([{ slot_name: 'morning', missed_percentage: 67 }]);
  });

  it('keeps unresolved records out of the recurring pattern denominator', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-11T08:00:00Z', 'missed'),
      record('2026-11-12T08:00:00Z', 'skipped'),
      record('2026-11-13T08:00:00Z', 'taken'),
      record('2026-11-14T08:00:00Z', 'due_now'),
    ], now);
    expect(insight.patterns).toMatchObject([{ slot_name: 'morning', total_scheduled: 3, missed_percentage: 67 }]);
  });

  it('uses the patient’s calendar to separate days around UTC midnight', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-14T23:30:00Z', 'taken'),
      record('2026-11-14T12:00:00Z', 'taken'),
    ], now, 'Asia/Kolkata');
    expect(insight.streak_days).toBe(2);
  });

  it('uses the last seven local calendar days for the weekly window', () => {
    const insight = generateAdherenceInsight([medication], [
      record('2026-11-08T20:00:00Z', 'missed'),
      record('2026-11-15T08:00:00Z', 'taken'),
    ], now);
    expect(insight).toMatchObject({ weekly_adherence_rate: 100, monthly_adherence_rate: 50 });
  });

  it('ignores records with invalid scheduled timestamps', () => {
    const insight = generateAdherenceInsight([medication], [
      record('invalid date', 'missed'),
      record('2026-11-15T08:00:00Z', 'taken'),
    ], now);
    expect(insight).toMatchObject({ weekly_adherence_rate: 100, total_scheduled_week: 1, streak_days: 1 });
  });
});
