import { db } from '../db/storageAdapter.js';
import { getDailyDoseEvidence } from './adherencePatternService.js';
export class CareScoreService {
    static calculateDailyCareScore(patientId, date, now = new Date()) {
        const evidence = getDailyDoseEvidence(db.getAdministrationRecords(patientId), now, db.getPatientTimeZone(patientId), date);
        const checkin = db.getWellbeingCheckinForDate(patientId, evidence.date);
        const appointments = db.getAppointments(patientId).filter(a => a.appointment_date === evidence.date && a.status === 'scheduled');
        const completedItems = evidence.taken + Number(Boolean(checkin));
        const routineItems = evidence.due + 1;
        const score = evidence.recorded > 0 || checkin ? Math.round(completedItems / routineItems * 100) : null;
        let rating = 'In Progress';
        if (evidence.missed + evidence.skipped > 0)
            rating = 'Needs Attention';
        else if (evidence.pending === 0 && score === 100)
            rating = 'Excellent';
        else if (evidence.pending === 0 && score !== null && score >= 70)
            rating = 'Good';
        return {
            date: evidence.date,
            timeZone: evidence.timeZone,
            score,
            rating,
            disclaimer: 'The Daily Care Score is a routine completion indicator based on recorded care activities. It is not a clinical health diagnostic evaluation.',
            metrics: {
                scheduledDoses: evidence.records.length,
                completedDoses: evidence.taken,
                pendingDoses: evidence.pending,
                missedDoses: evidence.missed,
                skippedDoses: evidence.skipped,
                dueDoses: evidence.due,
                upcomingDoses: evidence.upcoming,
                recordedDoses: evidence.recorded,
                completedItems,
                routineItems,
                doseAdherencePercentage: evidence.rate,
                wellbeingCheckinRecorded: Boolean(checkin),
                upcomingAppointmentsCount: appointments.length,
            },
        };
    }
}
