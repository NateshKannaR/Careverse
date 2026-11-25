import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, ClipboardList, Heart, Package, Pill, Plus, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { api } from '../services/api.js';
import type { DailyCareScore, MedicationAdministrationRecord, Appointment, WellbeingCheckin } from '../types/index.js';
import { formatDoseTime } from '../utils/doseTime.js';
import { DoseTimeline } from '../components/medication/DoseTimeline.js';
import { AddMedicationModal } from '../components/medication/AddMedicationModal.js';
import { DailyCheckInModal } from '../components/wellbeing/DailyCheckInModal.js';
import { CareBuddyWidget } from '../components/carebuddy/CareBuddyWidget.js';

export function ElderlyDashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const patientId = user?.patient_id;
  const [data, setData] = useState<{
    doses: MedicationAdministrationRecord[]; zone: string; score: DailyCareScore;
    checkin: WellbeingCheckin | null; visit?: Appointment;
  }>();
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'medication' | 'checkin'>();
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let current = true;
    setError('');
    Promise.all([
      api.medications.getTodayDoses(patientId), api.analytics.getDailyScore(patientId),
      api.wellbeing.getToday(patientId), api.appointments.getAll(patientId),
    ]).then(([timeline, report, wellbeing, visits]) => {
      if (current) setData({ doses: timeline.records, zone: timeline.time_zone, score: report.score,
        checkin: wellbeing.checkin, visit: visits.appointments.find(visit => visit.is_upcoming) });
    }).catch(() => { if (current) setError('Your care plan could not be loaded.'); });
    return () => { current = false; };
  }, [patientId, revision]);

  useEffect(() => {
    const update = () => { if (!document.hidden) refresh(); };
    const timer = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [refresh]);

  const next = data?.doses.find(dose => dose.status === 'due_now' || dose.status === 'upcoming');
  const date = new Date().toLocaleDateString(undefined, { timeZone: data?.zone, weekday: 'long', month: 'long', day: 'numeric' });
  const resources = [
    { path: '/medications?view=supply', label: 'Medication supply', icon: Package },
    { path: '/analytics', label: t.nav.analytics, icon: BarChart3 },
    { path: '/care-circle', label: t.nav.careCircle, icon: Users },
  ];
  return (
    <div className="care-page animate-fade-in">
      <header className="grid gap-5 rounded-3xl bg-teal-950 p-5 text-white sm:p-7 md:grid-cols-[1fr_minmax(15rem,22rem)] md:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-teal-100"><CalendarDays size={16} />{date}</p>
          <h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">{t.common.welcome}, {user?.full_name}</h1>
        </div>
        {data && <div className="rounded-2xl border border-teal-700 bg-teal-900 p-4">
          <div className="flex justify-between gap-2 text-sm"><span>Daily routine</span><strong>{data.score.score === null ? 'Awaiting activity' : `${data.score.score}%`}</strong></div>
          <progress className="my-1.5 block h-2 w-full overflow-hidden rounded-full" value={data.score.metrics.completedItems} max={data.score.metrics.routineItems} aria-label="Completed routine items" />
          <p className="text-xs text-teal-100">{data.score.metrics.completedItems} of {data.score.metrics.routineItems} due routine items complete</p>
        </div>}
      </header>
      {error && <div role="alert" className="flex items-center justify-between rounded-xl bg-amber-50 p-4 text-amber-900">{error}<button className="font-bold underline" onClick={refresh}>Retry</button></div>}
      {!data && !error && <p role="status">Loading your care plan…</p>}
      {data && <>
        <section aria-labelledby="today-title">
          <h2 id="today-title" className="mb-3 text-xl font-bold text-navy-950">Today’s care plan</h2>
          <div className="grid gap-2.5 md:grid-cols-3">
            <a className="care-action" href="#daily-doses"><span className="care-action-icon"><Pill /></span>
              <div><strong>{next?.status === 'due_now' ? 'Dose due' : next ? 'Next dose' : 'Dose schedule'}</strong>
                <p>{next ? `${next.medication?.name} · ${formatDoseTime(next.scheduled_time, data.zone)}` : `${data.doses.length} scheduled today`}</p></div><ChevronRight /></a>
            <button className="care-action" onClick={() => setModal('checkin')}><span className="care-action-icon bg-rose-50 text-rose-700"><Heart /></span>
              <div><strong>{data.checkin ? 'Update check-in' : 'Start check-in'}</strong>
                <p>{data.checkin ? `Mood · ${data.checkin.mood}` : 'Record how you feel today'}</p></div><ChevronRight /></button>
            <Link className="care-action" to="/appointments"><span className="care-action-icon bg-sky-50 text-sky-800"><CalendarDays /></span>
              <div><strong>Next visit</strong><p>{data.visit ? `${data.visit.doctor_name} · ${new Date(data.visit.appointment_date + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' })}` : 'View or schedule a visit'}</p></div><ChevronRight /></Link>
          </div>
        </section>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section id="daily-doses" tabIndex={-1} className="min-w-0 scroll-mt-36 rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div><h2 className="text-xl font-bold text-navy-950">{t.medications.dailySchedule}</h2>
                <p className="text-sm text-slate-600">{data.score.metrics.completedDoses} of {data.score.metrics.dueDoses} due doses taken</p></div>
              <button onClick={() => setModal('medication')} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-teal-50 px-3 text-sm font-bold text-teal-800"><Plus size={16} />{t.medications.addMedication}</button>
            </div>
            <DoseTimeline records={data.doses} timeZone={data.zone} onDoseUpdated={refresh} />
          </section>
          <aside className="space-y-4">
            {data.checkin && <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5">
              <h2 className="flex items-center gap-2 font-bold text-teal-950"><Check size={17} />Today’s wellbeing</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt>Energy</dt><dd className="font-bold">{data.checkin.energy_level} / 5</dd></div><div><dt>Pain</dt><dd className="font-bold">{data.checkin.pain_level} / 10</dd></div></dl>
              {data.checkin.notes && <p className="mt-3 break-words text-sm">{data.checkin.notes}</p>}
            </section>}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="mb-2 flex items-center gap-2 font-bold text-navy-950"><ClipboardList size={18} />Care resources</h2>
              {resources.map(({ path, label, icon: Icon }) => <Link to={path} key={path} className="flex min-h-12 items-center gap-2 border-t border-slate-100 py-2 text-sm font-semibold text-teal-800"><Icon size={17} />{label}<ArrowRight className="ml-auto" size={15} /></Link>)}
            </section>
          </aside>
        </div>
      </>}
      {modal === 'medication' && <AddMedicationModal isOpen onClose={() => setModal(undefined)} onMedicationAdded={refresh} patientId={patientId} />}
      {modal === 'checkin' && data && <DailyCheckInModal isOpen checkin={data.checkin} onClose={() => setModal(undefined)} onCheckInSaved={refresh} patientId={patientId} />}
      <CareBuddyWidget patientId={patientId} />
    </div>
  );
}
