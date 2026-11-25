import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useA11y } from '../../context/A11yContext.js';
import { X, Smile, Heart, CheckCircle2 } from 'lucide-react';
import type { WellbeingCheckin } from '../../types/index.js';
import confetti from 'canvas-confetti';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckInSaved: () => void;
  patientId?: string;
  checkin: WellbeingCheckin | null;
}

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  isOpen,
  onClose,
  onCheckInSaved,
  patientId, checkin
}) => {
  const { t } = useLanguage();
  const { speakAnnouncement, reducedMotion } = useA11y();

  const [mood, setMood] = useState<WellbeingCheckin['mood'] | null>(checkin?.mood ?? null);
  const [energyLevel, setEnergyLevel] = useState<number>(checkin?.energy_level ?? 3);
  const [painLevel, setPainLevel] = useState<number>(checkin?.pain_level ?? 0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(checkin?.symptoms ?? []);
  const [notes, setNotes] = useState(checkin?.notes ?? '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const moods = [
    { key: 'great', label: 'Great', emoji: '😄', color: 'bg-emerald-100 border-emerald-300 text-emerald-900' },
    { key: 'good', label: 'Good', emoji: '🙂', color: 'bg-teal-100 border-teal-300 text-teal-900' },
    { key: 'okay', label: 'Okay', emoji: '😐', color: 'bg-amber-100 border-amber-300 text-amber-900' },
    { key: 'tired', label: 'Tired', emoji: '🥱', color: 'bg-slate-100 border-slate-300 text-slate-800' },
    { key: 'unwell', label: 'Unwell', emoji: '🤒', color: 'bg-rose-100 border-rose-300 text-rose-900' }
  ];

  const commonSymptoms = [
    'Joint Stiffness',
    'Mild Headache',
    'Dizziness',
    'Fatigue',
    'Nausea',
    'Back Discomfort',
    'Swelling in Feet'
  ];

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood) return;
    setLoading(true);
    try {
      await api.wellbeing.record({
        patient_id: patientId,
        mood,
        energy_level: energyLevel,
        pain_level: painLevel,
        symptoms: selectedSymptoms,
        notes: notes.trim()
      });

      if (!reducedMotion) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
      speakAnnouncement('Daily wellbeing check-in successfully recorded!');
      onCheckInSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to record wellbeing checkin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wellbeing-modal-title"
      className="care-overlay"
    >
      <div className="care-dialog bg-white rounded-2xl max-w-lg p-4 sm:p-8 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-200 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-800 rounded-2xl">
              <Heart className="w-6 h-6 fill-teal-600 text-teal-600" />
            </div>
            <div>
              <h2 id="wellbeing-modal-title" className="text-xl font-bold text-slate-900">
                {t.wellbeing.title}
              </h2>
              <p className="text-xs text-slate-500">{t.wellbeing.howAreYouFeeling}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="min-h-11 min-w-11 shrink-0 p-2 text-slate-600 hover:text-slate-700 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mood Selector with accessible touch targets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">{t.wellbeing.mood}</label>
            <div className="grid grid-cols-3 gap-2 min-[450px]:grid-cols-5">
              {moods.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMood(m.key as any)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition ${
                    mood === m.key
                      ? `${m.color} ring-2 ring-teal-600 scale-105 shadow-sm`
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-600'
                  }`}
                  aria-pressed={mood === m.key}
                >
                  <span className="text-2xl mb-1">{m.emoji}</span>
                  <span className="text-[11px] font-bold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="wellbeing-energy" className="text-xs font-bold text-slate-700">{t.wellbeing.energyLevel}</label>
              <span className="text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {energyLevel} / 5
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              id="wellbeing-energy"
              value={energyLevel}
              onChange={e => setEnergyLevel(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Low Energy</span>
              <span>Moderate</span>
              <span>High Energy</span>
            </div>
          </div>

          {/* Pain Scale Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="wellbeing-pain" className="text-xs font-bold text-slate-700">{t.wellbeing.painLevel}</label>
              <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${
                painLevel === 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                painLevel <= 3 ? 'bg-teal-50 text-teal-800 border-teal-200' :
                painLevel <= 6 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {painLevel} / 10
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              id="wellbeing-pain"
              value={painLevel}
              onChange={e => setPainLevel(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0 (No pain)</span>
              <span>5 (Moderate)</span>
              <span>10 (Severe pain)</span>
            </div>
          </div>

          {/* Common Symptoms Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">{t.wellbeing.symptoms}</label>
            <div className="flex flex-wrap gap-1.5">
              {commonSymptoms.map((sym) => {
                const isSelected = selectedSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleSymptom(sym)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="checkin-notes" className="block text-xs font-bold text-slate-700 mb-1">{t.wellbeing.notes}</label>
            <textarea id="checkin-notes"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Took a pleasant 20-minute walk in the garden. Drank plenty of water."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
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
              disabled={loading || !mood}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Saving...' : t.wellbeing.recordCheckin}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
