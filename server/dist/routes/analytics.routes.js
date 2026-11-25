import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/storageAdapter.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { verifyPatientAccess } from '../middleware/rbacMiddleware.js';
import { CareScoreService } from '../services/careScoreService.js';
import { generateAdherenceInsight, generateAdherenceTrend } from '../services/adherencePatternService.js';
const router = Router();
router.use(authenticateJwt);
const resolvePatientId = (req) => {
    const qPatient = (req.query.patientId || req.query.patient_id);
    if (qPatient)
        return qPatient;
    if (req.body?.patient_id)
        return req.body.patient_id;
    if (req.body?.patientId)
        return req.body.patientId;
    if (req.user?.role === 'elderly' && req.user.patient_id)
        return req.user.patient_id;
    if (req.user) {
        const memberships = db.getCareCircleMembershipsForUser(req.user.id);
        if (memberships.length > 0)
            return memberships[0].patient_id;
    }
    return '';
};
// GET /api/analytics/daily-score
router.get('/daily-score', (req, res) => {
    const patientId = resolvePatientId(req);
    if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required.' });
        return;
    }
    if (!verifyPatientAccess(req, res, patientId, 'view'))
        return;
    const date = z.string().date().optional().safeParse(req.query.date);
    if (!date.success) {
        res.status(400).json({ error: 'Date must be a valid YYYY-MM-DD value.' });
        return;
    }
    const score = CareScoreService.calculateDailyCareScore(patientId, date.data);
    res.json({ score });
});
// GET /api/analytics/adherence-patterns - slot-based habitual pattern detection & lifestyle advice
router.get('/adherence-patterns', (req, res) => {
    const patientId = resolvePatientId(req);
    if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required.' });
        return;
    }
    if (!verifyPatientAccess(req, res, patientId, 'view'))
        return;
    const medications = db.getMedications(patientId, true);
    const records = db.getAdministrationRecords(patientId);
    const insight = generateAdherenceInsight(medications, records, new Date(), db.getPatientTimeZone(patientId));
    res.json({ insight });
});
// GET /api/analytics/adherence - 7, 14, or 30 days adherence trends based on real administration records
router.get('/adherence', (req, res) => {
    const patientId = resolvePatientId(req);
    if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required.' });
        return;
    }
    if (!verifyPatientAccess(req, res, patientId, 'view'))
        return;
    const days = Number(req.query.days ?? 7);
    if (!Number.isInteger(days) || days < 1 || days > 30) {
        res.status(400).json({ error: 'Days must be an integer from 1 through 30.' });
        return;
    }
    const medications = db.getMedications(patientId);
    const records = db.getAdministrationRecords(patientId);
    res.json(generateAdherenceTrend(medications, records, days, new Date(), db.getPatientTimeZone(patientId)));
});
function csvCell(value = '') {
    const text = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
    return '"' + text.replace(/"/g, '""') + '"';
}
// GET /api/analytics/export-csv - downloads real healthcare administration report in CSV format
router.get('/export-csv', (req, res) => {
    const patientId = resolvePatientId(req);
    if (!patientId) {
        res.status(400).json({ error: 'Patient ID is required.' });
        return;
    }
    if (!verifyPatientAccess(req, res, patientId, 'view'))
        return;
    const patient = db.getPatientProfileById(patientId);
    const user = patient ? db.getProfileById(patient.user_id) : undefined;
    const records = db.getAdministrationRecords(patientId);
    const csvRows = ['Record ID,Patient Name,Medication,Category,Dosage,Scheduled Time,Actual Time,Status,Recorded By,Notes'];
    for (const record of records) {
        const med = record.medication;
        const cells = [
            record.id, user?.full_name || 'Patient', med?.name || 'Medication', med?.category,
            med?.dosage, record.scheduled_time, record.actual_time, record.status,
            record.recorded_by_user?.full_name, record.notes,
        ];
        csvRows.push(cells.map(csvCell).join(','));
    }
    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `attachment; filename="careverse-report-${patientId.substring(0, 8)}.csv"`);
    res.status(200).send(csvContent);
});
export default router;
