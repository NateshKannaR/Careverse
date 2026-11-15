import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';
import { db } from '../../src/db/storageAdapter.js';
import { clearRateLimitStore } from '../../src/services/passcodeService.js';

describe('Passcode Care Circle & Elder Approval Gate Integration Tests', () => {
  let eleanorToken: string;
  let eleanorPatientId: string;
  let applicantToken: string;
  let applicantUserId: string;

  beforeEach(async () => {
    clearRateLimitStore();
    db.seedInitialData();

    // Login Eleanor (Elder)
    const eleanorRes = await request(app).post('/api/auth/demo-login').send({ role: 'elderly' });
    eleanorToken = eleanorRes.body.token;
    eleanorPatientId = eleanorRes.body.user.patient_id;

    // Register a new applicant
    const applicantEmail = `applicant_${Date.now()}_${Math.random().toString(36).substring(7)}@careverse.test`;
    const applicantRes = await request(app).post('/api/auth/register').send({
      email: applicantEmail,
      password: 'StrongPassword123!',
      full_name: 'Uncle George',
      role: 'family'
    });
    applicantToken = applicantRes.body.token;
    applicantUserId = applicantRes.body.user.id;
  });

  it('should allow Eleanor to generate an expiring 6-character passcode', async () => {
    const res = await request(app)
      .post('/api/care-circle/passcode')
      .set('Authorization', `Bearer ${eleanorToken}`)
      .send({
        relationship: 'Granddaughter',
        role: 'family',
        expires_in_hours: 48,
        max_uses: 3
      });

    expect(res.status).toBe(201);
    expect(res.body.passcode).toBeDefined();
    expect(res.body.passcode).toHaveLength(6);
    expect(res.body.invite).toBeDefined();
    expect(res.body.invite.passcode_hash).toBeUndefined(); // Security: raw hash never exposed
  });

  it('should list active passcodes including pre-seeded CARE-2026', async () => {
    const res = await request(app)
      .get(`/api/care-circle/passcodes?patient_id=${eleanorPatientId}`)
      .set('Authorization', `Bearer ${eleanorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.passcodes)).toBe(true);
    expect(res.body.passcodes.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject invalid passcode input with 400', async () => {
    const res = await request(app)
      .post('/api/care-circle/join-passcode')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ passcode: 'WRONG9' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid or unrecognized passcode');
  });

  it('should join circle in pending status when using pre-seeded CARE-2026 code', async () => {
    const res = await request(app)
      .post('/api/care-circle/join-passcode')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ passcode: 'CARE-2026' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.message).toContain('pending approval by the elder');
    expect(res.body.member).toBeDefined();
    expect(res.body.member.status).toBe('pending');

    const pendingMemberId = res.body.member.id;

    // Eleanor sees the pending request
    const pendingListRes = await request(app)
      .get(`/api/care-circle/pending?patient_id=${eleanorPatientId}`)
      .set('Authorization', `Bearer ${eleanorToken}`);

    expect(pendingListRes.status).toBe(200);
    const found = pendingListRes.body.pending.find((p: any) => p.id === pendingMemberId);
    expect(found).toBeDefined();

    // Eleanor approves the pending member
    const approveRes = await request(app)
      .patch(`/api/care-circle/members/${pendingMemberId}/approve`)
      .set('Authorization', `Bearer ${eleanorToken}`)
      .send({
        can_manage_appointments: true,
        can_add_notes: true
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.member.status).toBe('active');

    // Eleanor configures granular privacy permissions
    const permRes = await request(app)
      .patch(`/api/care-circle/members/${pendingMemberId}/elder-permissions`)
      .set('Authorization', `Bearer ${eleanorToken}`)
      .send({
        medications: true,
        appointments: true,
        wellbeing: false, // restrict private daily check-in
        care_notes: true
      });

    expect(permRes.status).toBe(200);
    expect(permRes.body.permissions.wellbeing).toBe(false);
  });

  it('should lockout caller with 429 after 5 failed passcode attempts', async () => {
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/care-circle/join-passcode')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ passcode: `FAIL0${i}` });
      expect(res.status).toBe(400);
    }

    // 5th attempt triggers lockout
    const fifthRes = await request(app)
      .post('/api/care-circle/join-passcode')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ passcode: 'FAIL05' });

    expect(fifthRes.status).toBe(429);
    expect(fifthRes.body.error).toContain('locked out');
  });
});
