import { Medication, RefillForecast } from '../types/index.js';

/**
 * Predict refill requirements and depletion timeline for a single medication
 */
export function predictMedicationRefill(
  medication: Medication,
  dailyDosageCount?: number,
  now: Date = new Date()
): RefillForecast {
  const stock = Math.max(0, medication.remaining_supply ?? medication.total_supply ?? 0);
  const dailyCount = Math.max(
    1,
    dailyDosageCount || (medication.times_of_day && medication.times_of_day.length > 0 ? medication.times_of_day.length : 1)
  );

  const daysRemaining = Math.floor(stock / dailyCount);
  const runOutDate = new Date(now.getTime() + daysRemaining * 86400000);
  const formattedRunOutDate = runOutDate.toISOString().split('T')[0];

  const isLowStock = stock <= 5;
  const needsUrgentRefill = daysRemaining <= 7;

  return {
    medication_id: medication.id,
    medication_name: medication.name,
    current_supply: stock,
    daily_consumption: dailyCount,
    days_remaining: daysRemaining,
    predicted_runout_date: formattedRunOutDate,
    is_low_stock: isLowStock,
    needs_urgent_refill: needsUrgentRefill
  };
}

/**
 * Predict refill schedules across all active medications for a patient, sorted by urgency
 */
export function predictAllRefills(
  medications: Medication[],
  now: Date = new Date()
): RefillForecast[] {
  return medications
    .filter(m => m.is_active && m.frequency.toLowerCase() !== 'as needed')
    .map(med => predictMedicationRefill(med, undefined, now))
    .sort((a, b) => a.days_remaining - b.days_remaining);
}
