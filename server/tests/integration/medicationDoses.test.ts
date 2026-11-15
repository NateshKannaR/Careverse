import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';
import { db } from '../../src/db/storageAdapter.js';

describe('Medication & Dose Tracking Integration Tests', () => {
  let elderlyToken: string;
  let elderlyPatientId: string;
  let caregiverToken: string;

  beforeEach(async () => {
    db.seedInitialData();

    const elderlyLogin = await request(app).post('/api/auth/demo-login').send({ role: 'elderly' });
    elderlyToken = elderlyLogin.body.token;
    elderlyPatientId = elderlyLogin.body.user.patient_id;

    const caregiverLogin = await request(app).post('/api/auth/demo-login').send({ role: 'caregiver' });
    caregiverToken = caregiverLogin.body.token;
  });

  it('should list medications for authenticated elderly user', async () => {
    const res = await request(app)
      .get('/api/medications')
      .set('Authorization', `Bearer ${elderlyToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.medications)).toBe(true);
    expect(res.body.medications.length).toBeGreaterThanOrEqual(4);
    expect(res.body.medications[0].name).toBeDefined();
  });

  it('should allow adding a new medication with validation', async () => {
    const newMed = {
      name: 'Amlodipine Besylate',
      category: 'Blood Pressure',
      dosage: '1 Tablet',
      strength: '5mg',
      frequency: 'Once daily',
      times_of_day: ['09:00'],
      instructions: 'Take in the morning',
      prescribing_doctor: 'Dr. Robert Mehta',
      pharmacy: 'CVS Pharmacy',
      total_supply: 30,
      remaining_supply: 30
    };

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${elderlyToken}`)
      .send(newMed);

    expect(res.status).toBe(201);
    expect(res.body.medication.id).toBeDefined();
    expect(res.body.medication.name).toBe('Amlodipine Besylate');
  });

  it('should retrieve today dose timeline with counts', async () => {
    const res = await request(app)
      .get('/api/medications/doses/today')
      .set('Authorization', `Bearer ${elderlyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records).toBeDefined();
    expect(res.body.summary).toBeDefined();
    expect(typeof res.body.summary.taken).toBe('number');
    expect(typeof res.body.summary.upcoming).toBe('number');
  });

  it('should record dose status as taken and prevent duplicate taken recording', async () => {
    const timelineRes = await request(app)
      .get('/api/medications/doses/today')
      .set('Authorization', `Bearer ${elderlyToken}`);

    const upcomingDose = timelineRes.body.records.find((r: any) => r.status === 'upcoming');
    expect(upcomingDose).toBeDefined();

    // Mark as taken
    const recordRes = await request(app)
      .post(`/api/medications/doses/${upcomingDose.id}/record`)
      .set('Authorization', `Bearer ${elderlyToken}`)
      .send({ status: 'taken', notes: 'Taken with water' });

    expect(recordRes.status).toBe(200);
    expect(recordRes.body.record.status).toBe('taken');

    // Attempting to mark as taken again should return 409 Conflict
    const duplicateRes = await request(app)
      .post(`/api/medications/doses/${upcomingDose.id}/record`)
      .set('Authorization', `Bearer ${elderlyToken}`)
      .send({ status: 'taken' });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error).toContain('already been recorded as taken');
  });

  it('should allow authorized caregiver to record dose administration', async () => {
    const timelineRes = await request(app)
      .get(`/api/medications/doses/today?patientId=${elderlyPatientId}`)
      .set('Authorization', `Bearer ${caregiverToken}`);

    const targetDose = timelineRes.body.records[0];

    const res = await request(app)
      .post(`/api/medications/doses/${targetDose.id}/record`)
      .set('Authorization', `Bearer ${caregiverToken}`)
      .send({ status: 'taken', notes: 'Administered by nurse' });

    // Should succeed or return 409 if already taken
    expect([200, 409]).toContain(res.status);
  });
});
