import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';
import { db } from '../../src/db/storageAdapter.js';

describe('Cross-Patient Security & BOLA Isolation Tests', () => {
  let eleanorToken: string;
  let eleanorPatientId: string;
  let sarahToken: string;
  let unaffiliatedPatientToken: string;
  let unaffiliatedPatientId: string;

  beforeEach(async () => {
    db.seedInitialData();

    // Eleanor Vance (demo patient)
    const eleanorRes = await request(app).post('/api/auth/demo-login').send({ role: 'elderly' });
    eleanorToken = eleanorRes.body.token;
    eleanorPatientId = eleanorRes.body.user.patient_id;

    // Sarah Jenkins (authorized caregiver in Eleanor's care circle)
    const sarahRes = await request(app).post('/api/auth/demo-login').send({ role: 'caregiver' });
    sarahToken = sarahRes.body.token;

    // Register a second, completely unaffiliated elderly patient
    const randomEmail = `outsider_${Date.now()}_${Math.random().toString(36).substring(7)}@careverse.test`;
    const outsiderRes = await request(app).post('/api/auth/register').send({
      email: randomEmail,
      password: 'StrongPassword123!',
      full_name: 'Outsider Patient',
      role: 'elderly',
      primary_condition: 'Healthy',
      blood_group: 'O+'
    });
    unaffiliatedPatientToken = outsiderRes.body.token;
    unaffiliatedPatientId = outsiderRes.body.user.patient_id;
  });

  it('should block unaffiliated patient from accessing Eleanor’s appointments with 403', async () => {
    const res = await request(app)
      .get(`/api/appointments?patient_id=${eleanorPatientId}`)
      .set('Authorization', `Bearer ${unaffiliatedPatientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });

  it('should block unaffiliated patient from creating appointments for Eleanor with 403', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${unaffiliatedPatientToken}`)
      .send({
        patient_id: eleanorPatientId,
        doctor_name: 'Dr. Hack',
        specialty: 'Cardiology',
        hospital_clinic: 'Metro Hospital',
        appointment_date: '2026-11-20',
        appointment_time: '10:00',
        appointment_purpose: 'Unauthorized checkup'
      });

    expect(res.status).toBe(403);
  });

  it('should block unaffiliated patient from accessing Eleanor’s wellbeing logs with 403', async () => {
    const res = await request(app)
      .get(`/api/wellbeing/history?patient_id=${eleanorPatientId}`)
      .set('Authorization', `Bearer ${unaffiliatedPatientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });

  it('should block unaffiliated patient from viewing Eleanor’s emergency contacts with 403', async () => {
    const res = await request(app)
      .get(`/api/emergency/contacts?patient_id=${eleanorPatientId}`)
      .set('Authorization', `Bearer ${unaffiliatedPatientToken}`);

    expect(res.status).toBe(403);
  });

  it('should block unaffiliated patient from triggering emergency SOS on Eleanor’s behalf with 403', async () => {
    const res = await request(app)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${unaffiliatedPatientToken}`)
      .send({
        patient_id: eleanorPatientId,
        notes: 'Malicious trigger'
      });

    expect(res.status).toBe(403);
  });

  it('should block unaffiliated patient from accessing Eleanor’s daily care score with 403', async () => {
    const res = await request(app)
      .get(`/api/analytics/daily-score?patient_id=${eleanorPatientId}`)
      .set('Authorization', `Bearer ${unaffiliatedPatientToken}`);

    expect(res.status).toBe(403);
  });

  it('should permit authorized Care Circle member Sarah to access Eleanor’s appointments with 200', async () => {
    const res = await request(app)
      .get(`/api/appointments?patient_id=${eleanorPatientId}`)
      .set('Authorization', `Bearer ${sarahToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.appointments)).toBe(true);
  });

  it('should permit Eleanor to access her own wellbeing logs with 200', async () => {
    const res = await request(app)
      .get(`/api/wellbeing/today?patient_id=${eleanorPatientId}`)
      .set('Authorization', `Bearer ${eleanorToken}`);

    expect(res.status).toBe(200);
  });
});
