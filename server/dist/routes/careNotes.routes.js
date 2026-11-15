import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { verifyPatientAccess } from '../middleware/rbacMiddleware.js';
const router = Router();
router.use(authenticateJwt);
const noteSchema = z.object({
    patient_id: z.string().optional(),
    category: z.enum(['general', 'medical', 'diet', 'vitals']).default('general'),
    title: z.string().trim().min(1, 'Title is required').max(255, 'Title too long'),
    content: z.string().trim().min(1, 'Content is required').max(5000, 'Content exceeds maximum length'),
    is_priority: z.boolean().default(false)
});
const resolvePatientId = (req) => {
    const qPatient = (req.query.patientId || req.query.patient_id);
    if (qPatient)
        return qPatient;
    if (req.body?.patient_id)
        return req.body.patient_id;
    if (req.body?.patientId)
        return req.body.patientId;
    if (req.user?.role === 'elderly' && req.user.patient_id)
        return req.user.patient_id;
    if (req.user) {
        const memberships = db.getCareCircleMembershipsForUser(req.user.id);
        if (memberships.length > 0)
            return memberships[0].patient_id;
    }
    return '';
};
// GET /api/care-notes
router.get('/', (req, res) => {
    const patientId = resolvePatientId(req);
    if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required.' });
        return;
    }
    if (!verifyPatientAccess(req, res, patientId, 'view'))
        return;
    const notes = db.getCareNotes(patientId);
    res.json({ notes });
});
// POST /api/care-notes
router.post('/', (req, res) => {
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
    if (!verifyPatientAccess(req, res, patientId, 'add_notes'))
        return;
    const note = {
        id: uuidv4(),
        patient_id: patientId,
        author_id: req.user.id,
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
