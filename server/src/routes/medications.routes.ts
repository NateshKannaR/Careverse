import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { checkPatientAccess, verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { Medication, MedicationAdministrationRecord, DoseStatus } from '../types/index.js';
import { predictAllRefills } from '../services/refillService.js';
import { getDailyDoseEvidence, getPatientDate } from '../services/adherencePatternService.js';

const router = Router();
router.use(authenticateJwt);

const medicationSchema = z.object({
  patient_id: z.string().optional(),
  name: z.string().min(1, 'Medication name is required'),
  category: z.string().min(1, 'Category is required'),
  dosage: z.string().min(1, 'Dosage is required (e.g., 1 Tablet)'),
  strength: z.string().optional(),
  frequency: z.string().min(1, 'Frequency is required'),
  times_of_day: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format')),
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

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

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

  res.json({ medications, can_manage: checkPatientAccess(req.user!, patientId, 'manage_meds').allowed });
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

  if (!verifyPatientAccess(req, res, patientId, 'manage_meds')) return;

  const newMedication: Medication = {
    ...parsed.data,
    id: uuidv4(),
    patient_id: patientId,
    created_at: new Date().toISOString()
  };

  if (newMedication.frequency.toLowerCase() === 'as needed') newMedication.times_of_day = [];
  else if (!newMedication.times_of_day.length || new Set(newMedication.times_of_day).size !== newMedication.times_of_day.length) {
    res.status(400).json({ error: 'Enter distinct scheduled times for this prescription.' });
    return;
  }
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

// GET /api/medications/refills/forecast - days-to-depletion refill forecasting
router.get('/refills/forecast', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const medications = db.getMedications(patientId, true);
  const today = getPatientDate(new Date(), db.getPatientTimeZone(patientId));
  const notes = new Set(db.getCareNotes(patientId).map(note => note.id));
  const forecast = predictAllRefills(medications).map(item => ({
    ...item, shared_today: notes.has(`refill-${item.medication_id}-${today}`),
  }));

  res.json({
    forecast,
    can_share: checkPatientAccess(req.user!, patientId, 'add_notes').allowed,
    urgent_count: forecast.filter(f => f.needs_urgent_refill).length,
    low_stock_count: forecast.filter(f => f.is_low_stock).length
  });
});

// Keep one refill handoff per prescription per patient-local day, including retries.
router.post('/:id/refill-note', (req: Request, res: Response): void => {
  const med = db.getMedicationById(req.params.id);
  if (!med || med.archived_at) { res.status(404).json({ error: 'Prescription not found.' }); return; }
  if (!verifyPatientAccess(req, res, med.patient_id, 'add_notes')) return;
  if (!med.is_active) { res.status(409).json({ error: 'This prescription is paused.' }); return; }
  const now = new Date();
  const date = getPatientDate(now, db.getPatientTimeZone(med.patient_id));
  const id = `refill-${med.id}-${date}`;
  const existing = db.getCareNotes(med.patient_id).some(note => note.id === id);
  if (!existing) {
    db.createCareNote({
      id, patient_id: med.patient_id, author_id: req.user!.id, category: 'medical',
      title: `Refill follow-up · ${med.name}`, is_priority: true, created_at: now.toISOString(),
      content: `Please coordinate the next refill with ${med.pharmacy || 'the pharmacy'}. Remaining supply on file: ${med.remaining_supply ?? 'unknown'} doses.`,
    });
    db.logAudit({ actor_id: req.user!.id, patient_id: med.patient_id, action: 'REFILL_NOTE_SHARED', resource_type: 'CARE_NOTE', resource_id: id });
  }
  res.status(existing ? 200 : 201).json({ shared_today: true, note_id: id });
});

// GET /api/medications/doses/today - timeline of today's doses with statuses
router.get('/doses/today', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const now = new Date();
  const evidence = getDailyDoseEvidence(db.getAdministrationRecords(patientId), now, db.getPatientTimeZone(patientId));
  const records = evidence.records
    .sort((a, b) => Date.parse(a.scheduled_time) - Date.parse(b.scheduled_time))
    .map(record => {
      if (record.status !== 'upcoming' && record.status !== 'due_now') return record;
      return { ...record, status: Date.parse(record.scheduled_time) <= now.getTime() ? 'due_now' : 'upcoming' };
    });
  res.json({
    date: evidence.date,
    time_zone: evidence.timeZone,
    records,
    summary: {
      total: records.length,
      due: evidence.due,
      taken: evidence.taken,
      upcoming: evidence.upcoming,
      due_now: evidence.pending,
      missed: evidence.missed,
      skipped: evidence.skipped,
    },
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

  const patientId = record.patient_id;
  if (!verifyPatientAccess(req, res, patientId, 'manage_meds')) return;
  if (record.status === 'taken') {
    res.status(409).json({ error: 'This dose has already been recorded as taken.' });
    return;
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
  if (!med || med.archived_at) {
    res.status(404).json({ error: 'Medication not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, med.patient_id, 'view')) return;

  res.json({ medication: med });
});

// PUT /api/medications/:id - update medication
router.put('/:id', (req: Request, res: Response): void => {
  const med = db.getMedicationById(req.params.id);
  if (!med || med.archived_at) {
    res.status(404).json({ error: 'Medication not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, med.patient_id, 'manage_meds')) return;

  const updates = medicationSchema.omit({ patient_id: true }).partial().safeParse(req.body);
  if (!updates.success) { res.status(400).json({ error: 'Invalid prescription fields.' }); return; }
  const updated = db.updateMedication(med.id, updates.data);

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
  if (!med || med.archived_at) {
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
  if (!med || med.archived_at) {
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
