import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { authorizePatientAccess, verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { Medication, MedicationAdministrationRecord, DoseStatus } from '../types/index.js';

const router = Router();
router.use(authenticateJwt);

const medicationSchema = z.object({
  patient_id: z.string().optional(),
  name: z.string().min(1, 'Medication name is required'),
  category: z.string().min(1, 'Category is required'),
  dosage: z.string().min(1, 'Dosage is required (e.g., 1 Tablet)'),
  strength: z.string().optional(),
  frequency: z.string().min(1, 'Frequency is required'),
  times_of_day: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format')).min(1, 'At least one time of day required'),
  instructions: z.string().optional(),
  prescribing_doctor: z.string().optional(),
  pharmacy: z.string().optional(),
  icon_type: z.enum(['pill', 'capsule', 'liquid', 'injection', 'drops']).default('pill'),
  refill_date: z.string().optional(),
  total_supply: z.number().int().positive().default(30),
  remaining_supply: z.number().int().min(0).default(30),
  is_active: z.boolean().default(true)
});

// Helper to determine target patient ID
const resolvePatientId = (req: Request): string => {
  const qPatient = (req.query.patientId || req.query.patient_id) as string;
  if (qPatient) return qPatient;
  if (req.body?.patient_id) return req.body.patient_id;
  if (req.body?.patientId) return req.body.patientId;
  if (req.params.patientId) return req.params.patientId;
  if (req.user?.role === 'elderly' && req.user.patient_id) return req.user.patient_id;
  // Fallback to first accessible patient if caregiver or family
  if (req.user) {
    const memberships = db.getCareCircleMembershipsForUser(req.user.id);
    if (memberships.length > 0) return memberships[0].patient_id;
  }
  return '';
};

// GET /api/medications - list medications
router.get('/', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  // Authorization check
  if (req.user?.role !== 'admin') {
    if (req.user?.role === 'elderly' && req.user.patient_id !== patientId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    if ((req.user?.role === 'family' || req.user?.role === 'caregiver') && !db.isMemberOfPatientCareCircle(patientId, req.user.id)) {
      res.status(403).json({ error: 'Access denied. You are not a member of this Care Circle.' });
      return;
    }
  }

  const activeOnly = req.query.active === 'true';
  const search = (req.query.search as string || '').toLowerCase();
  let medications = db.getMedications(patientId, activeOnly);

  if (search) {
    medications = medications.filter(m =>
      m.name.toLowerCase().includes(search) ||
      m.category.toLowerCase().includes(search) ||
      (m.prescribing_doctor && m.prescribing_doctor.toLowerCase().includes(search))
    );
  }

  res.json({ medications });
});

// POST /api/medications - add medication
router.post('/', (req: Request, res: Response): void => {
  const parsed = medicationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const patientId = parsed.data.patient_id || resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  // Check manage_meds permission
  if (req.user?.role !== 'admin') {
    if (req.user?.role === 'elderly' && req.user.patient_id !== patientId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    if (req.user?.role === 'family' || req.user?.role === 'caregiver') {
      const member = db.getCareCircleMember(patientId, req.user.id);
      if (!member || !member.can_manage_meds) {
        res.status(403).json({ error: 'Access denied. You do not have permission to manage medications for this patient.' });
        return;
      }
    }
  }

  const newMedication: Medication = {
    ...parsed.data,
    id: uuidv4(),
    patient_id: patientId,
    created_at: new Date().toISOString()
  };

  const created = db.createMedication(newMedication);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: 'MEDICATION_ADDED',
    resource_type: 'MEDICATION',
    resource_id: created.id,
    details: { name: created.name, dosage: created.dosage, frequency: created.frequency }
  });

  res.status(201).json({ medication: created });
});

// GET /api/medications/doses/today - timeline of today's doses with statuses
router.get('/doses/today', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const startIso = `${todayStr}T00:00:00.000Z`;
  const endIso = `${todayStr}T23:59:59.999Z`;

  const records = db.getAdministrationRecords(patientId, startIso, endIso);

  // Sort chronologically by scheduled_time
  records.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  res.json({
    date: todayStr,
    records,
    summary: {
      total: records.length,
      taken: records.filter(r => r.status === 'taken').length,
      upcoming: records.filter(r => r.status === 'upcoming').length,
      due_now: records.filter(r => r.status === 'due_now').length,
      missed: records.filter(r => r.status === 'missed').length,
      skipped: records.filter(r => r.status === 'skipped').length
    }
  });
});

