import { Router, Request, Response } from 'express';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { CareScoreService } from '../services/careScoreService.js';
import { generateAdherenceInsight, generateAdherenceTrend } from '../services/adherencePatternService.js';

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

function getPatientTimeZone(patientId: string): string {
  const patient = db.getPatientProfileById(patientId);
  return (patient && db.getProfileById(patient.user_id)?.timezone) || 'UTC';
}

// GET /api/analytics/daily-score
router.get('/daily-score', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const dateStr = req.query.date as string;
  const score = CareScoreService.calculateDailyCareScore(patientId, dateStr);
  res.json({ score });
});

// GET /api/analytics/adherence-patterns - slot-based habitual pattern detection & lifestyle advice
router.get('/adherence-patterns', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const medications = db.getMedications(patientId, true);
  const records = db.getAdministrationRecords(patientId);
  const insight = generateAdherenceInsight(medications, records, new Date(), getPatientTimeZone(patientId));

  res.json({ insight });
});

// GET /api/analytics/adherence - 7, 14, or 30 days adherence trends based on real administration records
router.get('/adherence', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;

  const days = Number(req.query.days ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    res.status(400).json({ error: 'Days must be an integer from 1 through 30.' });
    return;
  }

  const medications = db.getMedications(patientId);
  const records = db.getAdministrationRecords(patientId);
  res.json(generateAdherenceTrend(medications, records, days, new Date(), getPatientTimeZone(patientId)));
});

// GET /api/analytics/export-csv - downloads real healthcare administration report in CSV format
router.get('/export-csv', (req: Request, res: Response): void => {
  const patientId = resolvePatientId(req);
  if (!patientId) {
    res.status(400).json({ error: 'Patient ID is required.' });
    return;
  }

  if (!verifyPatientAccess(req, res, patientId, 'view')) return;


  const patient = db.getPatientProfileById(patientId);
  const user = patient ? db.getProfileById(patient.user_id) : undefined;
  const records = db.getAdministrationRecords(patientId);

  const csvRows: string[] = [];
  csvRows.push('Record ID,Patient Name,Medication,Category,Dosage,Scheduled Time,Actual Time,Status,Recorded By,Notes');

  records.forEach(r => {
    const med = r.medication;
    const recordedBy = r.recorded_by_user ? r.recorded_by_user.full_name : 'Patient';
    csvRows.push(
      [
        `"${r.id}"`,
        `"${user?.full_name || 'Patient'}"`,
        `"${med?.name || 'Medication'}"`,
        `"${med?.category || ''}"`,
        `"${med?.dosage || ''}"`,
        `"${r.scheduled_time}"`,
        `"${r.actual_time || 'N/A'}"`,
        `"${r.status}"`,
        `"${recordedBy}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ].join(',')
    );
  });

  const csvContent = csvRows.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="careverse-report-${patientId.substring(0, 8)}.csv"`);
  res.status(200).send(csvContent);
});

export default router;
