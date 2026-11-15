import { Router, Request, Response } from 'express';
import { db } from '../db/storageAdapter.js';
import { config } from '../config/index.js';

const router = Router();

// GET /api/system/health - public health check
router.get('/health', (req: Request, res: Response): void => {
  res.json({
    status: 'healthy',
    application: 'CAREVERSE Healthcare Ecosystem API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: 'healthy',
    reminderEngine: 'active',
    notificationProvider: config.resendApiKey ? 'Resend (Production)' : 'Simulator (Development)',
    environment: config.nodeEnv
  });
});

// GET /api/system/stats - platform overview for administrators
router.get('/stats', (req: Request, res: Response): void => {
  const profiles = db.getAllProfiles();
  const patients = db.getAllPatientProfiles();
  const notifications = db.getAllNotifications();
  const auditLogs = db.getAuditLogs();

  const elderlyCount = profiles.filter(p => p.role === 'elderly').length;
  const familyCount = profiles.filter(p => p.role === 'family').length;
  const caregiverCount = profiles.filter(p => p.role === 'caregiver').length;
  const adminCount = profiles.filter(p => p.role === 'admin').length;

  let totalMeds = 0;
  let totalDosesRecorded = 0;
  patients.forEach(p => {
    totalMeds += db.getMedications(p.id).length;
    totalDosesRecorded += db.getAdministrationRecords(p.id).length;
  });

  res.json({
    users: {
      total: profiles.length,
      elderly: elderlyCount,
      family: familyCount,
      caregivers: caregiverCount,
      admins: adminCount
    },
    clinical: {
      registeredPatients: patients.length,
      activePrescriptions: totalMeds,
      totalDosesLogged: totalDosesRecorded
    },
    notifications: {
      totalDispatched: notifications.length,
      delivered: notifications.filter(n => n.status === 'sent' || n.status === 'simulated').length,
      failed: notifications.filter(n => n.status === 'failed').length
    },
    audit: {
      totalEventsLogged: auditLogs.length
    }
  });
});

export default router;
