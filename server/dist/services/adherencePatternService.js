export const MEDICAL_DISCLAIMER = 'Rule-based adherence insight only. Not medical advice. Always consult your doctor or licensed healthcare provider before making any changes to your medication schedule.';
const SLOTS = [
    {
        name: 'morning',
        timeWindow: '05:00 - 11:00',
        startHour: 5,
        endHour: 11,
        suggestion: 'Morning doses are frequently missed. Consider placing your medication organizer beside your breakfast table or morning kettle.'
    },
    {
        name: 'afternoon',
        timeWindow: '11:00 - 16:00',
        startHour: 11,
        endHour: 16,
        suggestion: 'Afternoon doses are often delayed during midday routines. Pairing your dose with lunch or a mid-day phone reminder helps establish consistency.'
    },
    {
        name: 'evening',
        timeWindow: '16:00 - 21:00',
        startHour: 16,
        endHour: 21,
        suggestion: 'Evening doses show occasional delays. Pairing with dinner or the evening news creates a predictable, automatic habit cue.'
    },
    {
        name: 'bedtime',
        timeWindow: '21:00 - 05:00',
        startHour: 21,
        endHour: 5,
        suggestion: 'Bedtime doses show inconsistency. Keeping your evening dosage cup on your nightstand ensures a clear visual reminder before sleep.'
    }
];
function getSlotForHour(hour) {
    for (const slot of SLOTS) {
        if (slot.startHour < slot.endHour) {
            if (hour >= slot.startHour && hour < slot.endHour)
                return slot;
        }
        else {
            // Overnight (21:00 - 05:00)
            if (hour >= slot.startHour || hour < slot.endHour)
                return slot;
        }
    }
    return SLOTS[0];
}
/**
 * Detect habitual non-adherence patterns grouped by daily time-of-day slots
 */
export function detectAdherencePatterns(medications, records, now = new Date()) {
    const activeMeds = medications.filter(m => m.is_active);
    if (activeMeds.length === 0 || records.length === 0)
        return [];
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
    // Filter records from the past 14 days
    const recentRecords = records.filter(r => new Date(r.scheduled_time) >= fourteenDaysAgo);
    const slotStats = new Map();
    for (const slot of SLOTS) {
        slotStats.set(slot.name, { total: 0, missed: 0 });
    }
    recentRecords.forEach(rec => {
        const scheduledDate = new Date(rec.scheduled_time);
        const hour = scheduledDate.getUTCHours();
        const slot = getSlotForHour(hour);
        const stat = slotStats.get(slot.name);
        stat.total += 1;
        if (rec.status === 'missed' || rec.status === 'skipped') {
            stat.missed += 1;
        }
    });
    const patterns = [];
    for (const slot of SLOTS) {
        const stat = slotStats.get(slot.name);
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
    }
    return patterns;
}
/**
 * Compute active daily adherence streak
 */
export function calculateDayStreak(records, now = new Date()) {
    if (records.length === 0)
        return 0;
    let streak = 0;
    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(now.getTime() - i * 86400000);
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayRecords = records.filter(r => r.scheduled_time.startsWith(dateStr));
        if (dayRecords.length === 0) {
            if (i === 0)
                continue; // Today might not have doses yet
            break;
        }
        const completed = dayRecords.filter(r => r.status === 'taken').length;
        const missed = dayRecords.filter(r => r.status === 'missed' || r.status === 'skipped').length;
        if (missed === 0 && completed > 0) {
            streak += 1;
        }
        else if (i === 0) {
            // If today has doses in progress with no misses so far, continue
            if (missed === 0)
                streak += 1;
        }
        else {
            break;
        }
    }
    return streak;
}
/**
 * Generate comprehensive clinical adherence insights
 */
export function generateAdherenceInsight(medications, records, now = new Date()) {
    const activeMeds = medications.filter(m => m.is_active);
    if (activeMeds.length === 0 || records.length === 0) {
        return {
            has_data: false,
            weekly_adherence_rate: null,
            monthly_adherence_rate: null,
            streak_days: 0,
            total_scheduled_week: 0,
            total_taken_week: 0,
            total_missed_week: 0,
            patterns: [],
            disclaimer: MEDICAL_DISCLAIMER
        };
    }
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const weekRecords = records.filter(r => new Date(r.scheduled_time) >= sevenDaysAgo);
    const monthRecords = records.filter(r => new Date(r.scheduled_time) >= thirtyDaysAgo);
    const weekTaken = weekRecords.filter(r => r.status === 'taken').length;
    const weekMissed = weekRecords.filter(r => r.status === 'missed' || r.status === 'skipped').length;
    const weekEvaluated = weekTaken + weekMissed;
    const weeklyRate = weekEvaluated > 0 ? Math.round((weekTaken / weekEvaluated) * 100) : 100;
    const monthTaken = monthRecords.filter(r => r.status === 'taken').length;
    const monthMissed = monthRecords.filter(r => r.status === 'missed' || r.status === 'skipped').length;
    const monthEvaluated = monthTaken + monthMissed;
    const monthlyRate = monthEvaluated > 0 ? Math.round((monthTaken / monthEvaluated) * 100) : 100;
    const streakDays = calculateDayStreak(records, now);
    const patterns = detectAdherencePatterns(medications, records, now);
    return {
        has_data: true,
        weekly_adherence_rate: weeklyRate,
        monthly_adherence_rate: monthlyRate,
        streak_days: streakDays,
        total_scheduled_week: weekRecords.length,
        total_taken_week: weekTaken,
        total_missed_week: weekMissed,
        patterns,
        disclaimer: MEDICAL_DISCLAIMER
    };
}
