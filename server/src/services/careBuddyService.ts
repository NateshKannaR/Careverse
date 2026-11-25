import { db } from '../db/storageAdapter.js';
import { CareScoreService, type DailyCareScoreBreakdown } from './careScoreService.js';

export interface CareBuddyResponse {
  reply: string;
  suggestedFollowUps: string[];
  contextUsed: {
    patientName: string;
    activeMedsCount: number;
    completedDosesToday: number;
    pendingDosesToday: number;
    upcomingAppointmentsCount: number;
  };
  disclaimer: string;
  source: 'contextual-assistant' | 'external-ai';
}

const MEDICAL_DISCLAIMER =
  'IMPORTANT MEDICAL DISCLAIMER: CareBuddy is an AI routine support assistant and does NOT provide medical advice, diagnosis, dosage adjustments, or emergency triage. Always consult your doctor, pharmacist, or dial emergency services (911 / 112) for clinical concerns.';

function doseSummary(metrics: DailyCareScoreBreakdown['metrics']): string {
  return `${metrics.completedDoses} taken, ${metrics.missedDoses} missed, ${metrics.skippedDoses} skipped, ${metrics.pendingDoses} awaiting a record, ${metrics.upcomingDoses} upcoming`;
}

function scoreSummary(careScore: DailyCareScoreBreakdown): string {
  return careScore.score === null
    ? 'No activity recorded yet'
    : `${careScore.score}% (${careScore.metrics.completedItems} of ${careScore.metrics.routineItems} routine items completed)`;
}

function upcomingAppointments(patientId: string, score: DailyCareScoreBreakdown, now: Date) {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: score.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(now);
  return db.getAppointments(patientId).filter(appointment => appointment.status === 'scheduled' && (
    appointment.appointment_date > score.date
    || (appointment.appointment_date === score.date && appointment.appointment_time >= time)
  )).sort((a, b) => `${a.appointment_date}T${a.appointment_time}`.localeCompare(`${b.appointment_date}T${b.appointment_time}`));
}

