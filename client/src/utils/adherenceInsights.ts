export const MEDICAL_DISCLAIMER =
  'Rule-based adherence insight only. Not medical advice. Always consult your doctor or licensed healthcare provider before making any changes to your medication schedule.';

export interface ClientAdherencePattern {
  slot_name: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  time_window: string;
  total_scheduled: number;
  missed_count: number;
  missed_percentage: number;
  suggestion: string;
}

export interface ClientAdherenceInsight {
  has_data: boolean;
  weekly_adherence_rate: number | null;
  monthly_adherence_rate: number | null;
  streak_days: number;
  total_scheduled_week: number;
  total_taken_week: number;
  total_missed_week: number;
  patterns: ClientAdherencePattern[];
  disclaimer: string;
}

const SLOTS = [
  {
    name: 'morning' as const,
    timeWindow: '05:00 - 11:00',
    startHour: 5,
    endHour: 11,
    suggestion: 'Morning doses are frequently missed. Consider placing your medication organizer beside your breakfast table or morning kettle.'
  },
  {
    name: 'afternoon' as const,
    timeWindow: '11:00 - 16:00',
    startHour: 11,
    endHour: 16,
    suggestion: 'Afternoon doses are often delayed during midday routines. Pairing your dose with lunch or a mid-day phone reminder helps establish consistency.'
  },
  {
    name: 'evening' as const,
    timeWindow: '16:00 - 21:00',
    startHour: 16,
    endHour: 21,
    suggestion: 'Evening doses show occasional delays. Pairing with dinner or the evening news creates a predictable, automatic habit cue.'
  },
  {
    name: 'bedtime' as const,
    timeWindow: '21:00 - 05:00',
    startHour: 21,
    endHour: 5,
    suggestion: 'Bedtime doses show inconsistency. Keeping your evening dosage cup on your nightstand ensures a clear visual reminder before sleep.'
  }
];

export function detectClientPatterns(
  records: Array<{ scheduled_time: string; status: string }>,
  now: Date = new Date()
): ClientAdherencePattern[] {
  if (records.length === 0) return [];
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
  const recentRecords = records.filter(r => new Date(r.scheduled_time) >= fourteenDaysAgo);

  const slotStats = new Map<string, { total: number; missed: number }>();
  SLOTS.forEach(s => slotStats.set(s.name, { total: 0, missed: 0 }));

  recentRecords.forEach(rec => {
    const hour = new Date(rec.scheduled_time).getUTCHours();
    let matchedSlot = SLOTS[0];
    for (const slot of SLOTS) {
      if (slot.startHour < slot.endHour) {
        if (hour >= slot.startHour && hour < slot.endHour) {
          matchedSlot = slot;
          break;
        }
      } else {
        if (hour >= slot.startHour || hour < slot.endHour) {
          matchedSlot = slot;
          break;
        }
      }
    }

    const stat = slotStats.get(matchedSlot.name)!;
    stat.total += 1;
    if (rec.status === 'missed' || rec.status === 'skipped') {
      stat.missed += 1;
    }
  });

  const patterns: ClientAdherencePattern[] = [];
  SLOTS.forEach(slot => {
    const stat = slotStats.get(slot.name)!;
    if (stat.total >= 3) {
      const missedPercentage = Math.round((stat.missed / stat.total) * 100);
      if (stat.missed >= 2 || missedPercentage >= 25) {
        patterns.push({
          slot_name: slot.name,
          time_window: slot.timeWindow,
          total_scheduled: stat.total,
          missed_count: stat.missed,
          missed_percentage: missedPercentage,
          suggestion: slot.suggestion
        });
      }
    }
  });

  return patterns;
}
