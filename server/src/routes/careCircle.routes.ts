import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { config } from '../config/index.js';
import { Invitation, CareCircleMember, PasscodeInvite } from '../types/index.js';
import {
  generatePasscode,
  hashPasscode,
  verifyPasscode,
  isPasscodeExpired,
  calculateExpiryDate,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  validatePasscodeFormat
} from '../services/passcodeService.js';

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

// GET /api/care-circle - get active members and pending invitations
router.get('/', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;
  const members = db.getCareCircleMembers(patientId);
  const invitations = db.getInvitationsForPatient(patientId);

  res.json({
    members,
    invitations: req.user?.patient_id === patientId || req.user?.role === 'admin' ? invitations.filter(i => i.status === 'pending').map(({ token_hash, ...details }) => details) : []
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
      invitation_code: rawToken.substring(0, 12).toUpperCase(), // short readable code
      invite_url: `${config.clientUrl}/care-circle?token=${rawToken}`
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

// --- Passcode-Based Care Circle Joining & Elder Approval Gates ---

// POST /api/care-circle/passcode - Generate expiring 6-character passcode
router.post('/passcode', async (req: Request, res: Response): Promise<void> => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'manage_profile')) return;

  const passcodeSchema = z.object({
    role: z.enum(['family', 'caregiver']).default('family'),
    relationship: z.string().min(1, 'Relationship is required (e.g. Son, Daughter, Visiting Nurse)').default('Family Member'),
    can_view: z.boolean().default(true),
    can_manage_meds: z.boolean().default(false),
    can_manage_appointments: z.boolean().default(true),
    can_add_notes: z.boolean().default(true),
    max_uses: z.number().int().min(1).max(20).default(5),
    expires_in_hours: z.number().int().min(24).max(168).default(48)
  });

  const parsed = passcodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    return;
  }

  const rawPasscode = generatePasscode(6);
  const passcodeHash = await hashPasscode(rawPasscode);
  const expiresAt = calculateExpiryDate(parsed.data.expires_in_hours);

  const invite: PasscodeInvite = {
    id: uuidv4(),
    patient_id: patientId,
    created_by: req.user!.id,
    passcode_hash: passcodeHash,
    passcode_prefix: rawPasscode.substring(0, 2),
    raw_passcode: rawPasscode,
    role: parsed.data.role,
    relationship: parsed.data.relationship,
    can_view: parsed.data.can_view,
    can_manage_meds: parsed.data.can_manage_meds,
    can_manage_appointments: parsed.data.can_manage_appointments,
    can_add_notes: parsed.data.can_add_notes,
    max_uses: parsed.data.max_uses,
    uses_count: 0,
    is_revoked: false,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  db.createPasscodeInvite(invite);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: patientId,
    action: 'CARE_CIRCLE_PASSCODE_GENERATED',
    resource_type: 'PASSCODE_INVITE',
    resource_id: invite.id,
    details: { prefix: invite.passcode_prefix, expires_at: expiresAt, max_uses: invite.max_uses }
  });

  res.status(201).json({
    message: 'Passcode generated successfully!',
    passcode: rawPasscode,
    invite: {
      ...invite,
      passcode_hash: undefined // never return hash
    }
  });
});

// GET /api/care-circle/passcodes - list active passcodes for patient
router.get('/passcodes', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const passcodes = db.getPasscodeInvitesForPatient(patientId);
  const sanitized = passcodes.map(p => ({
    ...p,
    passcode_hash: undefined,
    is_expired: isPasscodeExpired(p.expires_at)
  }));

  res.json({ passcodes: sanitized });
});

