import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { api } from '../services/api.js';
import { CareBuddyWidget } from '../components/carebuddy/CareBuddyWidget.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  BarChart3,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Activity
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [timeRange, setTimeRange] = useState<number>(7);
  const [adherenceData, setAdherenceData] = useState<any | null>(null);
  const [dailyScore, setDailyScore] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.analytics.getAdherence(timeRange, user?.patient_id),
      api.analytics.getDailyScore(user?.patient_id)
    ])
      .then(([adherenceRes, scoreRes]) => {
        setAdherenceData(adherenceRes);
        setDailyScore(scoreRes.score);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [timeRange, user]);

  const COLORS = ['#0d9488', '#059669', '#3b82f6', '#f59e0b', '#8b5cf6'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-950 flex items-center gap-2.5">
            <BarChart3 className="w-8 h-8 text-teal-600" />
            <span>{t.analytics.title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.analytics.subtitle}</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Time range selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTimeRange(7)}
              className={`px-3 py-1.5 rounded-xl transition ${timeRange === 7 ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange(14)}
              className={`px-3 py-1.5 rounded-xl transition ${timeRange === 14 ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'}`}
            >
              14 Days
            </button>
            <button
              onClick={() => setTimeRange(30)}
              className={`px-3 py-1.5 rounded-xl transition ${timeRange === 30 ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'}`}
            >
              30 Days
            </button>
          </div>

          {/* Real CSV Export Button */}
          <a
            href={api.analytics.getExportUrl(user?.patient_id)}
            download
            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold shadow-md transition"
          >
            <Download className="w-4 h-4" />
            <span>{t.analytics.exportCsv}</span>
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {adherenceData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
            <span className="text-xs font-bold text-slate-500 block mb-1">Average Adherence</span>
            <div className="text-2xl font-black text-teal-700 flex items-center gap-1">
              <span>{adherenceData.averageAdherence == null ? 'No outcomes' : `${adherenceData.averageAdherence}%`}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Recorded outcomes over {timeRange} days</span>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
            <span className="text-xs font-bold text-slate-500 block mb-1">Doses Taken</span>
            <span className="text-2xl font-black text-emerald-600 block">{adherenceData.totalTaken}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Of {adherenceData.totalScheduled} due · {adherenceData.totalPending ?? 0} without an outcome</span>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
            <span className="text-xs font-bold text-slate-500 block mb-1">Missed Doses</span>
            <span className="text-2xl font-black text-rose-600 block">{adherenceData.totalMissed}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">{adherenceData.totalSkipped ?? 0} skipped</span>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
            <span className="text-xs font-bold text-slate-500 block mb-1">Daily Care Score</span>
            <span className="text-2xl font-black text-navy-950 block">{dailyScore?.score || 0}%</span>
            <span className="text-[10px] text-teal-700 font-semibold mt-1 block">
              Rating: {dailyScore?.rating || 'In Progress'}
            </span>
          </div>
        </div>
      )}

      {/* Recharts Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Adherence Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-navy-950">Daily Medication Adherence</h3>
              <p className="text-xs text-slate-500">Due doses by recorded status · {adherenceData?.timeZone ?? 'UTC'}</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {adherenceData?.dailyTrends && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adherenceData.dailyTrends}>
                  <XAxis dataKey="dayName" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="taken" name="Taken" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missed" name="Missed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="skipped" name="Skipped" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Without outcome" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Prescription Category Breakdown */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-navy-950 mb-1">Prescription Categories</h3>
            <p className="text-xs text-slate-500 mb-4">Adherence by medical specialty</p>

            <div className="h-56 w-full">
              {adherenceData?.categoryBreakdown && adherenceData.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={adherenceData.categoryBreakdown}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {adherenceData.categoryBreakdown.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                  No category data available.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            {adherenceData?.categoryBreakdown?.map((cat: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="font-medium text-slate-700">{cat.category}</span>
                </div>
                <span className="font-bold text-teal-800">{cat.rate == null ? 'No outcomes' : `${cat.rate}% recorded adherence`}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CareBuddyWidget patientId={user?.patient_id} />
    </div>
  );
};
