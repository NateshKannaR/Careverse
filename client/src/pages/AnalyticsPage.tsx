import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarDays, Download } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdherenceInsightsCard } from '../components/analytics/AdherenceInsightsCard.js';
import { CareBuddyWidget } from '../components/carebuddy/CareBuddyWidget.js';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { api } from '../services/api.js';

const OUTCOMES = [
  { key: 'taken', label: 'Taken', color: '#0f766e' },
  { key: 'missed', label: 'Missed', color: '#be123c' },
  { key: 'skipped', label: 'Skipped', color: '#475569' },
  { key: 'pending', label: 'Awaiting a record', color: '#b45309' },
] as const;

function dayLabel(iso: string, weekday = false) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: 'UTC', month: 'short', day: 'numeric', ...(weekday ? { weekday: 'short' } : {}),
  }).format(new Date(iso + 'T00:00:00Z'));
}

export function AnalyticsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const patientId = user?.patient_id;
  const [days, setDays] = useState(7);
  const [selectedDate, setSelectedDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const report = useQuery({
    queryKey: ['adherence-report', user?.id, patientId, days],
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const [trend, { score }] = await Promise.all([
        api.analytics.getAdherence(days, patientId, signal),
        api.analytics.getDailyScore(patientId, signal),
      ]);
      return { trend, score };
    },
  });
  const trend = report.data?.trend;
  const score = report.data?.score;
  const recorded = trend ? trend.totalTaken + trend.totalMissed + trend.totalSkipped : 0;
  const outcomeTotals = trend ? {
    taken: trend.totalTaken, missed: trend.totalMissed, skipped: trend.totalSkipped, pending: trend.totalPending,
  } : null;
  const newestFirst = trend ? [...trend.dailyTrends].reverse() : [];
  const day = newestFirst.find(row => row.date === selectedDate)
    ?? newestFirst.find(row => row.scheduled > 0) ?? newestFirst[0];

  async function exportDoseLog() {
    setExporting(true);
    setExportError('');
    try {
      const blob = await api.analytics.downloadDoseLog(patientId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'careverse-dose-log.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('The dose log could not be downloaded. Try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="care-page">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-[#113d3c] p-4 text-white sm:p-7">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
            <BarChart3 aria-hidden="true" className="h-6 w-6 shrink-0 text-teal-200" />
            {t.analytics.title}
          </h1>
          <p className="mt-2 text-sm text-teal-100">See what was recorded, what’s due, and where a record is still missing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Reporting period" className="inline-flex flex-wrap rounded-xl bg-white/10 p-1">
            {[7, 14, 30].map(period => (
              <button
                key={period}
                type="button"
                aria-pressed={days === period}
                onClick={() => { setDays(period); setSelectedDate(''); }}
                className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${days === period ? 'bg-white text-teal-950' : 'text-white hover:bg-white/15'}`}
              >
                {period} days
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void exportDoseLog()} disabled={exporting}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-200/60 px-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-65">
            <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
            {exporting ? 'Downloading…' : 'Download dose log'}
          </button>
        </div>
      </header>

      {exportError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{exportError}</p>}
      {report.isPending && <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">Loading recorded activity…</p>}
      {report.isError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p>Careverse couldn’t load this report.</p>
          <button type="button" className="min-h-11 rounded-xl bg-white px-3 font-bold text-rose-800" onClick={() => void report.refetch()}>Try again</button>
        </div>
      )}

      {trend && score && outcomeTotals && (
        <>
          <div className="grid min-w-0 gap-4 lg:grid-cols-[1.25fr_1fr]">
            <section className="min-w-0 rounded-3xl border border-teal-200 bg-teal-50 p-4 sm:p-6" aria-labelledby="recorded-adherence">
              <h2 id="recorded-adherence" className="text-sm font-bold text-teal-950">Recorded adherence</h2>
              <p className="my-2 text-3xl font-black tracking-tight text-teal-950 sm:text-4xl">
                {trend.averageAdherence === null ? 'No outcomes' : `${trend.averageAdherence}%`}
              </p>
              <p className="text-sm text-teal-900">{trend.totalTaken} of {recorded} recorded doses were taken.</p>
              {trend.totalScheduled > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-teal-950">{recorded} of {trend.totalScheduled} due doses have an outcome</p>
                  <progress className="block h-2 w-full overflow-hidden rounded-full accent-teal-700" max={trend.totalScheduled} value={recorded}
                    aria-label="Due doses with a recorded outcome" />
                </div>
              ) : <p className="mt-4 text-sm text-teal-900">No doses became due in this period.</p>}
            </section>
            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6" aria-labelledby="routine-progress">
              <h2 id="routine-progress" className="text-sm font-bold text-slate-900">Today’s routine progress</h2>
              <p className="my-2 text-3xl font-black tracking-tight text-navy-950 sm:text-4xl">
                {score.score === null ? 'Awaiting activity' : `${score.score}%`}
              </p>
              <p className="text-sm text-slate-700">{score.metrics.completedItems} of {score.metrics.routineItems} routine items completed.</p>
              <p className="mt-3 text-sm text-slate-600">
                {score.metrics.completedDoses} of {score.metrics.dueDoses} due doses taken · Check-in {score.metrics.wellbeingCheckinRecorded ? 'recorded' : 'pending'}
              </p>
            </section>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
            {OUTCOMES.map(outcome => (
              <div key={outcome.key} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                <p className="flex items-start gap-2 text-xs font-semibold text-slate-700 sm:text-sm">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: outcome.color }} aria-hidden="true" />
                  {outcome.label}
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-navy-950">{outcomeTotals[outcome.key]}</p>
              </div>
            ))}
          </div>
          <div className="grid min-w-0 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6" aria-labelledby="dose-trend">
              <h2 id="dose-trend" className="text-lg font-bold text-navy-950">Dose activity by day</h2>
              <p className="text-sm text-slate-600">{days} days · {trend.timeZone}</p>
              {trend.totalScheduled > 0 && (
                <div className="mt-4 h-56 min-w-0 sm:h-64" role="img" aria-label="Stacked chart showing counts of taken, missed, skipped, and unresolved doses. Use the day selector for the exact counts.">
                  <ResponsiveContainer>
                    <BarChart data={trend.dailyTrends} margin={{ top: 5, left: -26, right: 5, bottom: 0 }}>
                      <XAxis dataKey="date" tickFormatter={value => dayLabel(value)} tick={{ fill: '#475569', fontSize: 11 }} minTickGap={18} />
                      <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 11 }} />
                      <Tooltip labelFormatter={value => dayLabel(value, true)} />
                      {OUTCOMES.map(outcome => (
                        <Bar key={outcome.key} dataKey={outcome.key} name={outcome.label} stackId="doses" fill={outcome.color} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {day && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <label htmlFor="analytics-day" className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-teal-700" /> Inspect a day
                  </label>
                  <select id="analytics-day" value={day.date} onChange={event => setSelectedDate(event.target.value)}
                    className="my-2 min-h-11 w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900">
                    {newestFirst.map(row => <option key={row.date} value={row.date}>{dayLabel(row.date, true)}</option>)}
                  </select>
                  <dl className="grid grid-cols-2 gap-2 text-sm min-[480px]:grid-cols-4" aria-live="polite">
                    {OUTCOMES.map(outcome => (
                      <div key={outcome.key}><dt className="text-slate-700">{outcome.label}</dt><dd className="font-bold tabular-nums text-navy-950">{day[outcome.key]}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
            </section>
            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6" aria-labelledby="dose-categories">
              <h2 id="dose-categories" className="text-lg font-bold text-navy-950">By prescription category</h2>
              <ul className="mt-3 divide-y divide-slate-200">
                {trend.categoryBreakdown.map(category => (
                  <li key={category.category} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div className="min-w-0 break-words">
                      <p className="font-semibold text-navy-950">{category.category}</p>
                      <p className="text-slate-600">{category.taken} taken · {category.total} due</p>
                    </div>
                    <p className="font-bold text-teal-800">{category.rate === null ? 'No outcomes' : `${category.rate}% recorded`}</p>
                  </li>
                ))}
              </ul>
              {trend.categoryBreakdown.length === 0 && <p className="mt-3 text-sm text-slate-600">No due doses for these dates.</p>}
            </section>
          </div>
        </>
      )}
      {trend && <AdherenceInsightsCard patientId={patientId} />}
      <CareBuddyWidget patientId={patientId} />
    </div>
  );
}
