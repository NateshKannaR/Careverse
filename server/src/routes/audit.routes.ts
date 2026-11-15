import { Router, Request, Response } from 'express';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticateJwt);

const resolvePatientId = (req: Request): string => {
  if (req.query.patientId) return req.query.patientId as string;
  if (req.body.patient_id) return req.body.patient_id;
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

export default router;
