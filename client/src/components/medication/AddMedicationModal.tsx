import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { X, Plus, Trash2, Pill } from 'lucide-react';

interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMedicationAdded: () => void;
  patientId?: string;
}

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({
  isOpen,
  onClose,
  onMedicationAdded,
  patientId
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Blood Pressure');
  const [dosage, setDosage] = useState('1 Tablet');
  const [strength, setStrength] = useState('10mg');
  const [frequency, setFrequency] = useState('Once daily');
  const [timesOfDay, setTimesOfDay] = useState<string[]>(['08:00']);
  const [instructions, setInstructions] = useState('Take in the morning with water.');
  const [prescribingDoctor, setPrescribingDoctor] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [iconType, setIconType] = useState<'pill' | 'capsule' | 'liquid' | 'injection' | 'drops'>('pill');
  const [totalSupply, setTotalSupply] = useState(30);
  const [remainingSupply, setRemainingSupply] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddTime = () => {
    setTimesOfDay(prev => [...prev, '19:00']);
  };

  const handleRemoveTime = (index: number) => {
    if (timesOfDay.length > 1) {
      setTimesOfDay(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...timesOfDay];
    updated[index] = val;
    setTimesOfDay(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Medication name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.medications.create({
        patient_id: patientId,
        name: name.trim(),
        category,
        dosage: dosage.trim(),
        strength: strength.trim(),
        frequency,
        times_of_day: timesOfDay,
        instructions: instructions.trim(),
        prescribing_doctor: prescribingDoctor.trim(),
        pharmacy: pharmacy.trim(),
        icon_type: iconType,
        total_supply: Number(totalSupply),
        remaining_supply: Number(remainingSupply),
        is_active: true
      });
      onMedicationAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add medication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-med-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-800 rounded-2xl">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h2 id="modal-med-title" className="text-xl font-bold text-slate-900">
                {t.medications.addMedication}
              </h2>
              <p className="text-xs text-slate-500">Record a new prescription and dose schedule</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Medication Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Lisinopril"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              >
                <option value="Blood Pressure">Blood Pressure</option>
                <option value="Diabetes">Diabetes</option>
                <option value="Cholesterol">Cholesterol</option>
                <option value="Cardiac">Cardiac</option>
                <option value="Joint Health">Joint Health</option>
                <option value="Pain Relief">Pain Relief</option>
                <option value="Vitamin">Vitamin / Supplement</option>
                <option value="Respiratory">Respiratory</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dosage *</label>
              <input
                type="text"
                required
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                placeholder="e.g. 1 Tablet"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Strength</label>
              <input
                type="text"
                value={strength}
                onChange={e => setStrength(e.target.value)}
                placeholder="e.g. 10mg"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              >
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="As needed">As needed</option>
              </select>
            </div>
          </div>

          {/* Times of Day */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Scheduled Times of Day (24-Hour)</label>
              <button
                type="button"
                onClick={handleAddTime}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Time Slot
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {timesOfDay.map((time, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <input
                    type="time"
                    value={time}
                    onChange={e => handleTimeChange(idx, e.target.value)}
                    className="px-2 py-1 text-xs bg-transparent border-none focus:outline-none font-semibold text-slate-800"
                  />
                  {timesOfDay.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Instructions for Patient</label>
            <input
              type="text"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. Take with breakfast. Do not crush."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prescribing Doctor</label>
              <input
                type="text"
                value={prescribingDoctor}
                onChange={e => setPrescribingDoctor(e.target.value)}
                placeholder="Dr. Robert Mehta"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pharmacy</label>
              <input
                type="text"
                value={pharmacy}
                onChange={e => setPharmacy(e.target.value)}
                placeholder="CVS Pharmacy #4102"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Supply (Pills)</label>
              <input
                type="number"
                min="1"
                value={totalSupply}
                onChange={e => setTotalSupply(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Remaining Supply</label>
              <input
                type="number"
                min="0"
                value={remainingSupply}
                onChange={e => setRemainingSupply(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition"
            >
              {loading ? 'Saving...' : 'Save Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
