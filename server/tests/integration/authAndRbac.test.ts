import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';
import { db } from '../../src/db/storageAdapter.js';

describe('Auth & RBAC Integration Tests', () => {
  beforeEach(() => {
    db.seedInitialData();
  });

  it('should reject unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/medications');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('should successfully login with demo elderly credentials', async () => {
    const res = await request(app).post('/api/auth/demo-login').send({ role: 'elderly' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('elderly');
    expect(res.body.user.email).toBe('eleanor@careverse.demo');
    expect(res.body.user.patient_id).toBeDefined();
  });

  it('should successfully login with demo caregiver credentials', async () => {
    const res = await request(app).post('/api/auth/demo-login').send({ role: 'caregiver' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('caregiver');
    expect(res.body.user.email).toBe('sarah@careverse.demo');
  });

  it('should register a new user and create patient profile if role is elderly', async () => {
    const randomEmail = `newuser_${Date.now()}@careverse.test`;
    const res = await request(app).post('/api/auth/register').send({
      email: randomEmail,
      password: 'StrongPassword123!',
      full_name: 'Arthur Pendelton',
      role: 'elderly',
      primary_condition: 'Mild Hypertension',
      blood_group: 'A+'
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(randomEmail);
    expect(res.body.user.patient_id).toBeDefined();
  });

  it('should return 401 for invalid password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'eleanor@careverse.demo',
      password: 'WrongPassword123!'
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid email address or password');
  });

  it('should return authenticated user profile via /api/auth/me', async () => {
    const loginRes = await request(app).post('/api/auth/demo-login').send({ role: 'family' });
    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('david@careverse.demo');
    expect(meRes.body.user.role).toBe('family');
  });
});
