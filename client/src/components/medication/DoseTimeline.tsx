import React, { useState } from 'react';
import { MedicationAdministrationRecord } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useA11y } from '../../context/A11yContext.js';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ShieldAlert,
  Pill,
  Droplet,
  Info
} from 'lucide-react';

interface DoseTimelineProps {
  records: MedicationAdministrationRecord[];
  onDoseUpdated: () => void;
  canManageMeds?: boolean;
}

export const DoseTimeline: React.FC<DoseTimelineProps> = ({
  records,
  onDoseUpdated,
  canManageMeds = true
}) => {
  const { t } = useLanguage();
  const { speakAnnouncement } = useA11y();
  const [loadingDoseId, setLoadingDoseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRecordDose = async (doseId: string, status: 'taken' | 'skipped', medName: string) => {
    setLoadingDoseId(doseId);
    setErrorMessage(null);
    try {
      await api.medications.recordDose(doseId, status);
      speakAnnouncement(`Dose of ${medName} marked as ${status}.`);
      onDoseUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating dose status');
    } finally {
      setLoadingDoseId(null);
    }
  };

  const getStatusBadge = (status: MedicationAdministrationRecord['status']) => {
    switch (status) {
      case 'taken':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            {t.common.taken}
          </span>
        );
      case 'due_now':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            {t.common.dueNow}
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded-full border border-sky-300">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            {t.common.upcoming}
          </span>
        );
      case 'missed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            {t.common.missed}
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full border border-slate-300">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            {t.common.skipped}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Strict Medical Safety Notice Banner */}
      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/90 flex items-start gap-2.5 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">{t.common.safetyNotice}:</strong> {t.medications.safetyWarning}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 text-slate-500 text-sm">
          No medication doses scheduled for today.
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const med = record.medication;
            const scheduledDate = new Date(record.scheduled_time);
            const timeString = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isTaken = record.status === 'taken';
            const isDueOrUpcoming = record.status === 'due_now' || record.status === 'upcoming';
            const isMissed = record.status === 'missed';

            return (
              <div
                key={record.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                  isTaken
                    ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                    : isDueOrUpcoming
                    ? 'bg-white border-teal-300 shadow-card ring-1 ring-teal-500/20'
                    : isMissed
                    ? 'bg-rose-50/30 border-rose-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex min-w-0 flex-col justify-between gap-3 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 items-start gap-2.5 sm:gap-3.5">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                        isTaken
                          ? 'bg-emerald-600 text-white'
                          : isDueOrUpcoming
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Pill className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 break-words">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-black text-slate-900">
                          {med?.name || 'Prescribed Medicine'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {med?.dosage} {med?.strength ? `(${med.strength})` : ''}
                        </span>
                        {getStatusBadge(record.status)}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold text-teal-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Scheduled: {timeString}
                        </span>
                        {record.actual_time && (
                          <span className="text-emerald-700">
                            • Taken at: {new Date(record.actual_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {med?.category && (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {med.category}
                          </span>
                        )}
                      </div>

                      {med?.instructions && (
                        <p className="text-xs text-slate-500 italic mt-1.5 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                          {med.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Dose Action Buttons */}
                  {canManageMeds && (
                    <div className="flex min-w-0 flex-wrap items-center gap-2 xl:shrink-0">
                      {!isTaken ? (
                        <>
                          <button
                            onClick={() => handleRecordDose(record.id, 'taken', med?.name || 'Medicine')}
                            disabled={loadingDoseId === record.id}
                            className="min-h-11 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>{loadingDoseId === record.id ? 'Saving...' : t.medications.markTaken}</span>
                          </button>
                          <button
                            onClick={() => handleRecordDose(record.id, 'skipped', med?.name || 'Medicine')}
                            disabled={loadingDoseId === record.id}
                            className="min-h-11 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                          >
                            {t.medications.markSkipped}
                          </button>
                        </>
                      ) : (
                        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100/60 px-3 py-1.5 rounded-xl">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Logged by {record.recorded_by_user?.full_name || 'Patient'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
