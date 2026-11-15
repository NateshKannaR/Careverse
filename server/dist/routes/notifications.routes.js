import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { EmailService } from '../services/emailService.js';
const router = Router();
router.use(authenticateJwt);
// GET /api/notifications - user notifications
router.get('/', (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const notifications = db.getNotificationsForUser(req.user.id);
    res.json({ notifications });
});
// GET /api/notifications/preferences
router.get('/preferences', (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    let prefs = db.getNotificationPreferences(req.user.id);
    if (!prefs) {
        prefs = db.updateNotificationPreferences(req.user.id, {
            email_enabled: true,
            upcoming_dose_minutes: 15,
            missed_dose_grace_minutes: 30,
            appointment_reminders_enabled: true,
            caregiver_escalation_enabled: true,
            daily_digest_enabled: true
        });
    }
    res.json({ preferences: prefs });
});
// PUT /api/notifications/preferences
router.put('/preferences', (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const updateSchema = z.object({
        email_enabled: z.boolean().optional(),
        upcoming_dose_minutes: z.number().int().min(5).max(120).optional(),
        missed_dose_grace_minutes: z.number().int().min(10).max(180).optional(),
        appointment_reminders_enabled: z.boolean().optional(),
        caregiver_escalation_enabled: z.boolean().optional(),
        daily_digest_enabled: z.boolean().optional()
    });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid settings', details: parsed.error.format() });
        return;
    }
    const updated = db.updateNotificationPreferences(req.user.id, parsed.data);
    res.json({ message: 'Notification preferences updated.', preferences: updated });
});
// GET /api/notifications/simulator - Evaluator Visual Notification Simulator Inbox
router.get('/simulator', (req, res) => {
    // Returns all dispatched notifications with recipient details and HTML preview
    const all = db.getAllNotifications().map(n => ({
        ...n,
        recipient: db.getProfileById(n.recipient_id)
    }));
    res.json({
        notifications: all,
        provider: process.env.RESEND_API_KEY ? 'Resend (Live Production)' : 'Development Notification Simulator',
        totalDispatched: all.length
    });
});
// POST /api/notifications/test-send - trigger an immediate sample notification
router.post('/test-send', async (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const result = await EmailService.sendEmail({
        recipientEmail: req.user.email,
        recipientId: req.user.id,
        type: 'medication_reminder',
        subject: 'CAREVERSE Test Notification',
        textContent: `Hello ${req.user.full_name}, this is a test notification confirming your CAREVERSE communication preferences.`,
        htmlContent: EmailService.buildEmailHtml('Notification Verification', `<p>Hello <strong>${req.user.full_name}</strong>,</p>
       <p>This email confirms that your CAREVERSE healthcare notification channel is active and functioning properly.</p>`)
    });
    res.json({
        message: 'Test notification processed.',
        result
    });
});
export default router;
