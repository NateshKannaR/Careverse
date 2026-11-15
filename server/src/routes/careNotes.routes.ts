import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { CareNote } from '../types/index.js';

const router = Router();
router.use(authenticateJwt);

const noteSchema = z.object({
  patient_id: z.string().optional(),
  category: z.enum(['general', 'medical', 'diet', 'vitals']).default('general'),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  is_priority: z.boolean().default(false)
});

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

// GET /api/care-notes
router.get('/', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  const notes = db.getCareNotes(patientId);
  res.json({ notes });
});

// POST /api/care-notes
router.post('/', (req: Request, res: Response): void => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const patientId = parsed.data.patient_id || resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  const note: CareNote = {
    id: uuidv4(),
    patient_id: patientId,
    author_id: req.user!.id,
    category: parsed.data.category,
    title: parsed.data.title,
    content: parsed.data.content,
    is_priority: parsed.data.is_priority,
    created_at: new Date().toISOString()
  };

  const created = db.createCareNote(note);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: 'CARE_NOTE_CREATED',
    resource_type: 'CARE_NOTE',
    resource_id: created.id,
    details: { title: created.title, category: created.category, priority: created.is_priority }
  });

  res.status(201).json({
    message: 'Care note added.',
    note: {
      ...created,
      author: db.getProfileById(created.author_id)
    }
  });
});

export default router;
