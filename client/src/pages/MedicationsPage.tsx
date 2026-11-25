import { useSearchParams } from 'react-router-dom';
import { RefillPredictionWidget } from '../components/medication/RefillPredictionWidget.js';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { api } from '../services/api.js';
import { AddMedicationModal } from '../components/medication/AddMedicationModal.js';
import { DoseTimeline } from '../components/medication/DoseTimeline.js';
import { CareBuddyWidget } from '../components/carebuddy/CareBuddyWidget.js';
import {
  Pill,
  Plus,
  Search,
  Pause,
  Play,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';

export const MedicationsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [doseTimeZone, setDoseTimeZone] = useState<string>();

  const [params, setParams] = useSearchParams();
  const activeTab = params.get('view') || 'timeline';
  const setActiveTab = (view: string) => setParams(view === 'timeline' ? {} : { view });
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState('');
  const [medications, setMedications] = useState<any[]>([]);
  const [todayDoses, setTodayDoses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMedications = async () => {
    setError('');
    try {
      const [medsRes, dosesRes] = await Promise.all([
        api.medications.getAll(user?.patient_id),
        api.medications.getTodayDoses(user?.patient_id)
      ]);
      setCanManage(medsRes.can_manage);
      setMedications(medsRes.medications || []);
      if (dosesRes) {
        setTodayDoses(dosesRes.records || []);
        setDoseTimeZone(dosesRes.time_zone);
      }
    } catch (err) {
      setError('Unable to load prescriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [user]);

  const handleTogglePause = async (id: string) => {
    try {
      await api.medications.togglePause(id);
      fetchMedications();
    } catch (err: any) {
      alert(err.message || 'Error updating medication');
    }
  };

  const handleDeleteMedication = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from active prescriptions?`)) {
      try {
        await api.medications.delete(id);
        fetchMedications();
      } catch (err: any) {
        alert(err.message || 'Failed to delete medication');
      }
    }
  };

  const lowSupplyMeds = medications.filter(m => m.is_active && m.remaining_supply !== undefined && m.remaining_supply <= 5);

  const filteredMeds = medications.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase()) ||
      (m.prescribing_doctor && m.prescribing_doctor.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set(medications.map(m => m.category)))];

  return (
    <div className="care-page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-950 flex items-center gap-2.5">
            <Pill className="w-8 h-8 text-teal-600" />
            <span>{t.medications.title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.medications.subtitle}</p>
        </div>

        {canManage && <button
          onClick={() => setAddModalOpen(true)}
          className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.medications.addMedication}</span>
        </button>}
      </div>

      {/* Refill Intelligence Warning Banner (if low supply) */}
      {activeTab !== 'supply' && lowSupplyMeds.length > 0 && (
        <div className="p-4 sm:p-5 bg-amber-50 border-2 border-amber-300 rounded-3xl text-xs text-amber-900 shadow-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-amber-950 mb-1">
              Medication Refill Alert ({lowSupplyMeds.length} Prescriptions Running Low)
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowSupplyMeds.map(m => (
                <span key={m.id} className="bg-white px-3 py-1 rounded-full font-bold text-amber-800 border border-amber-200">
                  {m.name}: only {m.remaining_supply} doses left (Pharmacy: {m.pharmacy || 'Contact clinic'})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Toggle Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 sm:flex sm:items-center sm:gap-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`min-h-11 min-w-0 px-2 py-2 text-left text-sm font-bold border-b-2 transition flex items-center gap-2 sm:px-4 ${
            activeTab === 'timeline'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock aria-hidden="true" className="w-4 h-4 shrink-0" />
          <span className="min-w-0 break-words">{t.medications.dailySchedule}</span>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`min-h-11 min-w-0 px-2 py-2 text-left text-sm font-bold border-b-2 transition flex items-center gap-2 sm:px-4 ${
            activeTab === 'all'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers aria-hidden="true" className="w-4 h-4 shrink-0" />
          <span className="min-w-0 break-words">{t.medications.allPrescriptions} ({medications.length})</span>
        </button>
        <button type="button" aria-pressed={activeTab === 'supply'} onClick={() => setActiveTab('supply')}
          className={`min-h-11 px-3 text-sm font-bold border-b-2 ${activeTab === 'supply' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-600'}`}>Medication supply</button>
      </div>

      {error && <p role="alert">{error} <button onClick={fetchMedications} className="font-bold underline">Retry</button></p>}
      {activeTab === 'supply' ? <RefillPredictionWidget patientId={user?.patient_id} /> : loading ? <p role="status">Loading prescriptions…</p> : error ? null : activeTab !== 'all' ? (
        <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-card">
          <DoseTimeline records={todayDoses} onDoseUpdated={fetchMedications} canManageMeds={canManage} timeZone={doseTimeZone} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search and Category Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search medications or doctors..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 sm:min-w-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    categoryFilter === cat
                      ? 'bg-teal-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {!filteredMeds.length && <p role="status" className="text-sm text-slate-600">No prescriptions match this view.</p>}
          {/* Prescriptions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMeds.map(med => (
              <div
                key={med.id}
                className={`p-6 rounded-3xl border bg-white shadow-card transition-all ${
                  !med.is_active ? 'opacity-70 border-slate-200 bg-slate-50/50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-navy-950 leading-tight">
                        {med.name}
                      </h3>
                      <span className="text-xs font-semibold text-slate-500">
                        {med.dosage} {med.strength ? `(${med.strength})` : ''}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    med.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {med.is_active ? t.common.active : t.common.paused}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Times Scheduled:</span>
                    <span className="font-bold text-slate-800">{med.times_of_day?.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Frequency:</span>
                    <span className="font-bold text-slate-800">{med.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remaining Supply:</span>
                    <span className={`font-bold ${med.remaining_supply <= 5 ? 'text-rose-700 font-black' : 'text-slate-800'}`}>
                      {med.remaining_supply || 0} doses left
                    </span>
                  </div>
                  {med.prescribing_doctor && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Doctor:</span>
                      <span className="font-medium text-slate-800">{med.prescribing_doctor}</span>
                    </div>
                  )}
                  {med.pharmacy && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pharmacy:</span>
                      <span className="font-medium text-slate-800">{med.pharmacy}</span>
                    </div>
                  )}
                </div>

                {med.instructions && (
                  <p className="text-xs text-slate-600 italic mb-4">
                    "{med.instructions}"
                  </p>
                )}

                {canManage && <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleTogglePause(med.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-teal-700 transition"
                  >
                    {med.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{med.is_active ? 'Pause Medication' : 'Resume Medication'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteMedication(med.id, med.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    title="Delete medication"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {addModalOpen && <AddMedicationModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onMedicationAdded={fetchMedications}
        patientId={user?.patient_id}
      />}

      <CareBuddyWidget patientId={user?.patient_id} />
    </div>
  );
};
