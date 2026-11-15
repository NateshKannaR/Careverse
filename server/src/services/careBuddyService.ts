import { db } from '../db/storageAdapter.js';
import { CareScoreService } from './careScoreService.js';
import { config } from '../config/index.js';

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

export class CareBuddyService {
  /**
   * Generates intelligent, contextual response using the patient's authenticated medical records.
   */
  public static async askCareBuddy(patientId: string, userMessage: string): Promise<CareBuddyResponse> {
    const patient = db.getPatientProfileById(patientId);
    const patientUser = patient ? db.getProfileById(patient.user_id) : undefined;
    const patientName = patientUser?.full_name || 'Patient';

    const meds = db.getMedications(patientId, true);
    const appointments = db.getAppointments(patientId).filter(a => a.status === 'scheduled');
    const careScore = CareScoreService.calculateDailyCareScore(patientId);
    const checkin = db.getWellbeingCheckinToday(patientId);
    const notes = db.getCareNotes(patientId);

    const contextUsed = {
      patientName,
      activeMedsCount: meds.length,
      completedDosesToday: careScore.metrics.completedDoses,
      pendingDosesToday: careScore.metrics.pendingDoses,
      upcomingAppointmentsCount: appointments.length
    };

    const query = userMessage.toLowerCase().trim();

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
        `- **Medications:** You have taken **${careScore.metrics.completedDoses} of ${careScore.metrics.scheduledDoses}** scheduled doses today.`,
        careScore.metrics.pendingDoses > 0
          ? `- **Pending Doses:** You have **${careScore.metrics.pendingDoses}** doses remaining for today.`
          : `- **Pending Doses:** All scheduled doses for today have been completed! Outstanding job.`,
        careScore.metrics.missedDoses > 0
          ? `- **Missed Doses:** There are ${careScore.metrics.missedDoses} unrecorded doses from earlier today.`
          : '',
        checkin
          ? `- **Wellbeing Check-in:** Recorded (Mood: *${checkin.mood}*, Energy: *${checkin.energy_level}/5*).`
          : `- **Wellbeing Check-in:** You have not recorded your daily check-in yet. Would you like to do that now?`,
        appointments.length > 0
          ? `- **Next Appointment:** With **${appointments[0].doctor_name}** (${appointments[0].specialty}) on **${appointments[0].appointment_date} at ${appointments[0].appointment_time}**.`
          : `- **Appointments:** No medical visits scheduled for this week.`,
        `- **Daily Routine Care Score:** **${careScore.score}%** (${careScore.rating}).`
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

    if (query.includes('miss') || query.includes('double') || query.includes('forgot')) {
      const reply = [
        `**Safety Protocol for Missed Doses:**`,
        `• **NEVER take a double dose** to compensate for a missed dose. Doing so can cause sudden side effects or toxicity.`,
        `• If only a short time has passed, follow your clinician's or pharmacist's specific guidelines on whether to take it or skip.`,
        `• If it is almost time for your next scheduled dose, skip the missed dose and resume your regular schedule.`,
        `• When in doubt, contact your prescribing clinic or local pharmacist directly for guidance.`
      ].join('\n');

      return {
        reply,
        suggestedFollowUps: ['Show my medication schedule', 'Summarize my day'],
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
        `\n**Today's Status:** ${careScore.metrics.completedDoses} taken, ${careScore.metrics.pendingDoses} upcoming, ${careScore.metrics.missedDoses} missed.`,
        `\n*Refill Notice:* If your medication supply reaches 5 doses or fewer, CAREVERSE will automatically notify your Care Circle.`
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
      `I can help you review your **daily medication schedule**, prepare for your **upcoming appointment with ${appointments[0]?.doctor_name || 'your clinician'}**, check your **Daily Care Score (${careScore.score}%)**, and explain medical terms in plain English.`,
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
    const score = CareScoreService.calculateDailyCareScore(patientId);
    const checkin = db.getWellbeingCheckinToday(patientId);
    const appts = db.getAppointments(patientId).filter(a => a.status === 'scheduled');

    return [
      `CAREVERSE Family Daily Digest for ${name} (${score.date}):`,
      `• Routine Completion: ${score.score}% (${score.rating})`,
      `• Medication Doses: ${score.metrics.completedDoses} completed, ${score.metrics.pendingDoses} upcoming, ${score.metrics.missedDoses} missed`,
      checkin ? `• Wellbeing: Feeling ${checkin.mood} (Energy: ${checkin.energy_level}/5, Pain: ${checkin.pain_level}/10)` : `• Wellbeing: Check-in pending`,
      appts.length > 0 ? `• Next Appointment: ${appts[0].doctor_name} (${appts[0].specialty}) on ${appts[0].appointment_date}` : `• No appointments today.`
    ].join('\n');
  }
}
