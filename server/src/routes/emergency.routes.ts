import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { EmailService } from '../services/emailService.js';
import { EmergencyContact } from '../types/index.js';

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

// GET /api/emergency/contacts
router.get('/contacts', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const contacts = db.getEmergencyContacts(patientId);
  res.json({
    contacts,
    instructions: {
      us_standard: 'Dial 911 for immediate medical, fire, or police emergency assistance.',
      india_standard: 'Dial 112 (National Emergency) or 102 (Ambulance).',
      uk_standard: 'Dial 999 or 112.',
      disclaimer: 'Activating this SOS button notifies your designated emergency contacts and Care Circle. It does NOT automatically dispatch local ambulance or police.'
    }
  });
});

// POST /api/emergency/contacts
router.post('/contacts', (req: Request, res: Response): void => {
  const contactSchema = z.object({
    patient_id: z.string().optional(),
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name too long'),
    relationship: z.string().trim().min(1, 'Relationship is required').max(50, 'Relationship too long'),
    phone_number: z.string().trim().min(5, 'Valid phone number required').max(30, 'Phone number too long'),
    is_primary: z.boolean().default(false),
    notify_on_sos: z.boolean().default(true)
  });

  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const patientId = parsed.data.patient_id || resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'manage_profile')) return;

  const newContact: EmergencyContact = {
    ...parsed.data,
    id: uuidv4(),
    patient_id: patientId,
    created_at: new Date().toISOString()
  };

  const created = db.createEmergencyContact(newContact);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: 'EMERGENCY_CONTACT_ADDED',
    resource_type: 'EMERGENCY_CONTACT',
    resource_id: created.id,
    details: { name: created.name, relationship: created.relationship }
  });

  res.status(201).json({ contact: created });
});

// POST /api/emergency/sos - trigger emergency alert
router.post('/sos', async (req: Request, res: Response): Promise<void> => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const patient = db.getPatientProfileById(patientId);
  const user = patient ? db.getProfileById(patient.user_id) : undefined;
  const patientName = user?.full_name || 'Patient';

  const contacts = db.getEmergencyContacts(patientId);
  const careCircle = db.getCareCircleMembers(patientId);

  // Log urgent audit event
  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: 'EMERGENCY_SOS_ACTIVATED',
    resource_type: 'EMERGENCY',
    resource_id: patientId,
    details: {
      triggered_by: req.user?.full_name,
      patient_name: patientName,
      address: patient?.primary_address,
      condition: patient?.primary_condition
    }
  });

  const delivery = { sent: 0, simulated: 0, failed: 0, pending: 0 };
  // Dispatch emergency notifications to all active Care Circle members
  for (const member of careCircle) {
    if (member.member) {
      const result = await EmailService.sendEmail({
        recipientEmail: member.member.email,
        recipientId: member.member.id,
        patientId,
        type: 'emergency_sos',
        subject: `URGENT: Emergency SOS Activated by ${patientName}!`,
        textContent: `URGENT CARE ALERT: ${patientName} has pressed the Emergency SOS button in CAREVERSE at ${new Date().toLocaleTimeString()}.\n\nPrimary Address: ${patient?.primary_address || 'Check records'}\nMedical Condition: ${patient?.primary_condition || 'N/A'}\nAllergies: ${patient?.allergies?.join(', ') || 'None'}\n\nPlease reach out or visit immediately. If unresponsive, call 911 / 112 directly.`,
        htmlContent: EmailService.buildEmailHtml(
          `URGENT: EMERGENCY SOS ACTIVATION`,
          `<div style="background-color: #fee2e2; border-left: 6px solid #ef4444; padding: 16px; border-radius: 8px;">
             <h3 style="color: #991b1b; margin-top: 0;">EMERGENCY SOS ALERT</h3>
             <p><strong>${patientName}</strong> activated their emergency SOS assistance button on CAREVERSE at <strong>${new Date().toLocaleTimeString()}</strong>.</p>
             <p><strong>Known Address:</strong> ${patient?.primary_address || 'On file'}</p>
             <p><strong>Known Conditions:</strong> ${patient?.primary_condition || 'N/A'}</p>
             <p><strong>Allergies:</strong> ${patient?.allergies?.join(', ') || 'None recorded'}</p>
           </div>
           <p style="margin-top: 16px;"><strong>Immediate Action:</strong> Attempt voice contact immediately. If you cannot reach them or suspect an acute emergency, please contact local emergency medical services (911 / 112) without delay.</p>`,
          'This notification was triggered directly from the patient’s active CAREVERSE dashboard.'
        )
      });
      delivery[result.success ? result.status : 'failed']++;
    }
  }

  res.json({
    delivery,
    status: 'activated',
    message: 'SOS activation recorded. Review the Care Circle email delivery counts.',
    patientName,
    contacts,
    instructions: {
      immediateAction: 'If you are experiencing chest pain, difficulty breathing, or severe trauma, call local emergency services (911 / 112) immediately.',
      canCancel: true,
      cancelWindowSeconds: 60
    }
  });
});

// POST /api/emergency/cancel - cancel accidental activation
router.post('/cancel', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: 'EMERGENCY_SOS_CANCELLED',
    resource_type: 'EMERGENCY',
    resource_id: patientId,
    details: { cancelled_by: req.user?.full_name, reason: 'Accidental activation confirmed cancelled by user.' }
  });

  res.json({
    status: 'cancelled',
    message: 'Cancellation recorded in the activity log.'
  });
});


export default router;
