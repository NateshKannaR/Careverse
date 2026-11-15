import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { api } from '../services/api.js';
import { CareBuddyWidget } from '../components/carebuddy/CareBuddyWidget.js';
import {
  Heart,
  Pill,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FilePlus,
  Send,
  User,
  Activity,
  Plus
} from 'lucide-react';

export const CaregiverDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [doses, setDoses] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [careNotes, setCareNotes] = useState<any[]>([]);

  // Care note form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<'vitals' | 'general' | 'medical' | 'diet'>('vitals');
  const [noteContent, setNoteContent] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.patients.getAccessible().then(res => {
      const list = res.patients || [];
      setPatients(list);
      if (list.length > 0 && !selectedPatientId) {
        setSelectedPatientId(list[0].id);
      }
    }).catch(console.error);
  }, []);

  const fetchPatientDetails = async (patientId: string) => {
    if (!patientId) return;
    try {
      const [dosesRes, apptsRes, notesRes] = await Promise.all([
        api.medications.getTodayDoses(patientId),
        api.appointments.getAll(patientId),
        api.careNotes.getAll(patientId)
      ]);

      if (dosesRes) setDoses(dosesRes.records || []);
      if (apptsRes) setAppointments(apptsRes.appointments || []);
      if (notesRes) setCareNotes(notesRes.notes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleRecordDose = async (doseId: string, status: 'taken' | 'skipped') => {
    try {
      await api.medications.recordDose(doseId, status, 'Administered by nurse');
      fetchPatientDetails(selectedPatientId);
    } catch (err: any) {
      alert(err.message || 'Error recording dose');
    }
  };

  const handleCreateCareNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim() || !selectedPatientId) return;
    setLoading(true);
    try {
      await api.careNotes.create({
        patient_id: selectedPatientId,
        category: noteCategory,
        title: noteTitle.trim(),
        content: noteContent.trim(),
        is_priority: isPriority
      });
      setNoteTitle('');
      setNoteContent('');
      setIsPriority(false);
      fetchPatientDetails(selectedPatientId);
    } catch (err: any) {
      alert(err.message || 'Failed to add care note');
    } finally {
      setLoading(false);
    }
  };

  const pendingDoses = doses.filter(d => d.status === 'upcoming' || d.status === 'due_now');
  const missedDoses = doses.filter(d => d.status === 'missed');
  const activePatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Caregiver Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Heart className="w-4 h-4 fill-emerald-300" />
            <span>Caregiver & Nursing Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Nurse Station: {user?.full_name}
          </h1>
          <p className="text-sm text-emerald-100 mt-1">
            Managing medication administration, clinical vitals, and care coordination.
          </p>
        </div>

        {/* Assigned Patients Picker */}
        <div className="bg-white/10 p-3 rounded-2xl border border-white/20">
          <label className="block text-[11px] font-bold text-emerald-200 mb-1">Current Patient:</label>
          <select
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            className="bg-emerald-950 text-white text-xs font-bold px-3 py-2 rounded-xl focus:outline-none"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.profile?.full_name || 'Patient'} (Allergies: {p.allergies?.join(', ') || 'None'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Pending Doses, Missed Alerts, and Care Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Missed Doses Alert Banner (if any) */}
          {missedDoses.length > 0 && (
            <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-3xl text-xs text-rose-900 shadow-sm">
              <div className="flex items-center gap-2 font-black text-sm mb-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>Attention Required: {missedDoses.length} Potentially Missed Doses</span>
              </div>
              <p className="mb-3 leading-relaxed">
                The following scheduled doses have passed their 30-minute grace period without an administration record. Please check in with the patient immediately.
              </p>
              <div className="space-y-2">
                {missedDoses.map(d => (
                  <div key={d.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-rose-200">
                    <span className="font-bold">{d.medication?.name} ({d.medication?.dosage})</span>
                    <button
                      onClick={() => handleRecordDose(d.id, 'taken')}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px]"
                    >
                      Administer Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Medication Administration Doses */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-card">
            <h3 className="text-lg font-bold text-navy-950 mb-1 flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-600" />
              <span>Pending Doses for Today ({pendingDoses.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">Record administration directly as doses are given to {activePatient?.profile?.full_name}</p>

            {pendingDoses.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                All scheduled medication doses for today have been administered!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDoses.map(record => (
                  <div
                    key={record.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-sm text-slate-900">
                          {record.medication?.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {record.medication?.dosage}
                        </span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          Due: {new Date(record.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic">
                        {record.medication?.instructions || 'Standard administration.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRecordDose(record.id, 'taken')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Administer
                      </button>
                      <button
                        onClick={() => handleRecordDose(record.id, 'skipped')}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Add Clinical / Vitals Care Note */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card">
            <h3 className="font-bold text-sm text-navy-950 mb-1 flex items-center gap-2">
              <FilePlus className="w-4 h-4 text-teal-600" />
              <span>Record Clinical Care Note / Vitals</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Log morning blood pressure, blood glucose readings, or observations.
            </p>

            <form onSubmit={handleCreateCareNote} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={noteCategory}
                  onChange={e => setNoteCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="vitals">Vitals (BP, Glucose, Pulse)</option>
                  <option value="medical">Medical Observation</option>
                  <option value="diet">Diet & Nutrition</option>
                  <option value="general">General Note</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Note Title</label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="e.g. Morning Vitals: BP 122/78 mmHg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Details & Observations</label>
                <textarea
                  rows={4}
                  required
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Blood pressure: 122/78 mmHg. Fasting blood sugar: 110 mg/dL. Patient was vibrant and finished morning breakfast."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPriority}
                  onChange={e => setIsPriority(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="font-semibold text-rose-700">Flag as Clinical Priority</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Care Note</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <CareBuddyWidget patientId={selectedPatientId} />
    </div>
  );
};
