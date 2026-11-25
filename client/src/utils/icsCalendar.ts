export interface AppointmentForIcs {
  id: string;
  doctor_name: string;
  specialty?: string;
  hospital_clinic?: string;
  address?: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  starts_at?: string;
  appointment_purpose?: string;
  notes?: string;
}

/**
 * Format date string into RFC 5545 timestamp format (YYYYMMDDTHHmmssZ)
 */
function formatIcsTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Sanitize text fields for iCalendar format
 */
function sanitizeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Generate RFC 5545 compliant iCalendar string for a medical appointment
 */
export function generateAppointmentIcs(appointment: AppointmentForIcs): string {
  const startDate = new Date(appointment.starts_at ?? `${appointment.appointment_date}T${appointment.appointment_time}:00Z`);

  // Default duration: 1 hour
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const now = new Date();

  const title = sanitizeIcsText(
    `Doctor Appointment: ${appointment.doctor_name}${
      appointment.specialty ? ` (${appointment.specialty})` : ''
    }`
  );

  const location = sanitizeIcsText(
    [appointment.hospital_clinic, appointment.address].filter(Boolean).join(', ')
  );

  const description = sanitizeIcsText(
    [
      appointment.appointment_purpose ? `Purpose: ${appointment.appointment_purpose}` : '',
      appointment.notes ? `Clinical Notes: ${appointment.notes}` : '',
      'Managed securely via CAREVERSE Intelligent Healthcare Platform.'
    ].filter(Boolean).join('\n\n')
  );

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CAREVERSE//Intelligent Elderly Healthcare//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appointment-${appointment.id}@careverse.health`,
    `DTSTAMP:${formatIcsTimestamp(now)}`,
    `DTSTART:${formatIcsTimestamp(startDate)}`,
    `DTEND:${formatIcsTimestamp(endDate)}`,
    `SUMMARY:${title}`,
    location ? `LOCATION:${location}` : '',
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    // 24-hour advance alarm
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: Doctor Appointment Tomorrow with ${sanitizeIcsText(appointment.doctor_name)}`,
    'END:VALARM',
    // 2-hour departure alarm
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Urgent: Doctor Appointment in 2 Hours with ${sanitizeIcsText(appointment.doctor_name)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Triggers a browser download of the .ics calendar file
 */
export function downloadAppointmentIcs(appointment: AppointmentForIcs): void {
  if (typeof window === 'undefined') return;

  const icsContent = generateAppointmentIcs(appointment);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `appointment-${appointment.doctor_name.replace(/\s+/g, '-').toLowerCase()}-${appointment.appointment_date}.ics`;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
