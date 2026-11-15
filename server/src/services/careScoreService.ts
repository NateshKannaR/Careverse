import { db } from '../db/storageAdapter.js';

export interface DailyCareScoreBreakdown {
  date: string;
  score: number; // 0 to 100
  rating: 'Excellent' | 'Good' | 'Needs Attention' | 'In Progress';
  disclaimer: string;
  metrics: {
    scheduledDoses: number;
    completedDoses: number;
    pendingDoses: number;
    missedDoses: number;
    doseAdherencePercentage: number;
    wellbeingCheckinRecorded: boolean;
    upcomingAppointmentsCount: number;
  };
}

export class CareScoreService {
  /**
   * Computes transparent routine completion score based on actual recorded events.
   * NOTE: Strictly labeled as a routine completion indicator, NOT a medical clinical diagnosis.
   */
  public static calculateDailyCareScore(patientId: string, dateStr?: string): DailyCareScoreBreakdown {
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

    let doseScore = 0;
    let doseAdherencePercentage = 0;
    if (scheduledDoses > 0) {
      doseAdherencePercentage = Math.round((completedDoses / scheduledDoses) * 100);
      doseScore = (completedDoses / scheduledDoses) * 70; // 70% weight
    } else {
      doseScore = 70; // No medications scheduled today
      doseAdherencePercentage = 100;
    }

    // Wellbeing checkin contributes 30% weight
    const wellbeingScore = checkin ? 30 : 0;

    const totalScore = Math.min(100, Math.round(doseScore + wellbeingScore));

    let rating: DailyCareScoreBreakdown['rating'] = 'In Progress';
    if (totalScore >= 90) rating = 'Excellent';
    else if (totalScore >= 70) rating = 'Good';
    else if (missedDoses > 0 || (pendingDoses === 0 && totalScore < 70)) rating = 'Needs Attention';

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
