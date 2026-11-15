import { describe, it, expect } from 'vitest';
import { predictMedicationRefill, predictAllRefills } from '../../src/services/refillService.js';
import {
  detectAdherencePatterns,
  calculateDayStreak,
  generateAdherenceInsight,
  MEDICAL_DISCLAIMER
} from '../../src/services/adherencePatternService.js';
import { Medication, MedicationAdministrationRecord } from '../../src/types/index.js';

describe('Refill & Adherence Pattern Unit Tests', () => {
  const baseMed: Medication = {
    id: 'med-1',
    patient_id: 'pat-1',
    name: 'Lisinopril',
    category: 'Cardiovascular',
    dosage: '10mg',
    frequency: 'Once daily',
    times_of_day: ['08:00'],
    total_supply: 30,
    remaining_supply: 6, // 6 doses left at 1/day -> 6 days remaining -> urgent refill!
    is_active: true
  };

  const twiceDailyMed: Medication = {
    id: 'med-2',
    patient_id: 'pat-1',
    name: 'Metformin',
    category: 'Diabetes',
    dosage: '500mg',
    frequency: 'Twice daily',
    times_of_day: ['08:00', '20:00'],
    total_supply: 60,
    remaining_supply: 20, // 20 doses left at 2/day -> 10 days remaining
    is_active: true
  };

  describe('Refill Prediction Engine', () => {
    it('should accurately calculate remaining days and flag urgent refill if 7 days or less', () => {
      const forecast = predictMedicationRefill(baseMed, undefined, new Date('2026-11-15T00:00:00.000Z'));

      expect(forecast.medication_name).toBe('Lisinopril');
      expect(forecast.current_supply).toBe(6);
      expect(forecast.daily_consumption).toBe(1);
      expect(forecast.days_remaining).toBe(6);
      expect(forecast.needs_urgent_refill).toBe(true);
      expect(forecast.predicted_runout_date).toBe('2026-11-21');
    });

    it('should correctly handle multi-dose daily medications', () => {
      const forecast = predictMedicationRefill(twiceDailyMed, undefined, new Date('2026-11-15T00:00:00.000Z'));

      expect(forecast.daily_consumption).toBe(2);
      expect(forecast.days_remaining).toBe(10);
      expect(forecast.needs_urgent_refill).toBe(false);
      expect(forecast.predicted_runout_date).toBe('2026-11-25');
    });

    it('should sort multiple medications by depletion urgency', () => {
      const forecasts = predictAllRefills([twiceDailyMed, baseMed], new Date('2026-11-15T00:00:00.000Z'));

      expect(forecasts).toHaveLength(2);
      expect(forecasts[0].medication_name).toBe('Lisinopril'); // 6 days
      expect(forecasts[1].medication_name).toBe('Metformin'); // 10 days
    });
  });

  describe('Clinical Adherence Pattern Detector', () => {
    it('should detect habitual missed slot when missed doses exceed 25%', () => {
      const now = new Date('2026-11-15T12:00:00.000Z');
      const records: MedicationAdministrationRecord[] = [
        // Afternoon slot (13:00) with 3 missed doses out of 4 scheduled
        { id: '1', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-14T13:00:00.000Z', status: 'missed' },
        { id: '2', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-13T13:00:00.000Z', status: 'missed' },
        { id: '3', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-12T13:00:00.000Z', status: 'missed' },
        { id: '4', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-11T13:00:00.000Z', status: 'taken' },
        // Morning slot (08:00) with 100% adherence
        { id: '5', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-14T08:00:00.000Z', status: 'taken' },
        { id: '6', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-13T08:00:00.000Z', status: 'taken' },
        { id: '7', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-12T08:00:00.000Z', status: 'taken' }
      ];

      const patterns = detectAdherencePatterns([baseMed], records, now);

      expect(patterns.length).toBeGreaterThanOrEqual(1);
      const afternoonPattern = patterns.find(p => p.slot_name === 'afternoon');
      expect(afternoonPattern).toBeDefined();
      expect(afternoonPattern?.missed_percentage).toBe(75);
      expect(afternoonPattern?.suggestion).toContain('Afternoon doses');
    });

    it('should calculate active adherence day streaks', () => {
      const now = new Date('2026-11-15T12:00:00.000Z');
      const records: MedicationAdministrationRecord[] = [
        { id: '1', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-15T08:00:00.000Z', status: 'taken' },
        { id: '2', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-14T08:00:00.000Z', status: 'taken' },
        { id: '3', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-13T08:00:00.000Z', status: 'taken' },
        { id: '4', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-12T08:00:00.000Z', status: 'missed' }
      ];

      const streak = calculateDayStreak(records, now);
      expect(streak).toBe(3); // 15th, 14th, 13th
    });

    it('should generate complete adherence insight with mandatory medical disclaimer', () => {
      const now = new Date('2026-11-15T12:00:00.000Z');
      const records: MedicationAdministrationRecord[] = [
        { id: '1', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-15T08:00:00.000Z', status: 'taken' },
        { id: '2', patient_id: 'pat-1', medication_id: 'med-1', scheduled_time: '2026-11-14T08:00:00.000Z', status: 'taken' }
      ];

      const insight = generateAdherenceInsight([baseMed], records, now);

      expect(insight.has_data).toBe(true);
      expect(insight.weekly_adherence_rate).toBe(100);
      expect(insight.disclaimer).toBe(MEDICAL_DISCLAIMER);
    });
  });
});
