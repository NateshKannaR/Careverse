import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';
import { db } from '../../src/db/storageAdapter.js';

const prescription = {
  name: 'Fixture A', category: 'Fixture', dosage: 'As prescribed', frequency: 'Once daily',
  times_of_day: ['15:00'], remaining_supply: 10,
};
const visit = {
  doctor_name: 'Fixture clinician', hospital_clinic: 'Fixture clinic', specialty: 'General',
  appointment_purpose: 'Follow-up', appointment_date: '2026-11-25', appointment_time: '14:00',
};

describe('Daily care plan workflows with fixed patient-local records', () => {
  let auth: string;
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-25T18:00:00Z')); // 13:00 in New York
    db.seedInitialData();
    const login = await request(app).post('/api/auth/demo-login').send({ role: 'elderly' });
    auth = 'Bearer ' + login.body.token;
  });
  afterEach(() => vi.useRealTimers());
  const get = (path: string) => request(app).get('/api/' + path).set('Authorization', auth);
  const post = (path: string, body: object) => request(app).post('/api/' + path).set('Authorization', auth).send(body);
  const create = async (updates: object = {}) => (await post('medications', { ...prescription, ...updates }).expect(201)).body.medication.id;
  const rows = async (id: string) => (await get('medications/doses/today').expect(200)).body.records.filter((r: any) => r.medication_id === id);

  it('shows one 15:00 local dose immediately after adding a prescription, including on reload', async () => {
    const id = await create();
    const plan = await rows(id);
    expect(plan).toHaveLength(1);
    expect(plan[0].scheduled_time).toBe('2026-11-25T20:00:00.000Z');
    expect(await rows(id)).toEqual(plan);
  });

  it('keeps earlier slots off a newly created schedule and materializes tomorrow on first read', async () => {
    const id = await create({ frequency: 'Twice daily', times_of_day: ['09:00', '15:00'] });
    expect(await rows(id)).toHaveLength(1);
    vi.setSystemTime(new Date('2026-11-26T06:00:00Z'));
    expect((await rows(id)).map((r: any) => r.scheduled_time)).toEqual(['2026-11-26T14:00:00.000Z', '2026-11-26T20:00:00.000Z']);
  });

  it('pauses future slots and restores only remaining slots on resume', async () => {
    const id = await create();
    await rows(id);
    const toggle = () => request(app).patch('/api/medications/' + id + '/pause').set('Authorization', auth).expect(200);
    await toggle();
    expect(await rows(id)).toHaveLength(0);
    await toggle();
    expect(await rows(id)).toHaveLength(1);
  });

  it('excludes as-needed prescriptions from daily schedules and estimated depletion', async () => {
    const id = await create({ frequency: 'As needed', times_of_day: [] });
    expect(await rows(id)).toHaveLength(0);
    expect((await get('medications/refills/forecast')).body.forecast.some((f: any) => f.medication_id === id)).toBe(false);
  });

  it('retains a recorded outcome after removing its prescription', async () => {
    const id = await create();
    vi.setSystemTime(new Date('2026-11-25T20:05:00Z'));
    const [dose] = await rows(id);
    await post(`medications/doses/${dose.id}/record`, { status: 'taken' }).expect(200);
    await request(app).delete('/api/medications/' + id).set('Authorization', auth).expect(200);
    expect(await rows(id)).toMatchObject([{ status: 'taken', medication: { name: 'Fixture A' } }]);
    expect((await get('medications')).body.medications.some((m: any) => m.id === id)).toBe(false);
  });

  it('shares one refill note with the caregiver and reports its saved state on reload', async () => {
    const id = await create();
    await post(`medications/${id}/refill-note`, {}).expect(201);
    await post(`medications/${id}/refill-note`, {}).expect(200);
    expect((await get('medications/refills/forecast')).body.forecast.find((f: any) => f.medication_id === id).shared_today).toBe(true);
    const caregiver = await request(app).post('/api/auth/demo-login').send({ role: 'caregiver' });
    const notes = await request(app).get('/api/care-notes').set('Authorization', 'Bearer ' + caregiver.body.token);
    expect(notes.body.notes.filter((n: any) => n.title === 'Refill follow-up · Fixture A')).toHaveLength(1);
  });

  it('separates elapsed and upcoming visits either side of the patient-local current minute', async () => {
    for (const time of ['12:59', '13:00', '14:00']) await post('appointments', { ...visit, appointment_time: time }).expect(201);
    const list = (await get('appointments')).body.appointments.filter((a: any) => a.doctor_name === visit.doctor_name);
    expect(list.map((a: any) => [a.is_upcoming, a.starts_at])).toEqual([
      [false, '2026-11-25T17:59:00.000Z'], [true, '2026-11-25T18:00:00.000Z'], [true, '2026-11-25T19:00:00.000Z'],
    ]);
  });

  it('rejects a nonexistent calendar day', async () => {
    await post('appointments', { ...visit, appointment_date: '2026-11-31' }).expect(400);
  });

  it('rejects a nonexistent spring-forward local appointment time', async () => {
    await post('appointments', { ...visit, appointment_date: '2027-03-14', appointment_time: '02:30' }).expect(400);
  });

  it('exports the first occurrence of a repeated fall-back wall time', async () => {
    const result = await post('appointments', { ...visit, appointment_date: '2027-11-07', appointment_time: '01:30' }).expect(201);
    const row = (await get('appointments')).body.appointments.find((a: any) => a.id === result.body.appointment.id);
    expect(row.starts_at).toBe('2027-11-07T05:30:00.000Z');
  });

  it('distinguishes simulated SOS messages from emails submitted for delivery', async () => {
    const result = await post('emergency/sos', {}).expect(200);
    expect(result.body.delivery).toEqual({ simulated: 2, sent: 0, failed: 0, pending: 0 });
  });
});
