import { Temporal } from '@js-temporal/polyfill';
// One occurrence per wall-clock slot. A repeated hour uses its first occurrence.
// A nonexistent wall time has no instant and needs a different appointment time.
export function localSlotInstant(date, time, timeZone, shiftGap = false) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
        return null;
    try {
        const wall = Temporal.PlainDateTime.from(`${date}T${time}`);
        const zoned = wall.toZonedDateTime(timeZone, { disambiguation: 'compatible' });
        return shiftGap || zoned.toPlainDateTime().equals(wall) ? new Date(zoned.epochMilliseconds).toISOString() : null;
    }
    catch {
        return null;
    }
}
export function visitSchedule(appointments, timeZone, now) {
    const minute = Math.floor(now.getTime() / 60_000) * 60_000;
    return appointments.map(visit => {
        const starts_at = localSlotInstant(visit.appointment_date, visit.appointment_time, timeZone);
        const is_upcoming = visit.status === 'scheduled' && starts_at !== null && Date.parse(starts_at) >= minute;
        return { ...visit, starts_at, is_upcoming };
    }).sort((a, b) => (a.starts_at ?? 'z').localeCompare(b.starts_at ?? 'z'));
}