// POST /api/care-circle/join-passcode - Join circle using 6-character passcode
router.post('/join-passcode', async (req: Request, res: Response): Promise<void> => {
  const rateLimitId = req.user?.id || req.ip || 'anonymous';
  const rateCheck = checkRateLimit(rateLimitId);

  if (!rateCheck.allowed) {
    res.status(429).json({
      error: `Too many failed passcode attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
      retry_after_seconds: rateCheck.retryAfterSeconds
    });
    return;
  }

  const joinSchema = z.object({
    passcode: z.string().min(1, 'Passcode is required')
  });

  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid passcode format.' });
    return;
  }

  const rawInput = parsed.data.passcode.trim().toUpperCase();
  if (!validatePasscodeFormat(rawInput)) {
    recordFailedAttempt(rateLimitId);
    res.status(400).json({ error: 'Passcode format is invalid. Must be 6 to 8 alphanumeric characters.' });
    return;
  }

  const activeInvites = db.getAllActivePasscodeInvites();
  let matchedInvite: PasscodeInvite | null = null;

  for (const invite of activeInvites) {
    const isMatch = await verifyPasscode(rawInput, invite.passcode_hash);
    if (isMatch) {
      matchedInvite = invite;
      break;
    }
  }

  if (!matchedInvite) {
    const failedInfo = recordFailedAttempt(rateLimitId);
    if (failedInfo.locked) {
      res.status(429).json({
        error: `Too many failed attempts. You have been locked out for 15 minutes.`,
        retry_after_seconds: failedInfo.retryAfterSeconds
      });
      return;
    }
    res.status(400).json({ error: 'Invalid or unrecognized passcode. Please verify the code with the elder.' });
    return;
  }

  // Passcode matched! Reset rate limit
  resetRateLimit(rateLimitId);

  // Check expiration
  if (isPasscodeExpired(matchedInvite.expires_at)) {
    res.status(400).json({ error: 'This passcode has expired. Please request a new code from the elder.' });
    return;
  }

  // Check max uses
  if (matchedInvite.max_uses > 0 && matchedInvite.uses_count >= matchedInvite.max_uses) {
    res.status(400).json({ error: 'This passcode has reached its maximum allowable uses.' });
    return;
  }

  // Check if user is already a member
  const isAlreadyMember = db.isMemberOfPatientCareCircle(matchedInvite.patient_id, req.user!.id);
  if (isAlreadyMember) {
    res.status(400).json({ error: 'You are already an active member of this Care Circle.' });
    return;
  }

  // Increment usage count
  db.updatePasscodeInvite(matchedInvite.id, {
    uses_count: matchedInvite.uses_count + 1
  });

  // Create pending membership (Elder Approval Gate)
  const pendingMember: CareCircleMember = {
    id: uuidv4(),
    patient_id: matchedInvite.patient_id,
    member_user_id: req.user!.id,
    relationship: matchedInvite.relationship,
    can_view: matchedInvite.can_view,
    can_manage_meds: matchedInvite.can_manage_meds,
    can_manage_appointments: matchedInvite.can_manage_appointments,
    can_add_notes: matchedInvite.can_add_notes,
    status: 'pending', // Pending elder approval!
    permissions: {
      medications: true,
      appointments: true,
      wellbeing: true,
      care_notes: true
    },
    created_at: new Date().toISOString()
  };

  db.addCareCircleMember(pendingMember);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: matchedInvite.patient_id,
    action: 'CARE_CIRCLE_PASSCODE_JOIN_REQUEST',
    resource_type: 'CARE_CIRCLE_MEMBER',
    resource_id: pendingMember.id,
    details: { applicant_name: req.user?.full_name, role: matchedInvite.role }
  });

  res.status(201).json({
    message: 'Passcode verified successfully! Your request has been sent and is pending approval by the elder.',
    member: pendingMember,
    status: 'pending'
  });
});

// GET /api/care-circle/pending - get pending membership requests for elder
router.get('/pending', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'manage_profile')) return;

  const pendingMembers = db.getPendingCareCircleMembers(patientId);
  res.json({ pending: pendingMembers });
});

// PATCH /api/care-circle/members/:memberId/approve - Elder approves member
router.patch('/members/:memberId/approve', (req: Request, res: Response): void => {
  const memberId = req.params.memberId;
  const targetMember = db.getCareCircleMemberById(memberId);

  if (!targetMember) {
    res.status(404).json({ error: 'Member request not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, targetMember.patient_id, 'manage_profile')) return;

  const approveSchema = z.object({
    can_manage_meds: z.boolean().optional(),
    can_manage_appointments: z.boolean().optional(),
    can_add_notes: z.boolean().optional(),
    relationship: z.string().optional()
  });

  const parsed = approveSchema.safeParse(req.body);
  const updates: Partial<CareCircleMember> = {
    status: 'active',
    ...(parsed.success ? parsed.data : {})
  };

  const updated = db.updateCareCircleMember(memberId, updates);

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: targetMember.patient_id,
    action: 'CARE_CIRCLE_MEMBER_APPROVED',
    resource_type: 'CARE_CIRCLE_MEMBER',
    resource_id: memberId,
    details: { approved_by: req.user?.full_name }
  });

  res.json({
    message: 'Member successfully approved into your Care Circle!',
    member: updated
  });
});

// PATCH /api/care-circle/members/:memberId/reject - Elder rejects pending request
router.patch('/members/:memberId/reject', (req: Request, res: Response): void => {
  const memberId = req.params.memberId;
  const targetMember = db.getCareCircleMemberById(memberId);

  if (!targetMember) {
    res.status(404).json({ error: 'Member request not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, targetMember.patient_id, 'manage_profile')) return;

  const updated = db.updateCareCircleMember(memberId, { status: 'revoked' });

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: targetMember.patient_id,
    action: 'CARE_CIRCLE_MEMBER_REJECTED',
    resource_type: 'CARE_CIRCLE_MEMBER',
    resource_id: memberId
  });

  res.json({ message: 'Request denied.' });
});

// PATCH /api/care-circle/members/:memberId/elder-permissions - Elder granular privacy matrix
router.patch('/members/:memberId/elder-permissions', (req: Request, res: Response): void => {
  const memberId = req.params.memberId;
  const targetMember = db.getCareCircleMemberById(memberId);

  if (!targetMember) {
    res.status(404).json({ error: 'Member not found.' });
    return;
  }

  if (!verifyPatientAccess(req, res, targetMember.patient_id, 'manage_profile')) return;

  const permSchema = z.object({
    medications: z.boolean().optional(),
    appointments: z.boolean().optional(),
    wellbeing: z.boolean().optional(),
    care_notes: z.boolean().optional()
  });

  const parsed = permSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid permissions payload.', details: parsed.error.format() });
    return;
  }

  const existingPermissions = targetMember.permissions || {
    medications: true,
    appointments: true,
    wellbeing: true,
    care_notes: true
  };

  const newPermissions = {
    ...existingPermissions,
    ...parsed.data
  };

  const updated = db.updateCareCircleMember(memberId, {
    permissions: newPermissions
  });

  db.logAudit({
    actor_id: req.user?.id,
    patient_id: targetMember.patient_id,
    action: 'ELDER_PRIVACY_PERMISSIONS_UPDATED',
    resource_type: 'CARE_CIRCLE_MEMBER',
    resource_id: memberId,
    details: newPermissions
  });

  res.json({
    message: 'Privacy permissions updated.',
    permissions: newPermissions,
    member: updated
  });
});

export default router;
