import { db } from '../db/storageAdapter.js';
export class CareScoreService {
    /**
     * Computes transparent routine completion score based on actual recorded events.
     * NOTE: Strictly labeled as a routine completion indicator, NOT a medical clinical diagnosis.
     */
    static calculateDailyCareScore(patientId, dateStr) {
        const targetDate = dateStr || new Date().toISOString().split('T')[0];
        const startIso = `${targetDate}T00:00:00.000Z`;
        const endIso = `${targetDate}T23:59:59.999Z`;
        const records = db.getAdministrationRecords(patientId, startIso, endIso);
        const checkin = db.getWellbeingCheckins(patientId).find(c => c.checkin_date === targetDate);
        const appointments = db.getAppointments(patientId).filter(a => a.appointment_date === targetDate);
        const scheduledDoses = records.length;
        const completedDoses = records.filter(r => r.status === 'taken').length;
        const missedDoses = records.filter(r => r.status === 'missed').length;
        const pendingDoses = records.filter(r => r.status === 'upcoming' || r.status === 'due_now').length;
        // Doses that have become due so far today:
        const dosesDueSoFar = completedDoses + missedDoses;
        let doseScore = 0;
        let doseAdherencePercentage = 100;
        if (dosesDueSoFar > 0) {
            doseAdherencePercentage = Math.round((completedDoses / dosesDueSoFar) * 100);
            doseScore = (completedDoses / dosesDueSoFar) * 70; // 70% weight
        }
        else if (scheduledDoses > 0) {
            // Doses are scheduled for today, but none due yet (all on track)
            doseAdherencePercentage = 100;
            doseScore = 70;
        }
        else {
            // No medications scheduled today
            doseScore = 70;
            doseAdherencePercentage = 100;
        }
        // Wellbeing checkin contributes 30% weight
        const wellbeingScore = checkin ? 30 : 0;
        const totalScore = Math.min(100, Math.round(doseScore + wellbeingScore));
        let rating = 'In Progress';
        if (missedDoses > 0) {
            rating = 'Needs Attention';
        }
        else if (totalScore >= 90) {
            rating = 'Excellent';
        }
        else if (totalScore >= 70) {
            rating = 'Good';
        }
        else if (pendingDoses === 0 && totalScore < 70) {
            rating = 'Needs Attention';
        }
        return {
            date: targetDate,
            score: totalScore,
            rating,
            disclaimer: 'The Daily Care Score is a routine completion indicator based on recorded care activities. It is not a clinical health diagnostic evaluation.',
            metrics: {
                scheduledDoses,
                completedDoses,
                pendingDoses,
                missedDoses,
                doseAdherencePercentage,
                wellbeingCheckinRecorded: !!checkin,
                upcomingAppointmentsCount: appointments.length
            }
        };
    }
}
