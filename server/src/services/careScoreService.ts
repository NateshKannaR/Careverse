import { visitSchedule } from './patientSchedule.js';
import { db } from '../db/storageAdapter.js';
import { getDailyDoseEvidence } from './adherencePatternService.js';

export interface DailyCareScoreBreakdown {
  date: string;
  timeZone: string;
  score: number | null;
  rating: 'Excellent' | 'Good' | 'Needs Attention' | 'In Progress';
  disclaimer: string;
  metrics: {
    scheduledDoses: number;
    completedDoses: number;
    pendingDoses: number;
    missedDoses: number;
    skippedDoses: number;
    dueDoses: number;
    upcomingDoses: number;
    recordedDoses: number;
    completedItems: number;
    routineItems: number;
    doseAdherencePercentage: number | null;
    wellbeingCheckinRecorded: boolean;
    upcomingAppointmentsCount: number;
  };
}

export class CareScoreService {
  public static calculateDailyCareScore(patientId: string, date?: string, now = new Date()): DailyCareScoreBreakdown {
    const evidence = getDailyDoseEvidence(db.getAdministrationRecords(patientId), now, db.getPatientTimeZone(patientId), date);
    const checkin = db.getWellbeingCheckinForDate(patientId, evidence.date);
    const appointments = visitSchedule(db.getAppointments(patientId), evidence.timeZone, now).filter(a => a.appointment_date === evidence.date && a.is_upcoming);

    const completedItems = evidence.taken + Number(Boolean(checkin));
    const routineItems = evidence.due + 1;
    const score = evidence.recorded > 0 || checkin ? Math.round(completedItems / routineItems * 100) : null;

    let rating: DailyCareScoreBreakdown['rating'] = 'In Progress';
    if (evidence.missed + evidence.skipped > 0) rating = 'Needs Attention';
    else if (evidence.pending === 0 && score === 100) rating = 'Excellent';
    else if (evidence.pending === 0 && score !== null && score >= 70) rating = 'Good';

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
