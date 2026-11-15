import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';
import { db } from '../../src/db/storageAdapter.js';

describe('Care Circle & Emergency SOS Integration Tests', () => {
  let elderlyToken: string;
  let elderlyPatientId: string;
  let familyToken: string;

  beforeEach(async () => {
    db.seedInitialData();

    const elderlyLogin = await request(app).post('/api/auth/demo-login').send({ role: 'elderly' });
    elderlyToken = elderlyLogin.body.token;
    elderlyPatientId = elderlyLogin.body.user.patient_id;

    const familyLogin = await request(app).post('/api/auth/demo-login').send({ role: 'family' });
    familyToken = familyLogin.body.token;
  });

  it('should list active Care Circle members for patient', async () => {
    const res = await request(app)
      .get('/api/care-circle')
      .set('Authorization', `Bearer ${elderlyToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(res.body.members.length).toBeGreaterThanOrEqual(2);
    expect(res.body.members[0].relationship).toBeDefined();
  });

  it('should create a hashed invitation token with expiration and granular permissions', async () => {
    const res = await request(app)
      .post('/api/care-circle/invite')
      .set('Authorization', `Bearer ${elderlyToken}`)
      .send({
        invited_email: 'newcaregiver@careverse.demo',
        relationship: 'Weekend Visiting Nurse',
        role: 'caregiver',
        can_view: true,
        can_manage_meds: true,
        can_manage_appointments: true,
        can_add_notes: true,
        expires_in_days: 7
      });

    expect(res.status).toBe(201);
    expect(res.body.invitation).toBeDefined();
    expect(res.body.invitation.raw_token).toBeDefined();
    expect(res.body.invitation.token_hash).toBeDefined();
    expect(res.body.invitation.status).toBe('pending');
  });

  it('should allow another authenticated user to accept the invitation', async () => {
    // 1. Create invitation
    const inviteRes = await request(app)
      .post('/api/care-circle/invite')
      .set('Authorization', `Bearer ${elderlyToken}`)
      .send({
        invited_email: 'granddaughter@careverse.demo',
        relationship: 'Granddaughter',
        role: 'family',
        can_view: true,
        can_manage_meds: false,
        can_manage_appointments: false,
        can_add_notes: true
      });

    const rawToken = inviteRes.body.invitation.raw_token;

    // 2. Register/login invited user
    const newUserRes = await request(app).post('/api/auth/register').send({
      email: 'granddaughter@careverse.demo',
      password: 'SafePassword123!',
      full_name: 'Emily Vance',
      role: 'family'
    });
    const newUserToken = newUserRes.body.token;

    // 3. Accept invitation
    const acceptRes = await request(app)
      .post('/api/care-circle/accept')
      .set('Authorization', `Bearer ${newUserToken}`)
      .send({ token: rawToken });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.message).toContain('accepted successfully');
    expect(acceptRes.body.member.relationship).toBe('Granddaughter');
  });

  it('should trigger Emergency SOS alert and record urgent audit entry', async () => {
    const res = await request(app)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${elderlyToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('activated');
    expect(res.body.instructions.immediateAction).toContain('911 / 112');
    expect(res.body.contacts.length).toBeGreaterThan(0);

    // Verify audit log
    const auditRes = await request(app)
      .get('/api/audit/logs')
      .set('Authorization', `Bearer ${elderlyToken}`);

    const emergencyEvent = auditRes.body.logs.find((l: any) => l.action === 'EMERGENCY_SOS_ACTIVATED');
    expect(emergencyEvent).toBeDefined();
  });

  it('should cancel accidental SOS activation within grace period', async () => {
    const res = await request(app)
      .post('/api/emergency/cancel')
      .set('Authorization', `Bearer ${elderlyToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('should reject unauthorized cross-patient data access for unlinked users', async () => {
    // Register an outsider user who is not in Eleanor's Care Circle
    const strangerRes = await request(app).post('/api/auth/register').send({
      email: 'stranger@outsider.test',
      password: 'Password999!',
      full_name: 'Random Person',
      role: 'family'
    });
    const strangerToken = strangerRes.body.token;

    // Attempting to access Eleanor's medications directly
    const res = await request(app)
      .get(`/api/medications?patientId=${elderlyPatientId}`)
      .set('Authorization', `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });
});
