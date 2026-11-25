import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { db } from '../../src/db/storageAdapter.js';
import { app } from '../../src/server.js';

describe('Medication reporting API', () => {
  let auth: string;
  let patientId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-25T18:00:00Z'));
    db.seedInitialData();
    const login = await request(app).post('/api/auth/demo-login').send({ role: 'elderly' }).expect(200);
    auth = 'Bearer ' + login.body.token;
    patientId = login.body.user.patient_id;
  });

  afterEach(() => vi.useRealTimers());

  it('returns matching daily counts in the timeline and routine report', async () => {
    const timeline = await request(app).get('/api/medications/doses/today').set('Authorization', auth).expect(200);
    const report = await request(app).get('/api/analytics/daily-score').set('Authorization', auth).expect(200);
    const summary = timeline.body.summary;
    const score = report.body.score;

    expect(score.date).toBe(timeline.body.date);
    expect(score.timeZone).toBe(timeline.body.time_zone);
    expect(score.metrics).toMatchObject({
      dueDoses: summary.due, completedDoses: summary.taken,
      upcomingDoses: summary.upcoming, pendingDoses: summary.due_now,
    });
    expect(summary.due).toBe(3);
    expect(summary.upcoming).toBe(2);
  });

  it('rejects a nonexistent calendar date', async () => {
    await request(app).get('/api/analytics/daily-score?date=2026-11-31').set('Authorization', auth).expect(400);
  });

  it('requires authentication and preserves quoted notes in the private CSV', async () => {
    const record = db.getAdministrationRecords(patientId)[0];
    db.updateAdministrationRecord(record.id, { notes: 'Recorded, "with breakfast".' });

    await request(app).get('/api/analytics/export-csv').expect(401);
    const csv = await request(app).get('/api/analytics/export-csv').set('Authorization', auth).expect(200);
    expect(csv.headers['cache-control']).toBe('private, no-store');
    expect(csv.headers['content-disposition']).toMatch(/attachment/);
    expect(csv.text).toContain('"Recorded, ""with breakfast""."');
  });
});
