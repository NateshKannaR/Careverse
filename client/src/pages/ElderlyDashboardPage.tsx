import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useA11y } from '../context/A11yContext.js';
import { api } from '../services/api.js';
import { DoseTimeline } from '../components/medication/DoseTimeline.js';
import { AddMedicationModal } from '../components/medication/AddMedicationModal.js';
import { AddAppointmentModal } from '../components/appointment/AddAppointmentModal.js';
import { DailyCheckInModal } from '../components/wellbeing/DailyCheckInModal.js';
import { InviteMemberModal } from '../components/care-circle/InviteMemberModal.js';
import { CareBuddyWidget } from '../components/carebuddy/CareBuddyWidget.js';
import {
  Heart,
  Pill,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  ShieldAlert,
  ArrowRight,
  Smile,
  AlertCircle,
  Activity,
  Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ElderlyDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { speakAnnouncement } = useA11y();

  const [doses, setDoses] = useState<any[]>([]);
  const [doseSummary, setDoseSummary] = useState<any>({ total: 0, taken: 0, upcoming: 0, due_now: 0, missed: 0 });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [careCircle, setCareCircle] = useState<any[]>([]);
  const [careScore, setCareScore] = useState<any | null>(null);
  const [todayCheckin, setTodayCheckin] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addMedModal, setAddMedModal] = useState(false);
  const [addApptModal, setAddApptModal] = useState(false);
  const [checkinModal, setCheckinModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [dosesRes, apptsRes, circleRes, scoreRes, checkinRes] = await Promise.all([
        api.medications.getTodayDoses(user?.patient_id),
        api.appointments.getAll(user?.patient_id),
        api.careCircle.getMembers(user?.patient_id),
        api.analytics.getDailyScore(user?.patient_id),
        api.wellbeing.getToday(user?.patient_id)
      ]);

      if (dosesRes) {
        setDoses(dosesRes.records || []);
        setDoseSummary(dosesRes.summary || { total: 0, taken: 0, upcoming: 0, due_now: 0, missed: 0 });
      }
      if (apptsRes) setAppointments(apptsRes.appointments || []);
      if (circleRes) setCareCircle(circleRes.members || []);
      if (scoreRes) setCareScore(scoreRes.score);
      if (checkinRes) setTodayCheckin(checkinRes.checkin);
    } catch (err) {
      console.error('Error fetching elderly dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const nextUpcomingDose = doses.find(d => d.status === 'upcoming' || d.status === 'due_now');
  const nextAppointment = appointments.find(a => a.status === 'scheduled');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Banner: Welcome & Today Date */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-navy-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Heart className="w-4 h-4 fill-teal-400 text-teal-400" />
            <span>Elderly Healthcare Center</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            {t.common.welcome}, {user?.full_name}!
          </h1>
          <p className="text-sm sm:text-base text-teal-100/90 font-medium mt-1">
            {todayFormatted} • Springfield, OR
          </p>
        </div>

        {/* Routine Care Score Ring */}
        {careScore && (
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/20">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/20"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400"
                  strokeDasharray={`${careScore.score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-black text-white">
                {careScore.score}%
              </span>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-200">
                Daily Routine Care Score
              </div>
              <div className="text-base font-extrabold text-white">
                {careScore.rating}
              </div>
              <div className="text-[10px] text-teal-200/80">
                {careScore.metrics.completedDoses}/{careScore.metrics.scheduledDoses} Doses Taken
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Doses & Schedule vs Sidebar Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Medication Doses & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Dose Focus Card */}
          {nextUpcomingDose && (
            <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-3xl border-2 border-teal-500/30 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <Pill className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-full">
                    Next Scheduled Dose
                  </span>
                  <h3 className="text-lg font-black text-navy-950 mt-1">
                    {nextUpcomingDose.medication?.name} ({nextUpcomingDose.medication?.dosage})
                  </h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-teal-700" />
                    Scheduled for {new Date(nextUpcomingDose.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {nextUpcomingDose.medication?.instructions && ` • ${nextUpcomingDose.medication.instructions}`}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  await api.medications.recordDose(nextUpcomingDose.id, 'taken');
                  speakAnnouncement(`Recorded ${nextUpcomingDose.medication?.name} as taken.`);
                  fetchDashboardData();
                }}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 flex-shrink-0 text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.medications.markTaken}</span>
              </button>
            </div>
          )}

          {/* Today's Medication Timeline */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-card">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-navy-950">{t.medications.dailySchedule}</h2>
                <p className="text-xs text-slate-500">
                  {doseSummary.taken} of {doseSummary.total} doses taken today
                </p>
              </div>
              <button
                onClick={() => setAddMedModal(true)}
                className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{t.medications.addMedication}</span>
              </button>
            </div>

            <DoseTimeline records={doses} onDoseUpdated={fetchDashboardData} canManageMeds={true} />
          </div>
        </div>

        {/* Right 1 Column: Wellbeing, Appointments, Care Circle, Quick Actions */}
        <div className="space-y-6">
          {/* Daily Wellbeing Check-in Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-navy-950">{t.wellbeing.title}</h3>
              </div>
              {todayCheckin && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Recorded Today
                </span>
              )}
            </div>

            {todayCheckin ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mood:</span>
                  <span className="font-bold text-slate-800 capitalize">{todayCheckin.mood}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Energy Level:</span>
                  <span className="font-bold text-teal-800">{todayCheckin.energy_level} / 5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Pain Level:</span>
                  <span className="font-bold text-slate-800">{todayCheckin.pain_level} / 10</span>
                </div>
                {todayCheckin.notes && (
                  <p className="pt-2 border-t border-slate-200 text-slate-600 italic">
                    "{todayCheckin.notes}"
                  </p>
                )}
                <button
                  onClick={() => setCheckinModal(true)}
                  className="w-full mt-2 py-1.5 text-xs text-teal-700 font-bold hover:underline"
                >
                  Update Check-in
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-600 mb-4">
                  Take a moment to record how you are feeling today for your family and caregiver.
                </p>
                <button
                  onClick={() => setCheckinModal(true)}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Start Check-in
                </button>
              </div>
            )}
          </div>

          {/* Next Medical Appointment Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-navy-950">Next Doctor Visit</h3>
              </div>
              <button
                onClick={() => setAddApptModal(true)}
                className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Schedule
              </button>
            </div>

            {nextAppointment ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-900 text-sm">
                  {nextAppointment.doctor_name}
                </div>
                <div className="text-slate-600">
                  {nextAppointment.specialty} • {nextAppointment.hospital_clinic}
                </div>
                <div className="text-teal-800 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {nextAppointment.appointment_date} at {nextAppointment.appointment_time}
                </div>
                <p className="text-slate-500 italic mt-1">{nextAppointment.appointment_purpose}</p>

                {nextAppointment.preparation_checklist?.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Pre-Visit Tasks:</span>
                    <ul className="space-y-1">
                      {nextAppointment.preparation_checklist.map((t: any, idx: number) => (
                        <li key={idx} className="flex items-center gap-1.5 text-slate-600">
                          <span className={t.completed ? 'line-through text-slate-400' : ''}>
                            {t.completed ? '✓' : '○'} {t.task}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                No upcoming appointments scheduled.
              </p>
            )}
          </div>

          {/* Care Circle Summary Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-navy-950">{t.careCircle.title}</h3>
              </div>
              <button
                onClick={() => setInviteModal(true)}
                className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Invite
              </button>
            </div>

            <div className="space-y-2.5">
              {careCircle.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800">{member.member?.full_name || 'Member'}</div>
                    <div className="text-[11px] text-slate-500">{member.relationship}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    Active
                  </span>
                </div>
              ))}
            </div>
            <Link
              to="/care-circle"
              className="mt-4 block text-center text-xs font-bold text-teal-700 hover:underline"
            >
              Manage Care Circle Permissions →
            </Link>
          </div>
        </div>
      </div>

      {/* Floating CareBuddy Widget */}
      <CareBuddyWidget patientId={user?.patient_id} />

      {/* Modals */}
      <AddMedicationModal
        isOpen={addMedModal}
        onClose={() => setAddMedModal(false)}
        onMedicationAdded={fetchDashboardData}
        patientId={user?.patient_id}
      />

      <AddAppointmentModal
        isOpen={addApptModal}
        onClose={() => setAddApptModal(false)}
        onAppointmentAdded={fetchDashboardData}
        patientId={user?.patient_id}
      />

      <DailyCheckInModal
        isOpen={checkinModal}
        onClose={() => setCheckinModal(false)}
        onCheckInSaved={fetchDashboardData}
        patientId={user?.patient_id}
      />

      <InviteMemberModal
        isOpen={inviteModal}
        onClose={() => setInviteModal(false)}
        onMemberInvited={fetchDashboardData}
        patientId={user?.patient_id}
      />
    </div>
  );
};
