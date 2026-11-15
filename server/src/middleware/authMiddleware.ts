import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { db } from '../db/storageAdapter.js';
import { AuthenticatedUser } from '../types/index.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateJwt = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No Bearer token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; role: string };
    const profile = db.getProfileById(decoded.id);

    if (!profile) {
      res.status(401).json({ error: 'User profile not found or invalidated.' });
      return;
    }

    let patientId: string | undefined;
    if (profile.role === 'elderly') {
      const patient = db.getPatientProfileByUserId(profile.id);
      patientId = patient?.id;
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      full_name: profile.full_name,
      patient_id: patientId
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};
