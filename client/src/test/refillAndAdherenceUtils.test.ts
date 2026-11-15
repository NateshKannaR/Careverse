import { describe, it, expect } from 'vitest';
import { predictMedicationRefill, predictAllRefills } from '../utils/refillPrediction.js';
import { detectClientPatterns, MEDICAL_DISCLAIMER } from '../utils/adherenceInsights.js';

describe('Client Refill Forecasting Utilities', () => {
  const fixedNow = new Date('2026-11-15T12:00:00Z');

  it('should compute remaining days correctly from stock and daily consumption', () => {
    const med = {
      id: 'med-lisinopril',
      name: 'Lisinopril 10mg',
      remaining_supply: 28,
      times_of_day: ['08:00', '20:00'] // 2 pills daily
    };

    const forecast = predictMedicationRefill(med, fixedNow);

    expect(forecast.medication_id).toBe('med-lisinopril');
    expect(forecast.current_supply).toBe(28);
    expect(forecast.daily_consumption).toBe(2);
    expect(forecast.days_remaining).toBe(14);
    expect(forecast.predicted_runout_date).toBe('2026-11-29');
    expect(forecast.is_low_stock).toBe(false);
    expect(forecast.needs_urgent_refill).toBe(false);
  });

  it('should flag urgent refill and low stock when supplies drop below threshold', () => {
    const lowMed = {
      id: 'med-metformin',
      name: 'Metformin HCl 500mg',
      remaining_supply: 4,
      times_of_day: ['08:00', '18:00']
    };

    const forecast = predictMedicationRefill(lowMed, fixedNow);

    expect(forecast.days_remaining).toBe(2);
    expect(forecast.is_low_stock).toBe(true);
    expect(forecast.needs_urgent_refill).toBe(true);
  });

  it('should sort all active medications by refill urgency ascending', () => {
    const meds = [
      { id: '1', name: 'Atorvastatin', is_active: true, remaining_supply: 30, times_of_day: ['20:00'] },
      { id: '2', name: 'Amlodipine', is_active: true, remaining_supply: 3, times_of_day: ['08:00'] },
      { id: '3', name: 'Inactive Med', is_active: false, remaining_supply: 1, times_of_day: ['08:00'] },
      { id: '4', name: 'Metformin', is_active: true, remaining_supply: 10, times_of_day: ['08:00'] }
    ];

    const sorted = predictAllRefills(meds, fixedNow);

    expect(sorted).toHaveLength(3); // Inactive excluded
    expect(sorted[0].medication_name).toBe('Amlodipine'); // 3 days remaining
    expect(sorted[1].medication_name).toBe('Metformin');  // 10 days remaining
    expect(sorted[2].medication_name).toBe('Atorvastatin'); // 30 days remaining
  });
});

describe('Client Adherence Pattern & Lifestyle Cue Detector', () => {
  const fixedNow = new Date('2026-11-15T12:00:00Z');

  it('should detect morning slot deficiency and offer breakfast habit cue', () => {
    const records = [
      // Morning slot (08:00 UTC) - 2 missed out of 4
      { scheduled_time: '2026-11-14T08:00:00Z', status: 'missed' },
      { scheduled_time: '2026-11-13T08:00:00Z', status: 'missed' },
      { scheduled_time: '2026-11-12T08:00:00Z', status: 'taken' },
      { scheduled_time: '2026-11-11T08:00:00Z', status: 'taken' },
      // Bedtime slot (22:00 UTC) - all taken
      { scheduled_time: '2026-11-14T22:00:00Z', status: 'taken' },
      { scheduled_time: '2026-11-13T22:00:00Z', status: 'taken' },
      { scheduled_time: '2026-11-12T22:00:00Z', status: 'taken' }
    ];

    const patterns = detectClientPatterns(records, fixedNow);

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    const morningPattern = patterns.find(p => p.slot_name === 'morning');
    expect(morningPattern).toBeDefined();
    expect(morningPattern?.missed_count).toBe(2);
    expect(morningPattern?.missed_percentage).toBe(50);
    expect(morningPattern?.suggestion).toContain('breakfast table');
  });

  it('should enforce rule-based disclaimer for clinical safety', () => {
    expect(MEDICAL_DISCLAIMER).toContain('Rule-based adherence insight only');
    expect(MEDICAL_DISCLAIMER).toContain('Not medical advice');
  });
});
