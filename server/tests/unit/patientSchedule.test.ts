import { describe, expect, it } from 'vitest';
import { localSlotInstant } from '../../src/services/patientSchedule.js';

describe('Mapping a patient’s local schedule to UTC', () => {
  it.each([
    ['India crosses into the previous UTC day', '2026-11-25', '03:15', 'Asia/Kolkata', false, '2026-11-24T21:45:00.000Z'],
    ['Nepal quarter-hour offset', '2026-11-25', '06:00', 'Asia/Kathmandu', false, '2026-11-25T00:15:00.000Z'],
    ['US summer offset', '2026-07-01', '09:00', 'America/New_York', false, '2026-07-01T13:00:00.000Z'],
    ['US winter offset', '2026-12-01', '09:00', 'America/New_York', false, '2026-12-01T14:00:00.000Z'],
    ['repeated hour', '2026-11-01', '01:15', 'America/New_York', false, '2026-11-01T05:15:00.000Z'],
    ['spring gap for a visit', '2026-03-08', '02:10', 'America/New_York', false, null],
    ['spring gap for a recurring reminder', '2026-03-08', '02:10', 'America/New_York', true, '2026-03-08T07:10:00.000Z'],
    ['leap day', '2028-02-29', '00:00', 'UTC', false, '2028-02-29T00:00:00.000Z'],
    ['invalid day', '2027-02-29', '00:00', 'UTC', false, null],
  ] as const)('%s', (_, day, time, zone, shiftGap, expected) => {
    expect(localSlotInstant(day, time, zone, shiftGap)).toBe(expected);
  });
});
