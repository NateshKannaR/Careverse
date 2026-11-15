import { Router, Request, Response } from 'express';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { CareScoreService } from '../services/careScoreService.js';
import { generateAdherenceInsight } from '../services/adherencePatternService.js';

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
  const insight = generateAdherenceInsight(medications, records);

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

  const days = parseInt((req.query.days as string) || '7', 10);
  const now = new Date();
  const dayStats: Array<{
    date: string;
    dayName: string;
    scheduled: number;
    taken: number;
    missed: number;
    skipped: number;
    adherenceRate: number;
  }> = [];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const startIso = `${dateStr}T00:00:00.000Z`;
    const endIso = `${dateStr}T23:59:59.999Z`;

    const records = db.getAdministrationRecords(patientId, startIso, endIso);
    const taken = records.filter(r => r.status === 'taken').length;
    const missed = records.filter(r => r.status === 'missed').length;
    const skipped = records.filter(r => r.status === 'skipped').length;
    const scheduled = records.length;

    // For today, calculate adherence only on doses that have become due so far
    const isToday = i === 0;
    let rate = 100;
    if (isToday) {
      const dueSoFar = taken + missed + skipped;
      rate = dueSoFar > 0 ? Math.round((taken / dueSoFar) * 100) : 100;
    } else {
      const pastDue = taken + missed + skipped;
      rate = pastDue > 0 ? Math.round((taken / pastDue) * 100) : (scheduled > 0 ? 0 : 100);
    }

    dayStats.push({
      date: dateStr,
      dayName: dayNames[d.getDay()],
      scheduled,
      taken,
      missed,
      skipped,
      adherenceRate: rate
    });
  }

  // Calculate totals
  const totalScheduled = dayStats.reduce((acc, curr) => acc + curr.scheduled, 0);
  const totalTaken = dayStats.reduce((acc, curr) => acc + curr.taken, 0);
  const totalMissed = dayStats.reduce((acc, curr) => acc + curr.missed, 0);
  const totalDue = totalTaken + totalMissed;
  const averageAdherence = totalDue > 0 ? Math.round((totalTaken / totalDue) * 100) : 100;

  // Breakdown by category
  const medications = db.getMedications(patientId);
  const categoryMap: Record<string, { total: number; taken: number }> = {};
  medications.forEach(m => {
    if (!categoryMap[m.category]) {
      categoryMap[m.category] = { total: 0, taken: 0 };
    }
  });

  const allRecords = db.getAdministrationRecords(patientId);
  allRecords.forEach(r => {
    const med = medications.find(m => m.id === r.medication_id);
    if (med && categoryMap[med.category]) {
      categoryMap[med.category].total += 1;
      if (r.status === 'taken') {
        categoryMap[med.category].taken += 1;
      }
    }
  });

  const categoryAdherence = Object.keys(categoryMap).map(category => ({
    category,
    total: categoryMap[category].total,
    taken: categoryMap[category].taken,
    rate: categoryMap[category].total > 0 ? Math.round((categoryMap[category].taken / categoryMap[category].total) * 100) : 100
  }));

  res.json({
    timeRangeDays: days,
    averageAdherence,
    totalScheduled,
    totalTaken,
    totalMissed,
    dailyTrends: dayStats,
    categoryBreakdown: categoryAdherence
  });
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
