import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { Appointment } from '../types/index.js';

const router = Router();
router.use(authenticateJwt);

const appointmentSchema = z.object({
  patient_id: z.string().optional(),
  doctor_name: z.string().min(1, 'Doctor name is required'),
  specialty: z.string().min(1, 'Specialty is required'),
  hospital_clinic: z.string().min(1, 'Hospital or clinic is required'),
  address: z.string().optional(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  appointment_time: z.string().min(1, 'Time is required'),
  contact_number: z.string().optional(),
  appointment_purpose: z.string().min(1, 'Purpose is required'),
  preparation_checklist: z.array(z.object({
    task: z.string(),
    completed: z.boolean()
  })).default([]),
  notes: z.string().optional(),
  follow_up_date: z.string().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled')
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

// GET /api/appointments
router.get('/', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  let appointments = db.getAppointments(patientId);
  const statusFilter = req.query.status as string;
  if (statusFilter) {
    appointments = appointments.filter(a => a.status === statusFilter);
  }

  // Sort upcoming first
  appointments.sort((a, b) => `${a.appointment_date} ${a.appointment_time}`.localeCompare(`${b.appointment_date} ${b.appointment_time}`));

  res.json({ appointments });
});

// POST /api/appointments
router.post('/', (req: Request, res: Response): void => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const patientId = parsed.data.patient_id || resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'manage_appointments')) return;

  const newAppointment: Appointment = {
    ...parsed.data,
    id: uuidv4(),
    patient_id: patientId,
    created_at: new Date().toISOString()
  };

  const created = db.createAppointment(newAppointment);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: 'APPOINTMENT_SCHEDULED',
    resource_type: 'APPOINTMENT',
    resource_id: created.id,
    details: { doctor: created.doctor_name, date: created.appointment_date, time: created.appointment_time }
  });

  res.status(201).json({ appointment: created });
});

// GET /api/appointments/:id
router.get('/:id', (req: Request, res: Response): void => {
  const appt = db.getAppointmentById(req.params.id);
  if (!appt) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, appt.patient_id, 'view')) return;

  res.json({ appointment: appt });
});

// PUT /api/appointments/:id
router.put('/:id', (req: Request, res: Response): void => {
  const appt = db.getAppointmentById(req.params.id);
  if (!appt) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, appt.patient_id, 'manage_appointments')) return;

  const updated = db.updateAppointment(appt.id, req.body);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: appt.patient_id,
    action: 'APPOINTMENT_UPDATED',
    resource_type: 'APPOINTMENT',
    resource_id: appt.id
  });

  res.json({ appointment: updated });
});

// PATCH /api/appointments/:id/checklist
router.patch('/:id/checklist', (req: Request, res: Response): void => {
  const appt = db.getAppointmentById(req.params.id);
  if (!appt) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, appt.patient_id, 'view')) return;

  const { taskIndex, completed } = req.body;
  if (typeof taskIndex !== 'number' || typeof completed !== 'boolean') {
    res.status(400).json({ error: 'taskIndex (number) and completed (boolean) are required.' });
    return;
  }

  const checklist = [...appt.preparation_checklist];
  if (checklist[taskIndex]) {
    checklist[taskIndex].completed = completed;
    const updated = db.updateAppointment(appt.id, { preparation_checklist: checklist });
    res.json({ appointment: updated });
    return;
  }

  res.status(400).json({ error: 'Invalid task index.' });
});

// DELETE /api/appointments/:id
router.delete('/:id', (req: Request, res: Response): void => {
  const appt = db.getAppointmentById(req.params.id);
  if (!appt) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, appt.patient_id, 'manage_appointments')) return;

  db.updateAppointment(appt.id, { status: 'cancelled' });

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: appt.patient_id,
    action: 'APPOINTMENT_CANCELLED',
    resource_type: 'APPOINTMENT',
    resource_id: appt.id
  });

  res.json({ message: 'Appointment marked as cancelled.' });
});


export default router;
