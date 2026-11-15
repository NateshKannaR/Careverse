import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { authorizePatientAccess } from '../middleware/rbacMiddleware.js';
const router = Router();
router.use(authenticateJwt);
// GET /api/patients/accessible - returns all patients this user is allowed to access
router.get('/accessible', (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    if (req.user.role === 'elderly') {
        const patient = db.getPatientProfileByUserId(req.user.id);
        res.json({ patients: patient ? [{ ...patient, profile: req.user }] : [] });
        return;
    }
    if (req.user.role === 'admin') {
        const all = db.getAllPatientProfiles().map(p => ({
            ...p,
            profile: db.getProfileById(p.user_id)
        }));
        res.json({ patients: all });
        return;
    }
    // For family and caregiver: get active care circle memberships
    const memberships = db.getCareCircleMembershipsForUser(req.user.id);
    const patientProfiles = memberships
        .map(m => {
        const patient = db.getPatientProfileById(m.patient_id);
        if (!patient)
            return null;
        return {
            ...patient,
            relationship: m.relationship,
            permissions: {
                can_view: m.can_view,
                can_manage_meds: m.can_manage_meds,
                can_manage_appointments: m.can_manage_appointments,
                can_add_notes: m.can_add_notes
            },
            profile: db.getProfileById(patient.user_id)
        };
    })
        .filter(Boolean);
    res.json({ patients: patientProfiles });
});
// GET /api/patients/me
router.get('/me', (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const patient = db.getPatientProfileByUserId(req.user.id);
    if (!patient) {
        res.status(404).json({ error: 'Patient profile not found for this user.' });
        return;
    }
    res.json({ patient: { ...patient, profile: req.user } });
});
// GET /api/patients/:patientId
router.get('/:patientId', authorizePatientAccess('view'), (req, res) => {
    const patientId = req.params.patientId;
    const patient = db.getPatientProfileById(patientId);
    if (!patient) {
        res.status(404).json({ error: 'Patient profile not found.' });
        return;
    }
    const patientUser = db.getProfileById(patient.user_id);
    res.json({ patient: { ...patient, profile: patientUser } });
});
// PUT /api/patients/:patientId
router.put('/:patientId', authorizePatientAccess('manage_profile'), (req, res) => {
    const patientId = req.params.patientId;
    const updateSchema = z.object({
        date_of_birth: z.string().optional(),
        blood_group: z.string().optional(),
        primary_condition: z.string().optional(),
        emergency_notes: z.string().optional(),
        primary_address: z.string().optional(),
        allergies: z.array(z.string()).optional()
    });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
        return;
    }
    const updated = db.updatePatientProfile(patientId, parsed.data);
    if (!updated) {
        res.status(404).json({ error: 'Patient profile not found.' });
        return;
    }
    db.logAudit({
        actor_id: req.user?.id,
        patient_id: patientId,
        action: 'UPDATE_PATIENT_PROFILE',
        resource_type: 'PATIENT',
        resource_id: patientId
    });
    res.json({ patient: updated });
});
export default router;
