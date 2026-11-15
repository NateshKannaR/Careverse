import { db } from '../db/storageAdapter.js';
import { EmailService } from './emailService.js';
import { Medication, MedicationAdministrationRecord, Appointment } from '../types/index.js';

export class ReminderEngine {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  public static start(intervalMs: number = 60 * 1000) {
    if (this.timer) {
      clearInterval(this.timer);
    }
    console.log(`[ReminderEngine] Background reminder engine started (Interval: ${intervalMs / 1000}s).`);
    // Run an immediate check
    this.processTick();
    this.timer = setInterval(() => this.processTick(), intervalMs);
  }

  public static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[ReminderEngine] Background reminder engine stopped.');
    }
  }

  public static async processTick() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await this.checkUpcomingAndMissedDoses();
      await this.checkUpcomingAppointments();
      await this.checkMedicationRefills();
    } catch (err) {
      console.error('[ReminderEngine] Error during processTick:', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process medication doses:
   * 1. Check for upcoming doses within 15 minutes
   * 2. Check for overdue doses past grace period (default 30 min) -> mark as missed -> escalate to caregivers
   */
  private static async checkUpcomingAndMissedDoses() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const patients = db.getAllPatientProfiles();

    for (const patient of patients) {
      const medications = db.getMedications(patient.id, true);
      const todayRecords = db.getAdministrationRecords(patient.id, `${todayStr}T00:00:00.000Z`, `${todayStr}T23:59:59.999Z`);
      const patientUser = db.getProfileById(patient.user_id);
      const careCircle = db.getCareCircleMembers(patient.id);

      // Support patient timezone for accurate local time evaluation
      const userTz = patientUser?.timezone || 'UTC';
      let tzHour = now.getHours();
      let tzMinute = now.getMinutes();
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: userTz,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        }).formatToParts(now);
        const hPart = parts.find(p => p.type === 'hour')?.value;
        const mPart = parts.find(p => p.type === 'minute')?.value;
        if (hPart !== undefined) tzHour = parseInt(hPart, 10) % 24;
        if (mPart !== undefined) tzMinute = parseInt(mPart, 10);
      } catch {
        // Fallback to local time if timezone string is unparseable
      }
      const currentMinutesInDay = tzHour * 60 + tzMinute;

      for (const med of medications) {
        for (const timeStr of med.times_of_day) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const scheduledTime = new Date(now);
          scheduledTime.setHours(hours, minutes, 0, 0);
          const scheduledIso = scheduledTime.toISOString();

          // Find existing administration record for today's slot
          let record = todayRecords.find(
            r => r.medication_id === med.id &&
                 new Date(r.scheduled_time).getHours() === hours &&
                 new Date(r.scheduled_time).getMinutes() === minutes
          );

          // If no record exists, generate an initial upcoming record
          if (!record) {
            try {
              record = db.createAdministrationRecord({
                id: `dose-${med.id}-${scheduledIso}`,
                patient_id: patient.id,
                medication_id: med.id,
                scheduled_time: scheduledIso,
                status: 'upcoming',
                created_at: new Date().toISOString()
              });
            } catch {
              // already exists in concurrent tick
              record = db.getAdministrationRecordById(`dose-${med.id}-${scheduledIso}`);
            }
          }

          if (!record) continue;

          // Timezone-adjusted minutes difference
          const scheduledMinutesInDay = hours * 60 + minutes;
          const diffMinutes = currentMinutesInDay - scheduledMinutesInDay;


          // 1. Upcoming reminder (15 minutes before)
          if (diffMinutes >= -15 && diffMinutes < 0 && record.status === 'upcoming') {
            const dedupKey = `upcoming-${med.id}-${scheduledIso}`;
            if (patientUser) {
              await EmailService.sendEmail({
                recipientEmail: patientUser.email,
                recipientId: patientUser.id,
                patientId: patient.id,
                type: 'medication_reminder',
                subject: `Medication Reminder: ${med.name} in 15 minutes`,
                textContent: `Hello ${patientUser.full_name}, your dose of ${med.name} (${med.dosage}) is scheduled for ${timeStr}. Instructions: ${med.instructions || 'Take as prescribed.'}`,
                htmlContent: EmailService.buildEmailHtml(
                  `Upcoming Dose: ${med.name}`,
                  `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                   <p>Your dose of <strong>${med.name}</strong> (${med.dosage}) is scheduled for <strong>${timeStr}</strong>.</p>
                   <p><em>Instructions:</em> ${med.instructions || 'Take as prescribed.'}</p>
                   <p>Please record your dose on your CAREVERSE dashboard once taken.</p>`
                ),
                dedupHash: dedupKey
              });
            }
          }

          // 2. Due now notification
          if (diffMinutes >= 0 && diffMinutes < 15 && record.status === 'upcoming') {
            db.updateAdministrationRecord(record.id, { status: 'due_now' });
          }

          // 3. Grace period passed (30+ minutes) and still not recorded -> mark as missed & escalate!
          if (diffMinutes >= 30 && (record.status === 'upcoming' || record.status === 'due_now')) {
            db.updateAdministrationRecord(record.id, { status: 'missed' });

            const dedupKey = `missed-${med.id}-${scheduledIso}`;
            const safetyNotice = 'IMPORTANT SAFETY NOTICE: Do not take a double dose to make up for a missed dose. Continue with your next scheduled dose or consult your healthcare provider or pharmacist for guidance.';

            // Notify patient
            if (patientUser) {
              await EmailService.sendEmail({
                recipientEmail: patientUser.email,
                recipientId: patientUser.id,
                patientId: patient.id,
                type: 'missed_dose',
                subject: `Missed Dose Alert: ${med.name} at ${timeStr}`,
                textContent: `Hello ${patientUser.full_name}, your dose of ${med.name} scheduled for ${timeStr} was not recorded as taken.\n\n${safetyNotice}`,
                htmlContent: EmailService.buildEmailHtml(
                  `Dose Not Recorded: ${med.name}`,
                  `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                   <p>Your dose of <strong>${med.name}</strong> (${med.dosage}) scheduled for <strong>${timeStr}</strong> has not been marked as taken.</p>`,
                  safetyNotice
                ),
                dedupHash: `${dedupKey}-patient`
              });
            }

            // Escalate to active Care Circle members with notification preference
            for (const member of careCircle) {
              const memberProfile = member.member;
              if (memberProfile) {
                const prefs = db.getNotificationPreferences(memberProfile.id);
                if (prefs?.caregiver_escalation_enabled !== false) {
                  await EmailService.sendEmail({
                    recipientEmail: memberProfile.email,
                    recipientId: memberProfile.id,
                    patientId: patient.id,
                    type: 'care_escalation',
                    subject: `Care Escalation: ${patientUser?.full_name || 'Patient'} missed ${med.name}`,
                    textContent: `Alert for Care Circle: ${patientUser?.full_name || 'Patient'} has not recorded their dose of ${med.name} scheduled for ${timeStr}. Please check in on them.\n\n${safetyNotice}`,
                    htmlContent: EmailService.buildEmailHtml(
                      `Care Circle Alert: Dose Unrecorded`,
                      `<p>Dear <strong>${memberProfile.full_name}</strong>,</p>
                       <p>This is an automated care alert. <strong>${patientUser?.full_name || 'Your loved one'}</strong> has not recorded taking their scheduled dose of <strong>${med.name}</strong> (${med.dosage}) scheduled for <strong>${timeStr}</strong>.</p>
                       <p>Please reach out or check in with them to ensure their wellbeing.</p>`,
                      safetyNotice
                    ),
                    dedupHash: `${dedupKey}-member-${memberProfile.id}`
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Process appointment reminders (24h and 2h prior)
   */
  private static async checkUpcomingAppointments() {
    const now = new Date();
    const patients = db.getAllPatientProfiles();

    for (const patient of patients) {
      const appointments = db.getAppointments(patient.id).filter(a => a.status === 'scheduled');
      const patientUser = db.getProfileById(patient.user_id);
      const careCircle = db.getCareCircleMembers(patient.id);

      for (const appt of appointments) {
        const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
        const hoursUntil = (apptDateTime.getTime() - now.getTime()) / (3600 * 1000);

        // 24 Hour Reminder
        if (hoursUntil > 0 && hoursUntil <= 24 && !appt.reminder_24h_sent) {
          db.updateAppointment(appt.id, { reminder_24h_sent: true });
          const dedupKey = `appt-24h-${appt.id}`;

          const subject = `Upcoming Appointment Tomorrow: ${appt.doctor_name} (${appt.specialty})`;
          const checklistHtml = appt.preparation_checklist.length > 0
            ? `<h4>Preparation Checklist:</h4><ul>${appt.preparation_checklist.map(t => `<li>${t.task} ${t.completed ? '(Completed)' : '(Pending)'}</li>`).join('')}</ul>`
            : '';

          if (patientUser) {
            await EmailService.sendEmail({
              recipientEmail: patientUser.email,
              recipientId: patientUser.id,
              patientId: patient.id,
              type: 'appointment_reminder',
              subject,
              textContent: `Reminder: You have an appointment with ${appt.doctor_name} tomorrow at ${appt.appointment_time} at ${appt.hospital_clinic}.`,
              htmlContent: EmailService.buildEmailHtml(
                `Appointment Reminder (Tomorrow)`,
                `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                 <p>You have a scheduled medical appointment tomorrow:</p>
                 <ul>
                   <li><strong>Doctor:</strong> ${appt.doctor_name} (${appt.specialty})</li>
                   <li><strong>Time:</strong> ${appt.appointment_time}</li>
                   <li><strong>Location:</strong> ${appt.hospital_clinic}, ${appt.address || ''}</li>
                   <li><strong>Purpose:</strong> ${appt.appointment_purpose}</li>
                 </ul>
                 ${checklistHtml}`
              ),
              dedupHash: `${dedupKey}-patient`
            });
          }

          // Also alert care circle
          for (const member of careCircle) {
            if (member.member) {
              await EmailService.sendEmail({
                recipientEmail: member.member.email,
                recipientId: member.member.id,
                patientId: patient.id,
                type: 'appointment_reminder',
                subject: `Care Circle Alert: ${patientUser?.full_name}'s appointment tomorrow with ${appt.doctor_name}`,
                textContent: `Reminder: ${patientUser?.full_name} has an appointment with ${appt.doctor_name} tomorrow at ${appt.appointment_time}.`,
                htmlContent: EmailService.buildEmailHtml(
                  `Upcoming Family Appointment`,
                  `<p>Dear <strong>${member.member.full_name}</strong>,</p>
                   <p><strong>${patientUser?.full_name}</strong> has a doctor appointment scheduled for tomorrow with <strong>${appt.doctor_name}</strong> at <strong>${appt.appointment_time}</strong>.</p>`
                ),
                dedupHash: `${dedupKey}-member-${member.member.id}`
              });
            }
          }
        }

        // 2 Hour Reminder
        if (hoursUntil > 0 && hoursUntil <= 2 && !appt.reminder_2h_sent) {
          db.updateAppointment(appt.id, { reminder_2h_sent: true });
          const dedupKey = `appt-2h-${appt.id}`;

          if (patientUser) {
            await EmailService.sendEmail({
              recipientEmail: patientUser.email,
              recipientId: patientUser.id,
              patientId: patient.id,
              type: 'appointment_reminder',
              subject: `Urgent: Appointment in 2 Hours with ${appt.doctor_name}`,
              textContent: `Your appointment with ${appt.doctor_name} is in 2 hours at ${appt.hospital_clinic}. Contact: ${appt.contact_number || 'N/A'}.`,
              htmlContent: EmailService.buildEmailHtml(
                `Appointment in 2 Hours`,
                `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                 <p>Your appointment with <strong>${appt.doctor_name}</strong> begins at <strong>${appt.appointment_time}</strong>.</p>
                 <p>Clinic: <strong>${appt.hospital_clinic}</strong> (${appt.address || ''})</p>`
              ),
              dedupHash: `${dedupKey}-patient`
            });
          }
        }
      }
    }
  }

  /**
   * Refill monitoring
   */
  private static async checkMedicationRefills() {
    const patients = db.getAllPatientProfiles();

    for (const patient of patients) {
      const medications = db.getMedications(patient.id, true);
      const patientUser = db.getProfileById(patient.user_id);
      const careCircle = db.getCareCircleMembers(patient.id);

      for (const med of medications) {
        if (med.remaining_supply !== undefined && med.remaining_supply <= 5) {
          const todayStr = new Date().toISOString().split('T')[0];
          const dedupKey = `refill-${med.id}-${todayStr}`;

          if (patientUser) {
            await EmailService.sendEmail({
              recipientEmail: patientUser.email,
              recipientId: patientUser.id,
              patientId: patient.id,
              type: 'refill_alert',
              subject: `Medication Refill Needed: ${med.name} (${med.remaining_supply} doses remaining)`,
              textContent: `Your supply of ${med.name} has only ${med.remaining_supply} doses left. Expected refill date: ${med.refill_date || 'Soon'}. Pharmacy: ${med.pharmacy || 'Contact clinic'}.`,
              htmlContent: EmailService.buildEmailHtml(
                `Prescription Refill Alert`,
                `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                 <p>Your prescription for <strong>${med.name}</strong> is running low with only <strong>${med.remaining_supply} doses remaining</strong>.</p>
                 <p>Prescribing Doctor: ${med.prescribing_doctor || 'Clinician'}<br/>Pharmacy: ${med.pharmacy || 'Local Pharmacy'}</p>`
              ),
              dedupHash: `${dedupKey}-patient`
            });
          }

          // Inform Care Circle
          for (const member of careCircle) {
            if (member.member) {
              await EmailService.sendEmail({
                recipientEmail: member.member.email,
                recipientId: member.member.id,
                patientId: patient.id,
                type: 'refill_alert',
                subject: `Refill Alert: ${patientUser?.full_name}'s ${med.name} is low`,
                textContent: `${patientUser?.full_name}'s medication ${med.name} has ${med.remaining_supply} doses remaining.`,
                htmlContent: EmailService.buildEmailHtml(
                  `Refill Support Needed`,
                  `<p>Dear <strong>${member.member.full_name}</strong>,</p>
                   <p><strong>${patientUser?.full_name}</strong> has only <strong>${med.remaining_supply} doses</strong> left of <strong>${med.name}</strong>.</p>
                   <p>Please assist in requesting a refill from <em>${med.pharmacy || 'their pharmacy'}</em>.</p>`
                ),
                dedupHash: `${dedupKey}-member-${member.member.id}`
              });
            }
          }
        }
      }
    }
  }
}
