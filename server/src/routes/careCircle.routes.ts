import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { Invitation, CareCircleMember } from '../types/index.js';

const router = Router();
router.use(authenticateJwt);

const inviteSchema = z.object({
  patient_id: z.string().optional(),
  invited_email: z.string().email(),
  relationship: z.string().min(1, 'Relationship is required (e.g. Daughter, Nurse)'),
  role: z.enum(['family', 'caregiver']),
  can_view: z.boolean().default(true),
  can_manage_meds: z.boolean().default(false),
  can_manage_appointments: z.boolean().default(false),
  can_add_notes: z.boolean().default(true),
  expires_in_days: z.number().int().min(1).max(30).default(7)
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

// GET /api/care-circle - get active members and pending invitations
router.get('/', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  const members = db.getCareCircleMembers(patientId);
  const invitations = db.getInvitationsForPatient(patientId);

  res.json({
    members,
    invitations: invitations.filter(i => i.status === 'pending')
  });
});

// POST /api/care-circle/invite - generate secure invitation token
router.post('/invite', (req: Request, res: Response): void => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const patientId = parsed.data.patient_id || resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  // Only patient themselves or admin can invite members to their care circle
  if (req.user?.role !== 'admin' && req.user?.patient_id !== patientId) {
    res.status(403).json({ error: 'Only the patient may issue invitations to their Care Circle.' });
    return;
  }

  // Generate 32-byte cryptographic random token and SHA-256 hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date(Date.now() + parsed.data.expires_in_days * 86400000).toISOString();

  const invitation: Invitation = {
    id: uuidv4(),
    patient_id: patientId,
    invited_by: req.user!.id,
    invited_email: parsed.data.invited_email.toLowerCase(),
    relationship: parsed.data.relationship,
    role: parsed.data.role,
    token_hash: tokenHash,
    can_view: parsed.data.can_view,
    can_manage_meds: parsed.data.can_manage_meds,
    can_manage_appointments: parsed.data.can_manage_appointments,
    can_add_notes: parsed.data.can_add_notes,
    status: 'pending',
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  db.createInvitation(invitation);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: 'INVITATION_CREATED',
    resource_type: 'INVITATION',
    resource_id: invitation.id,
    details: { invited_email: invitation.invited_email, role: invitation.role }
  });

  // Return the raw token ONLY upon creation so the user can share it
  res.status(201).json({
    message: 'Invitation successfully created.',
    invitation: {
      ...invitation,
      raw_token: rawToken, // displayed to user to share or send via email
      invitation_code: rawToken.substring(0, 12).toUpperCase() // short readable code
    }
  });
});

// POST /api/care-circle/accept - accept invitation with token
router.post('/accept', (req: Request, res: Response): void => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Invitation token is required.' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'You must be authenticated to accept a Care Circle invitation.' });
    return;
  }

  // Token might be full hex or hashed
  const tokenHash = token.length === 64
    ? crypto.createHash('sha256').update(token).digest('hex')
    : token;

  // Search by token hash or full raw token match
  const allInvitations = db.getInvitationsForPatient('');
  let invitation = db.getInvitationByHash(tokenHash);

  if (!invitation) {
    // Also try matching by SHA-256 of whatever string was provided
    const computedHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    invitation = db.getInvitationByHash(computedHash);
  }

  if (!invitation) {
    res.status(404).json({ error: 'Invalid or expired invitation token.' });
    return;
  }

  if (invitation.status !== 'pending') {
    res.status(400).json({ error: `Invitation is no longer valid (Status: ${invitation.status}).` });
    return;
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    db.updateInvitation(invitation.id, { status: 'expired' });
    res.status(400).json({ error: 'This invitation has expired.' });
    return;
  }

  // Check if member is already in care circle
  const existingMember = db.getCareCircleMember(invitation.patient_id, req.user.id);
  if (existingMember) {
    db.updateInvitation(invitation.id, { status: 'accepted' });
    res.json({ message: 'You are already an active member of this Care Circle.', member: existingMember });
    return;
  }

  // Create active care circle member
  const newMember: CareCircleMember = {
    id: uuidv4(),
    patient_id: invitation.patient_id,
    member_user_id: req.user.id,
    relationship: invitation.relationship,
    can_view: invitation.can_view,
    can_manage_meds: invitation.can_manage_meds,
    can_manage_appointments: invitation.can_manage_appointments,
    can_add_notes: invitation.can_add_notes,
    status: 'active',
    created_at: new Date().toISOString()
  };

  db.addCareCircleMember(newMember);
  db.updateInvitation(invitation.id, { status: 'accepted' });

  db.logAudit({
    actor_id: req.user.id,
    patient_id: invitation.patient_id,
    action: 'INVITATION_ACCEPTED',
    resource_type: 'CARE_CIRCLE_MEMBER',
    resource_id: newMember.id,
    details: { role: invitation.role, relationship: invitation.relationship }
  });

  res.json({
    message: 'Care Circle invitation accepted successfully! You now have access.',
    member: newMember
  });
});

// PATCH /api/care-circle/:memberId/permissions - update member permissions
router.patch('/:memberId/permissions', (req: Request, res: Response): void => {
  const memberId = req.params.memberId;
  const permissionSchema = z.object({
    can_view: z.boolean().optional(),
    can_manage_meds: z.boolean().optional(),
    can_manage_appointments: z.boolean().optional(),
    can_add_notes: z.boolean().optional()
  });

  const parsed = permissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    return;
  }

  const updated = db.updateCareCircleMember(memberId, parsed.data);
  if (!updated) {
    res.status(404).json({ error: 'Care Circle member not found.' });
    return;
  }

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: updated.patient_id,
    action: 'CARE_CIRCLE_PERMISSIONS_UPDATED',
    resource_type: 'CARE_CIRCLE_MEMBER',
    resource_id: memberId,
    details: parsed.data
  });

  res.json({ member: updated });
});

// DELETE /api/care-circle/:memberId - revoke access
router.delete('/:memberId', (req: Request, res: Response): void => {
  const memberId = req.params.memberId;
  const updated = db.updateCareCircleMember(memberId, { status: 'revoked' });

  if (!updated) {
    res.status(404).json({ error: 'Care Circle member not found.' });
    return;
  }

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: updated.patient_id,
    action: 'CARE_CIRCLE_ACCESS_REVOKED',
    resource_type: 'CARE_CIRCLE_MEMBER',
    resource_id: memberId
  });

  res.json({ message: 'Access revoked successfully.' });
});

export default router;
