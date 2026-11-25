import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CareScoreService } from '../../src/services/careScoreService.js';
import { db } from '../../src/db/storageAdapter.js';

describe('CareScoreService Unit Tests', () => {
  const patientId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-25T18:00:00Z'));
    db.seedInitialData();
  });

  afterEach(() => vi.useRealTimers());

  it('should calculate transparent daily care score for seeded demo patient', () => {
    const score = CareScoreService.calculateDailyCareScore(patientId);

    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(['Excellent', 'Good', 'Needs Attention', 'In Progress']).toContain(score.rating);
    expect(score.disclaimer).toContain('routine completion indicator');
    expect(score.metrics.scheduledDoses).toBeGreaterThan(0);
    expect(score.metrics.completedDoses).toBeGreaterThan(0);
    expect(score.metrics.wellbeingCheckinRecorded).toBe(true);
  });

  it('should not present score as a medical diagnostic assessment', () => {
    const score = CareScoreService.calculateDailyCareScore(patientId);
    expect(score.disclaimer.toLowerCase()).toContain('not a clinical health diagnostic');
  });
});