// POST /api/medications/doses/:doseId/record - mark dose status (taken/skipped/missed)
router.post('/doses/:doseId/record', (req: Request, res: Response): void => {
  const doseId = req.params.doseId;
  const statusSchema = z.object({
    status: z.enum(['taken', 'skipped', 'missed', 'acknowledged']),
    notes: z.string().optional()
  });

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid status', details: parsed.error.format() });
    return;
  }

  const record = db.getAdministrationRecordById(doseId);
  if (!record) {
    res.status(404).json({ error: 'Dose administration record not found.' });
    return;
  }

  // Prevent duplicate recorded taken status
  if (record.status === 'taken' && parsed.data.status === 'taken') {
    res.status(409).json({ error: 'This dose has already been recorded as taken.' });
    return;
  }

  // Permission check
  const patientId = record.patient_id;
  if (req.user?.role !== 'admin') {
    if (req.user?.role === 'elderly' && req.user.patient_id !== patientId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    if (req.user?.role === 'family' || req.user?.role === 'caregiver') {
      const member = db.getCareCircleMember(patientId, req.user.id);
      if (!member || !member.can_manage_meds) {
        res.status(403).json({ error: 'Access denied. You do not have permission to record doses.' });
        return;
      }
    }
  }

  const updatedRecord = db.updateAdministrationRecord(doseId, {
    status: parsed.data.status,
    actual_time: parsed.data.status === 'taken' ? new Date().toISOString() : undefined,
    recorded_by: req.user?.id,
    notes: parsed.data.notes || record.notes
  });

  // If marked taken, decrement medication supply count if available
  if (parsed.data.status === 'taken') {
    const med = db.getMedicationById(record.medication_id);
    if (med && med.remaining_supply !== undefined && med.remaining_supply > 0) {
      db.updateMedication(med.id, { remaining_supply: med.remaining_supply - 1 });
    }
  }

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: `DOSE_${parsed.data.status.toUpperCase()}`,
    resource_type: 'MEDICATION_ADMINISTRATION_RECORD',
    resource_id: doseId,
    details: { status: parsed.data.status, notes: parsed.data.notes }
  });

  res.json({
    message: `Dose recorded as ${parsed.data.status}.`,
    record: updatedRecord
  });
});

// GET /api/medications/:id
router.get('/:id', (req: Request, res: Response): void => {
  const med = db.getMedicationById(req.params.id);
  if (!med) {
    res.status(404).json({ error: 'Medication not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, med.patient_id, 'view')) return;

  res.json({ medication: med });
});

// PUT /api/medications/:id - update medication
router.put('/:id', (req: Request, res: Response): void => {
  const med = db.getMedicationById(req.params.id);
  if (!med) {
    res.status(404).json({ error: 'Medication not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, med.patient_id, 'manage_meds')) return;

  const updated = db.updateMedication(med.id, req.body);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: med.patient_id,
    action: 'MEDICATION_UPDATED',
    resource_type: 'MEDICATION',
    resource_id: med.id,
    details: req.body
  });

  res.json({ medication: updated });
});

// PATCH /api/medications/:id/pause - toggle active status
router.patch('/:id/pause', (req: Request, res: Response): void => {
  const med = db.getMedicationById(req.params.id);
  if (!med) {
    res.status(404).json({ error: 'Medication not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, med.patient_id, 'manage_meds')) return;

  const newStatus = !med.is_active;
  const updated = db.updateMedication(med.id, { is_active: newStatus });

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: med.patient_id,
    action: newStatus ? 'MEDICATION_RESUMED' : 'MEDICATION_PAUSED',
    resource_type: 'MEDICATION',
    resource_id: med.id
  });

  res.json({
    message: newStatus ? 'Medication resumed.' : 'Medication paused.',
    medication: updated
  });
});

// DELETE /api/medications/:id - delete medication
router.delete('/:id', (req: Request, res: Response): void => {
  const med = db.getMedicationById(req.params.id);
  if (!med) {
    res.status(404).json({ error: 'Medication not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, med.patient_id, 'manage_meds')) return;

  db.deleteMedication(med.id);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: med.patient_id,
    action: 'MEDICATION_DELETED',
    resource_type: 'MEDICATION',
    resource_id: med.id,
    details: { name: med.name }
  });

  res.json({ message: 'Medication successfully deleted.' });
});


export default router;