export class CareBuddyService {
  /**
   * Generates intelligent, contextual response using the patient's authenticated medical records.
   */
  public static async askCareBuddy(patientId: string, userMessage: string): Promise<CareBuddyResponse> {
    const patient = db.getPatientProfileById(patientId);
    const patientUser = patient ? db.getProfileById(patient.user_id) : undefined;
    const patientName = patientUser?.full_name || 'Patient';

    const meds = db.getMedications(patientId, true);
    const now = new Date();
    const careScore = CareScoreService.calculateDailyCareScore(patientId, undefined, now);
    const appointments = upcomingAppointments(patientId, careScore, now);
    const checkin = db.getWellbeingCheckinForDate(patientId, careScore.date);

    const contextUsed = {
      patientName,
      activeMedsCount: meds.length,
      completedDosesToday: careScore.metrics.completedDoses,
      pendingDosesToday: careScore.metrics.pendingDoses,
      upcomingAppointmentsCount: appointments.length
    };

    const query = userMessage.toLowerCase().trim();

    if (/\b(?:double|forgot|make up)\b|\b(?:can|could|should)\s+i\b[^?]*\b(?:take|skip|repeat)\b|\bi\s+missed\b/.test(query)) {
      return {
        reply: 'Contact your prescribing clinic or local pharmacist for instructions specific to the medication. They can tell you whether a late dose is appropriate. Share the medication name, scheduled time, and what you have already taken.',
        suggestedFollowUps: ['Show my medication schedule', 'Summarize my day'],
        contextUsed,
        disclaimer: MEDICAL_DISCLAIMER,
        source: 'contextual-assistant'
      };
    }

    // Contextual responses based on patient's real data
    if (
      query.includes('summar') ||
      query.includes('today') ||
      query.includes('how am i doing') ||
      query.includes('routine') ||
      query.includes('progress')
    ) {
      const summaryText = [
        `Good day, ${patientName}! Here is your current daily care overview:`,
        `- **Medications:** ${doseSummary(careScore.metrics)}.`,
        checkin
          ? `- **Wellbeing Check-in:** Recorded (Mood: *${checkin.mood}*, Energy: *${checkin.energy_level}/5*).`
          : `- **Wellbeing Check-in:** You have not recorded your daily check-in yet. Would you like to do that now?`,
        appointments.length > 0
          ? `- **Next Appointment:** With **${appointments[0].doctor_name}** (${appointments[0].specialty}) on **${appointments[0].appointment_date} at ${appointments[0].appointment_time}**.`
          : `- **Appointments:** No upcoming appointments are recorded.`,
        `- **Daily Routine Care Score:** ${scoreSummary(careScore)}.`
      ]
        .filter(Boolean)
        .join('\n');

      return {
        reply: summaryText,
        suggestedFollowUps: [
          'What pills do I have left today?',
          'What should I ask my doctor?',
          'Explain my medications'
        ],
        contextUsed,
        disclaimer: MEDICAL_DISCLAIMER,
        source: 'contextual-assistant'
      };
    }

    if (query.includes('pill') || query.includes('medication') || query.includes('dose') || query.includes('schedule')) {
      const medList = meds.map(m => `• **${m.name}** (${m.dosage}, ${m.strength || ''}): Scheduled at ${m.times_of_day.join(', ')}. ${m.instructions || ''}`).join('\n');
      const reply = [
        `Here are the active medications prescribed for ${patientName}:`,
        medList || 'No active medications currently recorded.',
        `\n**Today's status:** ${doseSummary(careScore.metrics)}.`
      ].join('\n');

      return {
        reply,
        suggestedFollowUps: [
          'Summarize today\'s schedule',
          'What should I ask Dr. Mehta?',
          'What happens if I miss a dose?'
        ],
        contextUsed,
        disclaimer: MEDICAL_DISCLAIMER,
        source: 'contextual-assistant'
      };
    }

    if (query.includes('doctor') || query.includes('appointment') || query.includes('question') || query.includes('ask')) {
      if (appointments.length === 0) {
        return {
          reply: `You currently have no upcoming appointments scheduled in CAREVERSE. If you schedule a visit, I can help you prepare questions for your doctor!`,
          suggestedFollowUps: ['Summarize my routine', 'View active medications'],
          contextUsed,
          disclaimer: MEDICAL_DISCLAIMER,
          source: 'contextual-assistant'
        };
      }

      const nextAppt = appointments[0];
      const reply = [
        `You have an upcoming appointment with **${nextAppt.doctor_name}** (${nextAppt.specialty}) on **${nextAppt.appointment_date} at ${nextAppt.appointment_time}** at *${nextAppt.hospital_clinic}*.`,
        `\n**Suggested Questions to Ask ${nextAppt.doctor_name}:**`,
        `1. *"How have my blood pressure/vital readings been trending over the last month?"*`,
        `2. *"Are my current medication dosages (${meds.map(m => m.name).slice(0, 3).join(', ')}) still the most suitable for me?"*`,
        `3. *"Are there any new symptoms or interactions I should be watching out for?"*`,
        `4. *"Do I need any routine lab tests (such as kidney function or HbA1c) prior to our next follow-up?"*`,
        `\n**Pre-visit checklist:**`,
        nextAppt.preparation_checklist.map(t => `- [${t.completed ? 'x' : ' '}] ${t.task}`).join('\n') || '- Bring your current medication list.'
      ].join('\n');

      return {
        reply,
        suggestedFollowUps: [
          'What pills do I have left today?',
          'How is my daily care score calculated?'
        ],
        contextUsed,
        disclaimer: MEDICAL_DISCLAIMER,
        source: 'contextual-assistant'
      };
    }


    // Terminology explanation helper
    if (query.includes('explain') || query.includes('what is') || query.includes('meaning')) {
      let termReply = '';
      if (query.includes('lisinopril') || query.includes('ace inhibitor')) {
        termReply = '**Lisinopril** is an ACE inhibitor commonly prescribed to relax blood vessels, lowering blood pressure and reducing strain on the heart.';
      } else if (query.includes('metformin')) {
        termReply = '**Metformin** is an oral medication for type 2 diabetes that helps control blood sugar levels by improving how your body handles insulin.';
      } else if (query.includes('atorvastatin') || query.includes('statin')) {
        termReply = '**Atorvastatin** is a cholesterol-lowering medication (a statin) that helps prevent plaque buildup inside arteries.';
      } else if (query.includes('hba1c')) {
        termReply = '**HbA1c** is a simple blood test that measures your average blood sugar levels over the past 2 to 3 months.';
      } else {
        termReply = `I am ready to help explain common healthcare terms related to your conditions: ${patient?.primary_condition || 'general wellness'}. Ask me about your medications (like Lisinopril or Metformin) or test terms like HbA1c or blood pressure.`;
      }

      return {
        reply: termReply,
        suggestedFollowUps: [
          'What pills do I have left today?',
          'Suggest questions for my doctor',
          'Summarize my routine'
        ],
        contextUsed,
        disclaimer: MEDICAL_DISCLAIMER,
        source: 'contextual-assistant'
      };
    }

    // Default friendly assistant response
    const defaultReply = [
      `Hello ${patientName}! I am **CareBuddy**, your personal healthcare assistant in CAREVERSE.`,
      `I can help you review your **daily medication schedule**, prepare for your **upcoming appointment with ${appointments[0]?.doctor_name || 'your clinician'}**, check your **daily routine progress**, and explain medical terms in plain English.`,
      `\nHow can I help you right now?`
    ].join('\n');

    return {
      reply: defaultReply,
      suggestedFollowUps: [
        'Summarize today\'s schedule',
        'What pills do I take today?',
        'Suggest questions for my doctor',
        'What is my Daily Care Score?'
      ],
      contextUsed,
      disclaimer: MEDICAL_DISCLAIMER,
      source: 'contextual-assistant'
    };
  }

  /**
   * Generates concise daily family digest text
   */
  public static generateFamilyDigest(patientId: string): string {
    const patient = db.getPatientProfileById(patientId);
    const user = patient ? db.getProfileById(patient.user_id) : undefined;
    const name = user?.full_name || 'Your loved one';
    const now = new Date();
    const score = CareScoreService.calculateDailyCareScore(patientId, undefined, now);
    const checkin = db.getWellbeingCheckinForDate(patientId, score.date);
    const appts = upcomingAppointments(patientId, score, now);

    return [
      `CAREVERSE Family Daily Digest for ${name} (${score.date}):`,
      `• Routine Completion: ${scoreSummary(score)}`,
      `• Medication Doses: ${doseSummary(score.metrics)}`,
      checkin ? `• Wellbeing: Feeling ${checkin.mood} (Energy: ${checkin.energy_level}/5, Pain: ${checkin.pain_level}/10)` : `• Wellbeing: Check-in pending`,
      appts.length > 0 ? `• Next Appointment: ${appts[0].doctor_name} (${appts[0].specialty}) on ${appts[0].appointment_date}` : `• No upcoming appointments are recorded.`
    ].join('\n');
  }
}
