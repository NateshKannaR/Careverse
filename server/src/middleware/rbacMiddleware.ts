import { Request, Response, NextFunction } from 'express';
import { db } from '../db/storageAdapter.js';
import { UserRole } from '../types/index.js';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized for this operation. Required: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};

export type PatientPermission = 'view' | 'manage_meds' | 'manage_appointments' | 'add_notes' | 'manage_profile';

export const checkPatientAccess = (
  user: any,
  patientId: string,
  requiredPermission: PatientPermission = 'view'
): { allowed: boolean; reason?: string } => {
  if (!user) {
    return { allowed: false, reason: 'Authentication required.' };
  }

  // Administrators have operational platform access
  if (user.role === 'admin') {
    return { allowed: true };
  }

  // Elderly users can strictly only access their own patient profile
  if (user.role === 'elderly') {
    if (user.patient_id && user.patient_id === patientId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Access denied. You can only access your own patient profile.' };
  }

  // Family and Caregiver users must have an active Care Circle membership
  const member = db.getCareCircleMember(patientId, user.id);
  if (!member || member.status !== 'active') {
    return {
      allowed: false,
      reason: 'Access denied. You are not an active member of this patient’s Care Circle.'
    };
  }

  if (requiredPermission === 'view') {
    return member.can_view
      ? { allowed: true }
      : { allowed: false, reason: 'Access denied. You do not have view permissions for this patient.' };
  }

  if (requiredPermission === 'manage_meds') {
    return member.can_manage_meds
      ? { allowed: true }
      : { allowed: false, reason: 'Access denied. You do not have permission to manage medications for this patient.' };
  }

  if (requiredPermission === 'manage_appointments') {
    return member.can_manage_appointments
      ? { allowed: true }
      : { allowed: false, reason: 'Access denied. You do not have permission to manage appointments for this patient.' };
  }

  if (requiredPermission === 'add_notes') {
    return member.can_add_notes
      ? { allowed: true }
      : { allowed: false, reason: 'Access denied. You do not have permission to add care notes for this patient.' };
  }

  if (requiredPermission === 'manage_profile') {
    // Only primary caregiver or designated coordinator can update medical profile details
    const isPrimary = member.relationship?.toLowerCase().includes('primary') || member.can_manage_meds;
    return isPrimary
      ? { allowed: true }
      : { allowed: false, reason: 'Access denied. Only primary caregivers can edit patient health profiles.' };
  }

  return { allowed: false, reason: 'Access denied.' };
};

export const verifyPatientAccess = (
  req: Request,
  res: Response,
  targetPatientId: string,
  requiredPermission: PatientPermission = 'view'
): boolean => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return false;
  }

  if (!targetPatientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return false;
  }

  const result = checkPatientAccess(req.user, targetPatientId, requiredPermission);
  if (!result.allowed) {
    res.status(403).json({ error: result.reason || 'Access denied.' });
    return false;
  }

  return true;
};

export const authorizePatientAccess = (
  requiredPermission: PatientPermission = 'view'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Administrators have operational platform access
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Extract patientId from params, query, or body
    let patientId = req.params.patientId || req.params.id || (req.query.patientId as string) || req.body.patient_id;

    if (!patientId && req.user.role === 'elderly' && req.user.patient_id) {
      patientId = req.user.patient_id;
      req.params.patientId = patientId;
    }

    if (!patientId) {
      res.status(400).json({ error: 'Patient ID is required for this operation.' });
      return;
    }

    const check = checkPatientAccess(req.user, patientId, requiredPermission);
    if (!check.allowed) {
      res.status(403).json({ error: check.reason });
      return;
    }

    next();
  };
};

