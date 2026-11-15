import { describe, it, expect, beforeEach } from 'vitest';
import { ReminderEngine } from '../../src/services/reminderEngine.js';
import { EmailService } from '../../src/services/emailService.js';
import { db } from '../../src/db/storageAdapter.js';

describe('ReminderEngine & EmailService Unit Tests', () => {
  beforeEach(() => {
    db.seedInitialData();
  });

  it('should build email HTML containing branding and safety notices when provided', () => {
    const safetyNote = 'Do not take a double dose to make up for a missed dose.';
    const html = EmailService.buildEmailHtml(
      'Test Title',
      '<p>Test body content</p>',
      safetyNote
    );

    expect(html).toContain('CAREVERSE');
    expect(html).toContain('Test Title');
    expect(html).toContain('Test body content');
    expect(html).toContain('Important Clinical Safety Note:');
    expect(html).toContain(safetyNote);
  });

  it('should successfully dispatch a simulated email in development mode', async () => {
    const result = await EmailService.sendEmail({
      recipientEmail: 'test@careverse.demo',
      recipientId: '11111111-1111-1111-1111-111111111111',
      type: 'medication_reminder',
      subject: 'Unit Test Notification',
      textContent: 'Notification test text',
      htmlContent: '<p>Notification test text</p>'
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('simulated');
    expect(result.provider).toBe('simulator');
    expect(result.notificationId).toBeDefined();
  });

  it('should deduplicate notifications with the same dedupHash', async () => {
    const dedupKey = 'unique-dedup-hash-12345';

    const first = await EmailService.sendEmail({
      recipientEmail: 'test@careverse.demo',
      recipientId: '11111111-1111-1111-1111-111111111111',
      type: 'medication_reminder',
      subject: 'First Attempt',
      textContent: 'First attempt',
      htmlContent: '<p>First attempt</p>',
      dedupHash: dedupKey
    });

    const second = await EmailService.sendEmail({
      recipientEmail: 'test@careverse.demo',
      recipientId: '11111111-1111-1111-1111-111111111111',
      type: 'medication_reminder',
      subject: 'Second Attempt (Duplicate)',
      textContent: 'Second attempt',
      htmlContent: '<p>Second attempt</p>',
      dedupHash: dedupKey
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.message).toContain('deduplicated');
    expect(second.notificationId).toBe(first.notificationId);
  });

  it('should run processTick without throwing unhandled exceptions', async () => {
    await expect(ReminderEngine.processTick()).resolves.not.toThrow();
  });
});
