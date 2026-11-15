export interface RefillForecastItem {
  medication_id: string;
  medication_name: string;
  current_supply: number;
  daily_consumption: number;
  days_remaining: number;
  predicted_runout_date: string;
  is_low_stock: boolean;
  needs_urgent_refill: boolean;
}

export function predictMedicationRefill(
  med: { id: string; name: string; remaining_supply?: number; total_supply?: number; times_of_day?: string[] },
  now: Date = new Date()
): RefillForecastItem {
  const stock = Math.max(0, med.remaining_supply ?? med.total_supply ?? 0);
  const dailyCount = Math.max(1, med.times_of_day && med.times_of_day.length > 0 ? med.times_of_day.length : 1);
  const daysRemaining = Math.floor(stock / dailyCount);
  const runOutDate = new Date(now.getTime() + daysRemaining * 86400000);

  return {
    medication_id: med.id,
    medication_name: med.name,
    current_supply: stock,
    daily_consumption: dailyCount,
    days_remaining: daysRemaining,
    predicted_runout_date: runOutDate.toISOString().split('T')[0],
    is_low_stock: stock <= 5,
    needs_urgent_refill: daysRemaining <= 7
  };
}

export function predictAllRefills(
  medications: Array<{ id: string; name: string; is_active: boolean; remaining_supply?: number; total_supply?: number; times_of_day?: string[] }>,
  now: Date = new Date()
): RefillForecastItem[] {
  return medications
    .filter(m => m.is_active)
    .map(m => predictMedicationRefill(m, now))
    .sort((a, b) => a.days_remaining - b.days_remaining);
}
