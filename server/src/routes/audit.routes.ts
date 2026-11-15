import { Router, Request, Response } from 'express';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { ReminderEngine } from '../services/reminderEngine.js';

const router = Router();
router.use(authenticateJwt);

const resolvePatientId = (req: Request): string => {
  const qPatient = (req.query.patientId || req.query.patient_id) as string;
  if (qPatient) return qPatient;
  if (req.body?.patient_id) return req.body.patient_id;
  if (req.body?.patientId) return req.body.patientId;
  if (req.user?.role === 'elderly' && req.user.patient_id) return req.user.patient_id;
  if (req.user) {
    const memberships = db.getCareCircleMembershipsForUser(req.user.id);
    if (memberships.length > 0) return memberships[0].patient_id;
  }
  return '';
};

// GET /api/audit/logs - view who accessed healthcare profile
router.get('/logs', (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.user.role === 'admin') {
    // Administrator can see all platform audit logs
    const allLogs = db.getAuditLogs();
    res.json({ logs: allLogs });
    return;
  }

  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  const logs = db.getAuditLogs(patientId);
  res.json({ logs });
});

// GET /api/audit/delivery-logs - view simulated email delivery logs for evaluator simulator
router.get('/delivery-logs', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const logs = db.getDeliveryLogs(patientId);
  res.json({ logs });
});

// POST /api/audit/trigger-reminder - Evaluator on-demand reminder simulator
router.post('/trigger-reminder', async (req: Request, res: Response): Promise<void> => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const type = req.body?.type;
  if (!type) {
    res.status(400).json({ error: 'Reminder type is required (e.g. upcoming_dose_15m, missed_dose_15m, missed_dose_60m, appointment_24h, appointment_2h, refill_alert).' });
    return;
  }

  try {
    const result = await ReminderEngine.triggerSimulatedReminder(type, patientId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to trigger reminder' });
  }
});

export default router;
