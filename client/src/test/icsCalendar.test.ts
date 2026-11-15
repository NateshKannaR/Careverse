import { describe, it, expect } from 'vitest';
import { generateAppointmentIcs, AppointmentForIcs } from '../utils/icsCalendar.js';

describe('RFC 5545 iCalendar (.ics) Generator Tests', () => {
  const sampleAppointment: AppointmentForIcs = {
    id: 'appt-101',
    doctor_name: 'Dr. Robert Chen',
    specialty: 'Cardiology',
    hospital_clinic: 'Springfield Heart Institute',
    address: '450 Wellness Way, Suite 300, Springfield, OR',
    appointment_date: '2026-11-20',
    appointment_time: '14:30',
    appointment_purpose: 'Routine 6-Month Hypertension Follow-up',
    notes: 'Bring current medication list and morning blood pressure log.'
  };

  it('should generate valid RFC 5545 VCALENDAR structure', () => {
    const icsContent = generateAppointmentIcs(sampleAppointment);

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('PRODID:-//CAREVERSE//Intelligent Elderly Healthcare//EN');
    expect(icsContent).toContain('CALSCALE:GREGORIAN');
    expect(icsContent).toContain('METHOD:PUBLISH');
    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('UID:appointment-appt-101@careverse.health');
    expect(icsContent).toContain('STATUS:CONFIRMED');
    expect(icsContent).toContain('END:VEVENT');
    expect(icsContent).toContain('END:VCALENDAR');
  });

  it('should format DTSTART and DTEND correctly in UTC timestamp format', () => {
    const icsContent = generateAppointmentIcs(sampleAppointment);

    // 2026-11-20 14:30 UTC -> 20261120T143000Z
    expect(icsContent).toContain('DTSTART:20261120T143000Z');
    // Default 1 hour duration -> 20261120T153000Z
    expect(icsContent).toContain('DTEND:20261120T153000Z');
  });

  it('should include dual VALARM triggers: 24h advance and 2h departure alarm', () => {
    const icsContent = generateAppointmentIcs(sampleAppointment);

    // 24h alarm
    expect(icsContent).toContain('TRIGGER:-PT24H');
    expect(icsContent).toContain('Reminder: Doctor Appointment Tomorrow with Dr. Robert Chen');

    // 2h alarm
    expect(icsContent).toContain('TRIGGER:-PT2H');
    expect(icsContent).toContain('Urgent: Doctor Appointment in 2 Hours with Dr. Robert Chen');

    // Count VALARM blocks
    const valarmMatches = icsContent.match(/BEGIN:VALARM/g);
    expect(valarmMatches).toHaveLength(2);
  });

  it('should sanitize special characters in location, summary, and description', () => {
    const appointmentWithSpecialChars: AppointmentForIcs = {
      id: 'appt-special',
      doctor_name: 'Dr. Sarah Smith, MD; PhD',
      specialty: 'Neurology\\Geriatrics',
      hospital_clinic: 'Clinic, Main Campus; Wing B',
      address: 'Line 1\nLine 2',
      appointment_date: '2026-12-05',
      appointment_time: '10:00',
      appointment_purpose: 'Memory test; baseline eval',
      notes: 'Please arrive 15 min early, with ID & insurance card.'
    };

    const icsContent = generateAppointmentIcs(appointmentWithSpecialChars);

    expect(icsContent).toContain('Dr. Sarah Smith\\, MD\\; PhD');
    expect(icsContent).toContain('Neurology\\\\Geriatrics');
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('END:VCALENDAR');
  });
});
