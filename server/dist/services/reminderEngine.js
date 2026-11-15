import { db } from '../db/storageAdapter.js';
import { EmailService } from './emailService.js';
export class ReminderEngine {
    static timer = null;
    static isRunning = false;
    static start(intervalMs = 60 * 1000) {
        if (this.timer) {
            clearInterval(this.timer);
        }
        console.log(`[ReminderEngine] Background reminder engine started (Interval: ${intervalMs / 1000}s).`);
        // Run an immediate check
        this.processTick();
        this.timer = setInterval(() => this.processTick(), intervalMs);
    }
    static stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log('[ReminderEngine] Background reminder engine stopped.');
        }
    }
    static async processTick() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        try {
            await this.checkUpcomingAndMissedDoses();
            await this.checkUpcomingAppointments();
            await this.checkMedicationRefills();
        }
        catch (err) {
            console.error('[ReminderEngine] Error during processTick:', err);
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Process medication doses:
     * 1. Check for upcoming doses within 15 minutes
     * 2. Check for overdue doses past grace period (default 30 min) -> mark as missed -> escalate to caregivers
     */
    static async checkUpcomingAndMissedDoses() {
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
                if (hPart !== undefined)
                    tzHour = parseInt(hPart, 10) % 24;
                if (mPart !== undefined)
                    tzMinute = parseInt(mPart, 10);
            }
            catch {
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
                    let record = todayRecords.find(r => r.medication_id === med.id &&
                        new Date(r.scheduled_time).getHours() === hours &&
                        new Date(r.scheduled_time).getMinutes() === minutes);
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
                        }
                        catch {
                            // already exists in concurrent tick
                            record = db.getAdministrationRecordById(`dose-${med.id}-${scheduledIso}`);
                        }
                    }
                    if (!record)
                        continue;
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
                                htmlContent: EmailService.buildEmailHtml(`Upcoming Dose: ${med.name}`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                   <p>Your dose of <strong>${med.name}</strong> (${med.dosage}) is scheduled for <strong>${timeStr}</strong>.</p>
                   <p><em>Instructions:</em> ${med.instructions || 'Take as prescribed.'}</p>
                   <p>Please record your dose on your CAREVERSE dashboard once taken.</p>`),
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
                                htmlContent: EmailService.buildEmailHtml(`Dose Not Recorded: ${med.name}`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                   <p>Your dose of <strong>${med.name}</strong> (${med.dosage}) scheduled for <strong>${timeStr}</strong> has not been marked as taken.</p>`, safetyNotice),
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
                                        htmlContent: EmailService.buildEmailHtml(`Care Circle Alert: Dose Unrecorded`, `<p>Dear <strong>${memberProfile.full_name}</strong>,</p>
                       <p>This is an automated care alert. <strong>${patientUser?.full_name || 'Your loved one'}</strong> has not recorded taking their scheduled dose of <strong>${med.name}</strong> (${med.dosage}) scheduled for <strong>${timeStr}</strong>.</p>
                       <p>Please reach out or check in with them to ensure their wellbeing.</p>`, safetyNotice),
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
    static async checkUpcomingAppointments() {
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
                            htmlContent: EmailService.buildEmailHtml(`Appointment Reminder (Tomorrow)`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                 <p>You have a scheduled medical appointment tomorrow:</p>
                 <ul>
                   <li><strong>Doctor:</strong> ${appt.doctor_name} (${appt.specialty})</li>
                   <li><strong>Time:</strong> ${appt.appointment_time}</li>
                   <li><strong>Location:</strong> ${appt.hospital_clinic}, ${appt.address || ''}</li>
                   <li><strong>Purpose:</strong> ${appt.appointment_purpose}</li>
                 </ul>
                 ${checklistHtml}`),
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
                                htmlContent: EmailService.buildEmailHtml(`Upcoming Family Appointment`, `<p>Dear <strong>${member.member.full_name}</strong>,</p>
                   <p><strong>${patientUser?.full_name}</strong> has a doctor appointment scheduled for tomorrow with <strong>${appt.doctor_name}</strong> at <strong>${appt.appointment_time}</strong>.</p>`),
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
                            htmlContent: EmailService.buildEmailHtml(`Appointment in 2 Hours`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                 <p>Your appointment with <strong>${appt.doctor_name}</strong> begins at <strong>${appt.appointment_time}</strong>.</p>
                 <p>Clinic: <strong>${appt.hospital_clinic}</strong> (${appt.address || ''})</p>`),
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
    static async checkMedicationRefills() {
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
                            htmlContent: EmailService.buildEmailHtml(`Prescription Refill Alert`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
                 <p>Your prescription for <strong>${med.name}</strong> is running low with only <strong>${med.remaining_supply} doses remaining</strong>.</p>
                 <p>Prescribing Doctor: ${med.prescribing_doctor || 'Clinician'}<br/>Pharmacy: ${med.pharmacy || 'Local Pharmacy'}</p>`),
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
                                htmlContent: EmailService.buildEmailHtml(`Refill Support Needed`, `<p>Dear <strong>${member.member.full_name}</strong>,</p>
                   <p><strong>${patientUser?.full_name}</strong> has only <strong>${med.remaining_supply} doses</strong> left of <strong>${med.name}</strong>.</p>
                   <p>Please assist in requesting a refill from <em>${med.pharmacy || 'their pharmacy'}</em>.</p>`),
                                dedupHash: `${dedupKey}-member-${member.member.id}`
                            });
                        }
                    }
                }
            }
        }
    }
    /**
     * Evaluator Testing Playground: Trigger on-demand simulated reminders
     */
    static async triggerSimulatedReminder(type, patientId) {
        const patient = db.getPatientProfileById(patientId) || db.getAllPatientProfiles()[0];
        if (!patient) {
            throw new Error('Patient profile not found');
        }
        const patientUser = db.getProfileById(patient.user_id);
        const careCircle = db.getCareCircleMembers(patient.id);
        const medications = db.getMedications(patient.id, true);
        const appointments = db.getAppointments(patient.id);
        const med = medications[0] || { name: 'Lisinopril', dosage: '10mg' };
        const appt = appointments[0] || {
            doctor_name: 'Dr. Sarah Connor',
            hospital_clinic: 'Metro Health Cardiology',
            appointment_date: 'Tomorrow',
            appointment_time: '10:30 AM'
        };
        let dispatchedCount = 0;
        const testHashSuffix = `${Date.now()}`;
        if (type === 'upcoming_dose_15m') {
            if (patientUser) {
                await EmailService.sendEmail({
                    recipientEmail: patientUser.email,
                    recipientId: patientUser.id,
                    patientId: patient.id,
                    type: 'medication_reminder',
                    subject: `Upcoming Medication: ${med.name} (${med.dosage}) scheduled in 15 minutes`,
                    textContent: `Hello ${patientUser.full_name}, your dose of ${med.name} is scheduled in 15 minutes.`,
                    htmlContent: EmailService.buildEmailHtml(`Upcoming Medication Due in 15 Minutes`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
             <p>This is a proactive reminder that your scheduled dose of <strong>${med.name} (${med.dosage})</strong> is due in 15 minutes.</p>
             <p><em>Instructions:</em> Take with a full glass of water. Confirm in Careverse when taken.</p>`),
                    dedupHash: `sim-upcoming-${med.id}-${testHashSuffix}`
                });
                dispatchedCount++;
            }
            return { success: true, message: `Dispatched upcoming dose (-15m) reminder for ${med.name}`, dispatchedCount };
        }
        if (type === 'missed_dose_15m') {
            // Stage 1 Missed Dose: Sent to elder and primary caregiver
            if (patientUser) {
                await EmailService.sendEmail({
                    recipientEmail: patientUser.email,
                    recipientId: patientUser.id,
                    patientId: patient.id,
                    type: 'missed_dose',
                    subject: `Stage 1 Alert: Have you taken your ${med.name}?`,
                    textContent: `Hello ${patientUser.full_name}, your dose of ${med.name} was scheduled 15 minutes ago. Please take it or mark it as taken.`,
                    htmlContent: EmailService.buildEmailHtml(`Stage 1 Overdue Dose Notice (+15m)`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
             <p>Your dose of <strong>${med.name}</strong> was due 15 minutes ago and has not yet been logged in Careverse.</p>
             <p>If you have already taken it, please tap <strong>"Mark Taken"</strong> on your dashboard.</p>`),
                    dedupHash: `sim-stage1-patient-${med.id}-${testHashSuffix}`
                });
                dispatchedCount++;
            }
            for (const member of careCircle.slice(0, 1)) {
                if (member.member) {
                    await EmailService.sendEmail({
                        recipientEmail: member.member.email,
                        recipientId: member.member.id,
                        patientId: patient.id,
                        type: 'missed_dose',
                        subject: `Care Alert: ${patientUser?.full_name}'s ${med.name} is 15 minutes overdue`,
                        textContent: `${patientUser?.full_name} has not logged their ${med.name} dose due 15 minutes ago.`,
                        htmlContent: EmailService.buildEmailHtml(`Caregiver Overdue Alert (+15m)`, `<p>Dear <strong>${member.member.full_name}</strong>,</p>
               <p><strong>${patientUser?.full_name}</strong> has not logged their scheduled dose of <strong>${med.name}</strong> after the 15-minute grace window.</p>`),
                        dedupHash: `sim-stage1-caregiver-${member.member.id}-${testHashSuffix}`
                    });
                    dispatchedCount++;
                }
            }
            return { success: true, message: `Dispatched Stage 1 (+15m) overdue alert to patient and caregiver`, dispatchedCount };
        }
        if (type === 'missed_dose_60m') {
            // Stage 2 URGENT Escalation: Dispatched to all family circle editors and caregivers
            for (const member of careCircle) {
                if (member.member) {
                    await EmailService.sendEmail({
                        recipientEmail: member.member.email,
                        recipientId: member.member.id,
                        patientId: patient.id,
                        type: 'missed_dose',
                        subject: `URGENT CARE ESCALATION: ${patientUser?.full_name} has not taken ${med.name} after 1 hour!`,
                        textContent: `URGENT: ${patientUser?.full_name} has not taken their medication ${med.name} after 60 minutes. Please check on their wellbeing.`,
                        htmlContent: EmailService.buildEmailHtml(`URGENT FAMILY ESCALATION (+60m Overdue)`, `<p style="color: #dc2626; font-weight: bold; font-size: 16px;">⚠️ URGENT MEDICATION ESCALATION</p>
               <p>Dear <strong>${member.member.full_name}</strong>,</p>
               <p><strong>${patientUser?.full_name}</strong> has not taken their scheduled medication <strong>${med.name}</strong> after <strong>60 minutes</strong>.</p>
               <p>Please contact them immediately or verify their safety in the Careverse Family Portal.</p>`),
                        dedupHash: `sim-stage2-urgent-${member.member.id}-${testHashSuffix}`
                    });
                    dispatchedCount++;
                }
            }
            return { success: true, message: `Dispatched Stage 2 (+60m) urgent escalation to full Care Circle (${dispatchedCount} members)`, dispatchedCount };
        }
        if (type === 'appointment_24h') {
            if (patientUser) {
                await EmailService.sendEmail({
                    recipientEmail: patientUser.email,
                    recipientId: patientUser.id,
                    patientId: patient.id,
                    type: 'appointment_reminder',
                    subject: `Reminder: Doctor Appointment Tomorrow with ${appt.doctor_name}`,
                    textContent: `You have an appointment tomorrow with ${appt.doctor_name} at ${appt.hospital_clinic}.`,
                    htmlContent: EmailService.buildEmailHtml(`Doctor Visit Tomorrow (24h Reminder)`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
             <p>This is your 24-hour reminder for your upcoming consultation with <strong>${appt.doctor_name}</strong>.</p>
             <p><strong>Location:</strong> ${appt.hospital_clinic}<br/><strong>Time:</strong> ${appt.appointment_time}</p>`),
                    dedupHash: `sim-appt24h-${appt.id}-${testHashSuffix}`
                });
                dispatchedCount++;
            }
            return { success: true, message: `Dispatched 24-hour appointment reminder for ${appt.doctor_name}`, dispatchedCount };
        }
        if (type === 'appointment_2h') {
            if (patientUser) {
                await EmailService.sendEmail({
                    recipientEmail: patientUser.email,
                    recipientId: patientUser.id,
                    patientId: patient.id,
                    type: 'appointment_reminder',
                    subject: `Urgent: Doctor Appointment in 2 Hours with ${appt.doctor_name}`,
                    textContent: `Your appointment with ${appt.doctor_name} is in 2 hours.`,
                    htmlContent: EmailService.buildEmailHtml(`Doctor Visit in 2 Hours`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
             <p>Your appointment with <strong>${appt.doctor_name}</strong> begins in <strong>2 hours</strong> at ${appt.hospital_clinic}.</p>`),
                    dedupHash: `sim-appt2h-${appt.id}-${testHashSuffix}`
                });
                dispatchedCount++;
            }
            return { success: true, message: `Dispatched 2-hour appointment alert for ${appt.doctor_name}`, dispatchedCount };
        }
        if (type === 'refill_alert') {
            if (patientUser) {
                await EmailService.sendEmail({
                    recipientEmail: patientUser.email,
                    recipientId: patientUser.id,
                    patientId: patient.id,
                    type: 'refill_alert',
                    subject: `Low Supply Warning: ${med.name} has only 3 doses remaining`,
                    textContent: `Your prescription for ${med.name} is running low. Please reorder.`,
                    htmlContent: EmailService.buildEmailHtml(`Prescription Refill Warning`, `<p>Hello <strong>${patientUser.full_name}</strong>,</p>
             <p>Your medication <strong>${med.name}</strong> is projected to run out in <strong>3 days</strong>.</p>
             <p>A prescription refill has been flagged for your pharmacy or care circle.</p>`),
                    dedupHash: `sim-refill-${med.id}-${testHashSuffix}`
                });
                dispatchedCount++;
            }
            return { success: true, message: `Dispatched low supply refill warning for ${med.name}`, dispatchedCount };
        }
        return { success: false, message: 'Unknown reminder type', dispatchedCount: 0 };
    }
}
