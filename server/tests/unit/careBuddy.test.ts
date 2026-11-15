import { describe, it, expect, beforeEach } from 'vitest';
import { CareBuddyService } from '../../src/services/careBuddyService.js';
import { db } from '../../src/db/storageAdapter.js';

describe('CareBuddyService Unit Tests', () => {
  const patientId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  beforeEach(() => {
    db.seedInitialData();
  });

  it('must strictly include medical disclaimer in all assistant responses', async () => {
    const response = await CareBuddyService.askCareBuddy(patientId, 'Hello, how are you?');
    expect(response.disclaimer).toContain('IMPORTANT MEDICAL DISCLAIMER');
    expect(response.disclaimer).toContain('CareBuddy is an AI routine support assistant');
    expect(response.disclaimer).toContain('does NOT provide medical advice');
  });

  it('should summarize today healthcare routine with real patient numbers', async () => {
    const response = await CareBuddyService.askCareBuddy(patientId, 'Summarize my day today');
    expect(response.reply).toContain('Eleanor Vance');
    expect(response.reply).toContain('Medications:');
    expect(response.reply).toContain('Daily Routine Care Score:');
    expect(response.contextUsed.activeMedsCount).toBeGreaterThan(0);
    expect(response.suggestedFollowUps.length).toBeGreaterThan(0);
  });

  it('should advise never taking double doses when asked about missed medications', async () => {
    const response = await CareBuddyService.askCareBuddy(patientId, 'I forgot a dose, should I take double?');
    expect(response.reply).toContain('NEVER take a double dose');
    expect(response.reply).toContain('prescribing clinic or local pharmacist');
  });

  it('should provide relevant questions to ask doctor for scheduled appointments', async () => {
    const response = await CareBuddyService.askCareBuddy(patientId, 'What questions should I ask my doctor?');
    expect(response.reply).toContain('Dr. Robert Mehta');
    expect(response.reply).toContain('Suggested Questions');
    expect(response.reply).toContain('blood pressure');
  });

  it('should generate a family daily digest', () => {
    const digest = CareBuddyService.generateFamilyDigest(patientId);
    expect(digest).toContain('CAREVERSE Family Daily Digest');
    expect(digest).toContain('Routine Completion:');
    expect(digest).toContain('Medication Doses:');
  });
});
