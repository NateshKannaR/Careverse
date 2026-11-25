import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { WellbeingCheckin } from '../types/index.js';
import { getPatientDate } from '../services/adherencePatternService.js';

const router = Router();
router.use(authenticateJwt);

const checkinSchema = z.object({
  patient_id: z.string().optional(),
  mood: z.enum(['great', 'good', 'okay', 'tired', 'unwell']),
  energy_level: z.number().int().min(1).max(5).default(3),
  pain_level: z.number().int().min(0).max(10).default(0),
  symptoms: z.array(z.string()).default([]),
  notes: z.string().optional()
});

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

// GET /api/wellbeing/today
router.get('/today', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const checkin = db.getWellbeingCheckinForDate(patientId, getPatientDate(new Date(), db.getPatientTimeZone(patientId)));
  res.json({ checkin: checkin || null });
});

// GET /api/wellbeing/history
router.get('/history', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const limit = parseInt((req.query.limit as string) || '30', 10);
  const checkins = db.getWellbeingCheckins(patientId, limit);
  res.json({ checkins });
});

// POST /api/wellbeing
router.post('/', (req: Request, res: Response): void => {
  const parsed = checkinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const patientId = parsed.data.patient_id || resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;


  const todayStr = getPatientDate(new Date(), db.getPatientTimeZone(patientId));

  const checkin: WellbeingCheckin = {
    id: uuidv4(),
    patient_id: patientId,
    recorded_by: req.user!.id,
    checkin_date: todayStr,
    mood: parsed.data.mood,
    energy_level: parsed.data.energy_level,
    pain_level: parsed.data.pain_level,
    symptoms: parsed.data.symptoms,
    notes: parsed.data.notes,
    created_at: new Date().toISOString()
  };

  const recorded = db.recordWellbeingCheckin(checkin);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: 'WELLBEING_CHECKIN_RECORDED',
    resource_type: 'WELLBEING_CHECKIN',
    resource_id: recorded.id,
    details: { mood: recorded.mood, energy: recorded.energy_level, pain: recorded.pain_level }
  });

  res.status(201).json({
    message: 'Wellbeing check-in saved.',
    checkin: recorded
  });
});

export default router;
