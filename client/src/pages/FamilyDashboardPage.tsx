import type { DailyCareScore } from '../types/index.js';
import { formatDoseTime } from '../utils/doseTime.js';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { api } from '../services/api.js';
import { CareBuddyWidget } from '../components/carebuddy/CareBuddyWidget.js';
import { RefillPredictionWidget } from '../components/medication/RefillPredictionWidget.js';
import { AdherenceInsightsCard } from '../components/analytics/AdherenceInsightsCard.js';
import {
  Heart,
  Users,
  Calendar,
  Pill,
  CheckCircle2,
  Clock,
  Activity,
  FileText,
  Send,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

export const FamilyDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [doseTimeZone, setDoseTimeZone] = useState<string>();

  const [accessiblePatients, setAccessiblePatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [doses, setDoses] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [careNotes, setCareNotes] = useState<any[]>([]);
  const [familyDigest, setFamilyDigest] = useState<string>('');
  const [careScore, setCareScore] = useState<DailyCareScore | null>(null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.patients.getAccessible().then(res => {
      const list = res.patients || [];
      setAccessiblePatients(list);
      if (list.length > 0 && !selectedPatientId) {
        setSelectedPatientId(list[0].id);
      }
    }).catch(console.error);
  }, []);

  const fetchPatientData = async (patientId: string) => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [dosesRes, apptsRes, notesRes, digestRes, scoreRes] = await Promise.all([
        api.medications.getTodayDoses(patientId),
        api.appointments.getAll(patientId),
        api.careNotes.getAll(patientId),
        api.careBuddy.getDigest(patientId),
        api.analytics.getDailyScore(patientId)
      ]);

      if (dosesRes) {
        setDoses(dosesRes.records || []);
        setDoseTimeZone(dosesRes.time_zone);
      }
      if (apptsRes) setAppointments(apptsRes.appointments || []);
      if (notesRes) setCareNotes(notesRes.notes || []);
      if (digestRes) setFamilyDigest(digestRes.digest || '');
      if (scoreRes) setCareScore(scoreRes.score);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientData(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedPatientId) return;
    try {
      await api.careNotes.create({
        patient_id: selectedPatientId,
        category: 'general',
        title: 'Family Message / Check-in',
        content: newNote.trim(),
        is_priority: false
      });
      setNewNote('');
      fetchPatientData(selectedPatientId);
    } catch (err: any) {
      alert(err.message || 'Failed to send note');
    }
  };

  const currentPatient = accessiblePatients.find(p => p.id === selectedPatientId);

  return (
    <div className="care-page animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-slate-800 rounded-3xl p-4 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Family Member Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Hello, {user?.full_name}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Monitoring health, medication compliance, and daily routines for your loved one.
          </p>
        </div>

        {/* Patient Selector */}
        {accessiblePatients.length > 1 && (
          <div className="w-full min-w-0 rounded-2xl border border-white/20 bg-white/10 p-3 md:max-w-xs">
            <label htmlFor="family-patient" className="mb-1 block text-xs font-bold text-teal-100">Select loved one</label>
            <select
              id="family-patient"
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-xl bg-navy-950 px-3 py-2 text-sm font-bold text-white"
            >
              {accessiblePatients.map(p => (
                <option key={p.id} value={p.id}>{p.profile?.full_name || 'Patient'} ({p.relationship})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Patient Profile Card & Family Daily Digest */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="min-w-0 lg:col-span-2 space-y-6">
          {/* Automated Family Daily Digest */}
          <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-navy-950">Daily care digest</h3>
                  <span className="text-xs text-slate-500">Based on today’s recorded activity</span>
                </div>
              </div>
              {careScore && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  {careScore.score === null ? 'Awaiting activity' : `${careScore.score}% routine completion`}
                </span>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-4">
              {familyDigest || 'Compiling daily care activities...'}
            </div>

            {/* Quick metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="block text-xl font-black text-emerald-700">
                  {careScore?.metrics.completedDoses ?? 0}
                </span>
                <span className="text-[11px] font-bold text-emerald-900 uppercase">Doses Taken</span>
              </div>
              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100">
                <span className="block text-xl font-black text-sky-700">
                  {doses.filter(d => d.status === 'upcoming' || d.status === 'due_now').length}
                </span>
                <span className="text-[11px] font-bold text-sky-900 uppercase">Upcoming Today</span>
              </div>
              <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200">
                <span className="block text-xl font-black text-slate-800">
                  {appointments.filter(a => a.status === 'scheduled').length}
                </span>
                <span className="text-[11px] font-bold text-slate-700 uppercase">Upcoming Visits</span>
              </div>
            </div>
          </div>

          {/* Today's Medication Overview for Family */}
          <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-card">
            <h3 className="font-bold text-base text-navy-950 mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-600" />
              <span>Today's Prescriptions & Dose Records</span>
            </h3>

            <div className="space-y-2.5">
              {doses.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                      record.status === 'taken' ? 'bg-emerald-600' : 'bg-slate-400'
                    }`}>
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        {record.medication?.name} ({record.medication?.dosage})
                      </span>
                      <span className="text-slate-500">
                        Scheduled: {formatDoseTime(record.scheduled_time, doseTimeZone)}
                        {record.actual_time && ` • Taken at ${formatDoseTime(record.actual_time, doseTimeZone)}`}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                    record.status === 'taken' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Adherence Pattern Detector with Lifestyle Cues */}
          {selectedPatientId && <AdherenceInsightsCard key={selectedPatientId} patientId={selectedPatientId} />}

          {/* Days-to-Depletion Refill Forecast Widget */}
          {selectedPatientId && <RefillPredictionWidget patientId={selectedPatientId} />}
        </div>

        {/* Right Column: Care Notes & Messages */}
        <div className="space-y-6">
          {/* Send Supportive Care Note */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-card">
            <h3 className="font-bold text-sm text-navy-950 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span>Send Note to Care Circle</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Leave a note for the nurse or log a grocery/visit update.
            </p>
            <form onSubmit={handleSendNote} className="space-y-2.5">
              <textarea
                rows={3}
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="e.g. Dropped off fresh fruits. Eleanor sounded energetic on the phone today."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newNote.trim()}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Note</span>
              </button>
            </form>
          </div>

          {/* Recent Care Notes Feed */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-card">
            <h3 className="font-bold text-sm text-navy-950 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Recent Care Notes</span>
            </h3>

            <div className="space-y-3">
              {careNotes.map((note) => (
                <div key={note.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-900">{note.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-2">{note.content}</p>
                  <div className="text-[10px] font-semibold text-teal-700">
                    By: {note.author?.full_name || 'Caregiver'} ({note.category})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CareBuddyWidget patientId={selectedPatientId} />
    </div>
  );
};
