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

export const authorizePatientAccess = (
  requiredPermission: 'view' | 'manage_meds' | 'manage_appointments' | 'add_notes' = 'view'
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
    const patientId = req.params.patientId || req.params.id || (req.query.patientId as string) || req.body.patient_id;

    if (!patientId) {
      // If user is elderly and no patientId specified, default to their own patient profile
      if (req.user.role === 'elderly' && req.user.patient_id) {
        req.params.patientId = req.user.patient_id;
        next();
        return;
      }
      res.status(400).json({ error: 'Patient ID is required for this operation.' });
      return;
    }

    // If elderly user, verify they own this patient profile
    if (req.user.role === 'elderly') {
      if (req.user.patient_id === patientId) {
        next();
        return;
      }
      res.status(403).json({ error: 'Access denied. You can only access your own patient profile.' });
      return;
    }

    // If family or caregiver, verify Care Circle membership and specific permission
    const member = db.getCareCircleMember(patientId, req.user.id);
    if (!member) {
      res.status(403).json({
        error: 'Access denied. You are not an active member of this patient’s Care Circle.'
      });
      return;
    }

    if (requiredPermission === 'view' && !member.can_view) {
      res.status(403).json({ error: 'Access denied. You do not have view permissions for this profile.' });
      return;
    }

    if (requiredPermission === 'manage_meds' && !member.can_manage_meds) {
      res.status(403).json({ error: 'Access denied. You do not have permission to manage medications for this patient.' });
      return;
    }

    if (requiredPermission === 'manage_appointments' && !member.can_manage_appointments) {
      res.status(403).json({ error: 'Access denied. You do not have permission to manage appointments for this patient.' });
      return;
    }

    if (requiredPermission === 'add_notes' && !member.can_add_notes) {
      res.status(403).json({ error: 'Access denied. You do not have permission to add care notes for this patient.' });
      return;
    }

    next();
  };
};
