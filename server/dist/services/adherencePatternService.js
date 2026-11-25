export const MEDICAL_DISCLAIMER = 'Adherence insights reflect recorded dose outcomes. Always consult your healthcare provider before changing your medication schedule.';
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOTS = [
    { name: 'morning', timeWindow: '05:00–11:00', endHour: 11 },
    { name: 'afternoon', timeWindow: '11:00–16:00', endHour: 16 },
    { name: 'evening', timeWindow: '16:00–21:00', endHour: 21 },
    { name: 'bedtime', timeWindow: '21:00–05:00', endHour: 29 },
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function makeCalendar(timeZone) {
    const options = {
        calendar: 'iso8601',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
    };
    let formatter;
    try {
        formatter = new Intl.DateTimeFormat('en-GB', { ...options, timeZone });
    }
    catch (error) {
        if (!(error instanceof RangeError))
            throw error;
        formatter = new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' });
    }
    return {
        timeZone: formatter.resolvedOptions().timeZone,
        read(date) {
            const parts = formatter.formatToParts(date);
            const read = (type) => Number(parts.find(part => part.type === type)?.value);
            const day = Date.UTC(read('year'), read('month') - 1, read('day')) / DAY_MS;
            return { day, hour: read('hour') };
        },
    };
}
function collectEvents(records, now, timeZone) {
    const calendar = makeCalendar(timeZone);
    const today = calendar.read(now).day;
    const events = [];
    for (const record of records) {
        const timestamp = Date.parse(record.scheduled_time);
        if (!Number.isFinite(timestamp))
            continue;
        const { day, hour } = calendar.read(new Date(timestamp));
        if (day > today)
            continue;
        events.push({
            record,
            day,
            hour,
            due: timestamp <= now.getTime(),
        });
    }
    return { events, today, timeZone: calendar.timeZone };
}
function summarizeDoses(events) {
    let taken = 0;
    let missed = 0;
    let skipped = 0;
    let pending = 0;
    for (const event of events) {
        if (!event.due)
            continue;
        switch (event.record.status) {
            case 'taken':
                taken += 1;
                break;
            case 'missed':
                missed += 1;
                break;
            case 'skipped':
                skipped += 1;
                break;
            default: pending += 1;
        }
    }
    const recorded = taken + missed + skipped;
    const rate = recorded > 0 ? Math.round(taken / recorded * 100) : null;
    return { scheduled: recorded + pending, recorded, taken, missed, skipped, pending, rate };
}
export function getPatientDate(now, timeZone) {
    return new Date(makeCalendar(timeZone).read(now).day * DAY_MS).toISOString().slice(0, 10);
}
export function getDailyDoseEvidence(records, now, timeZone, date) {
    const history = collectEvents(records, now, timeZone);
    const selectedDay = date ? Date.parse(`${date}T00:00:00.000Z`) / DAY_MS : history.today;
    const events = history.events.filter(event => event.day === selectedDay);
    const summary = summarizeDoses(events);
    return {
        date: date ?? new Date(history.today * DAY_MS).toISOString().slice(0, 10),
        timeZone: history.timeZone,
        records: events.map(event => event.record),
        due: summary.scheduled,
        taken: summary.taken,
        missed: summary.missed,
        skipped: summary.skipped,
        pending: summary.pending,
        upcoming: events.length - summary.scheduled,
        recorded: summary.recorded,
        rate: summary.rate,
    };
}
function getPatterns(medications, events, today) {
    const activeIds = new Set(medications.filter(medication => medication.is_active).map(medication => medication.id));
    const slotEvents = SLOTS.map(() => []);
    for (const event of events) {
        if (!event.due || event.day < today - 13 || !activeIds.has(event.record.medication_id))
            continue;
        const hour = event.hour < 5 ? event.hour + 24 : event.hour;
        const index = SLOTS.findIndex(slot => hour < slot.endHour);
        slotEvents[index].push(event);
    }
    return SLOTS.flatMap((slot, index) => {
        const { recorded, missed, skipped } = summarizeDoses(slotEvents[index]);
        if (recorded < 3)
            return [];
        const incomplete = missed + skipped;
        if (incomplete < 2 && incomplete * 4 < recorded)
            return [];
        const label = slot.name[0].toUpperCase() + slot.name.slice(1);
        return [{
                slot_name: slot.name,
                time_window: slot.timeWindow,
                total_scheduled: recorded,
                missed_count: incomplete,
                missed_percentage: Math.round(incomplete / recorded * 100),
                suggestion: `${label} doses have been missed or skipped in recent records. Consider setting a reminder for the prescribed time.`,
            }];
    });
}
function getStreak(events, today) {
    let streak = 0;
    for (let offset = 0; offset < 30; offset += 1) {
        const dayEvents = events.filter(event => event.day === today - offset);
        if (dayEvents.length > 0 && dayEvents.every(event => event.due && event.record.status === 'taken')) {
            streak += 1;
            continue;
        }
        if (offset === 0 && !dayEvents.some(event => event.due && (event.record.status === 'missed' || event.record.status === 'skipped'))) {
            continue;
        }
        break;
    }
    return streak;
}
export function detectAdherencePatterns(medications, records, now = new Date(), timeZone = 'UTC') {
    const history = collectEvents(records, now, timeZone);
    return getPatterns(medications, history.events, history.today);
}
export function calculateDayStreak(records, now = new Date(), timeZone = 'UTC') {
    const history = collectEvents(records, now, timeZone);
    return getStreak(history.events, history.today);
}
export function generateAdherenceInsight(medications, records, now = new Date(), timeZone = 'UTC') {
    const history = collectEvents(records, now, timeZone);
    const monthEvents = history.events.filter(event => event.day >= history.today - 29);
    const month = summarizeDoses(monthEvents);
    const week = summarizeDoses(monthEvents.filter(event => event.day >= history.today - 6));
    return {
        has_data: month.scheduled > 0,
        weekly_adherence_rate: week.rate,
        monthly_adherence_rate: month.rate,
        streak_days: getStreak(monthEvents, history.today),
        total_scheduled_week: week.scheduled,
        total_taken_week: week.taken,
        total_missed_week: week.missed + week.skipped,
        total_pending_week: week.pending,
        time_zone: history.timeZone,
        patterns: getPatterns(medications, monthEvents, history.today),
        disclaimer: MEDICAL_DISCLAIMER,
    };
}
export function generateAdherenceTrend(medications, records, days, now = new Date(), timeZone = 'UTC') {
    const history = collectEvents(records, now, timeZone);
    const startDay = history.today - days + 1;
    const events = history.events.filter(event => event.day >= startDay);
    const totals = summarizeDoses(events);
    const categoryByMedication = new Map(medications.map(medication => [medication.id, medication.category]));
    const categoryEvents = new Map();
    for (const event of events) {
        if (!event.due)
            continue;
        const category = categoryByMedication.get(event.record.medication_id) ?? 'Other';
        const group = categoryEvents.get(category);
        if (group)
            group.push(event);
        else
            categoryEvents.set(category, [event]);
    }
    return {
        timeRangeDays: days,
        timeZone: history.timeZone,
        averageAdherence: totals.rate,
        totalScheduled: totals.scheduled,
        totalTaken: totals.taken,
        totalMissed: totals.missed,
        totalSkipped: totals.skipped,
        totalPending: totals.pending,
        dailyTrends: Array.from({ length: days }, (_, offset) => {
            const day = startDay + offset;
            const date = new Date(day * DAY_MS);
            const { scheduled, taken, missed, skipped, pending, rate } = summarizeDoses(events.filter(event => event.day === day));
            return {
                date: date.toISOString().slice(0, 10),
                dayName: DAY_NAMES[date.getUTCDay()],
                scheduled, taken, missed, skipped, pending,
                adherenceRate: rate,
            };
        }),
        categoryBreakdown: Array.from(categoryEvents, ([category, group]) => {
            const { scheduled, taken, rate } = summarizeDoses(group);
            return { category, total: scheduled, taken, rate };
        }),
    };
}
