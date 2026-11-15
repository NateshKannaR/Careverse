import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { api } from '../services/api.js';
import { AddAppointmentModal } from '../components/appointment/AddAppointmentModal.js';
import { CareBuddyWidget } from '../components/carebuddy/CareBuddyWidget.js';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Plus,
  CheckSquare,
  Square,
  AlertCircle,
  FileCheck,
  XCircle
} from 'lucide-react';

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    try {
      const res = await api.appointments.getAll(user?.patient_id);
      if (res) setAppointments(res.appointments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const handleToggleChecklist = async (apptId: string, taskIdx: number, currentCompleted: boolean) => {
    try {
      await api.appointments.toggleChecklist(apptId, taskIdx, !currentCompleted);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Error updating checklist item');
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await api.appointments.delete(apptId);
        fetchAppointments();
      } catch (err: any) {
        alert(err.message || 'Failed to cancel appointment');
      }
    }
  };

  const upcomingAppts = appointments.filter(a => a.status === 'scheduled');
  const pastAppts = appointments.filter(a => a.status !== 'scheduled');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-950 flex items-center gap-2.5">
            <Calendar className="w-8 h-8 text-teal-600" />
            <span>{t.appointments.title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.appointments.subtitle}</p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.appointments.scheduleAppointment}</span>
        </button>
      </div>

      {/* Reminder Notification Notice Banner */}
      <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 text-xs text-teal-900 flex items-center gap-3">
        <Clock className="w-5 h-5 text-teal-700 flex-shrink-0" />
        <div>
          <strong>Automatic Email Reminders:</strong> {t.appointments.reminderNotice}
        </div>
      </div>

      {/* Upcoming Consultations */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-navy-950 flex items-center gap-2">
          <span>{t.appointments.upcoming} ({upcomingAppts.length})</span>
        </h2>

        {upcomingAppts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 text-slate-400 text-xs">
            No upcoming medical appointments. Click "Schedule Appointment" to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingAppts.map(appt => (
              <div
                key={appt.id}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        {appt.specialty}
                      </span>
                      <h3 className="text-lg font-black text-navy-950 mt-1.5">
                        {appt.doctor_name}
                      </h3>
                      <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        <span>{appt.hospital_clinic}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-teal-700">{appt.appointment_date}</div>
                      <div className="text-xs font-semibold text-slate-500">{appt.appointment_time}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1 mb-4">
                    <div><strong>Purpose:</strong> {appt.appointment_purpose}</div>
                    {appt.address && <div><strong>Address:</strong> {appt.address}</div>}
                    {appt.contact_number && (
                      <div className="flex items-center gap-1 text-teal-700 font-bold">
                        <Phone className="w-3.5 h-3.5" /> {appt.contact_number}
                      </div>
                    )}
                  </div>

                  {/* Interactive Preparation Checklist */}
                  {appt.preparation_checklist?.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 mb-4">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                        <FileCheck className="w-4 h-4 text-teal-600" />
                        <span>Pre-Visit Preparation Checklist</span>
                      </h4>
                      <div className="space-y-1.5">
                        {appt.preparation_checklist.map((task: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => handleToggleChecklist(appt.id, idx, task.completed)}
                            className="w-full flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 text-left text-xs transition"
                          >
                            {task.completed ? (
                              <CheckSquare className="w-4 h-4 text-teal-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span className={task.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}>
                              {task.task}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Status: Confirmed</span>
                  <button
                    onClick={() => handleCancelAppointment(appt.id)}
                    className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel Visit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddAppointmentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAppointmentAdded={fetchAppointments}
        patientId={user?.patient_id}
      />

      <CareBuddyWidget patientId={user?.patient_id} />
    </div>
  );
};
