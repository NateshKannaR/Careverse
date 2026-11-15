import { Router } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { CareBuddyService } from '../services/careBuddyService.js';
import { db } from '../db/storageAdapter.js';
const router = Router();
router.use(authenticateJwt);
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
// POST /api/carebuddy/chat
router.post('/chat', async (req, res) => {
    const chatSchema = z.object({
        message: z.string().min(1, 'Message is required'),
        patient_id: z.string().optional()
    });
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
        return;
    }
    const patientId = parsed.data.patient_id || resolvePatientId(req);
    if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required.' });
        return;
    }
    const response = await CareBuddyService.askCareBuddy(patientId, parsed.data.message);
    db.logAudit({
        actor_id: req.user?.id,
        patient_id: patientId,
        action: 'CAREBUDDY_QUERY',
        resource_type: 'AI_ASSISTANT',
        details: { query: parsed.data.message }
    });
    res.json(response);
});
// GET /api/carebuddy/summary
router.get('/summary', async (req, res) => {
    const patientId = resolvePatientId(req);
    if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required.' });
        return;
    }
    const response = await CareBuddyService.askCareBuddy(patientId, 'Summarize today routine and progress');
    res.json(response);
});
// GET /api/carebuddy/digest
router.get('/digest', (req, res) => {
    const patientId = resolvePatientId(req);
    if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required.' });
        return;
    }
    const digest = CareBuddyService.generateFamilyDigest(patientId);
    res.json({ digest });
});
export default router;
