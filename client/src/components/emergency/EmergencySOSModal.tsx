import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useA11y } from '../../context/A11yContext.js';
import { AlertTriangle, PhoneCall, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
}

export const EmergencySOSModal: React.FC<EmergencySOSModalProps> = ({ isOpen, onClose, patientId }) => {
  const { t } = useLanguage();
  const { speakAnnouncement } = useA11y();
  const [isTriggered, setIsTriggered] = useState(false);
  const [delivery, setDelivery] = useState({ sent: 0, simulated: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setIsTriggered(false);
      setContacts([]);
      api.emergency.getContacts(patientId).then(res => {
        if (res.contacts) setContacts(res.contacts);
      }).catch(console.error);
    }
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const handleConfirmSOS = async () => {
    setLoading(true);
    try {
      const result = await api.emergency.triggerSos(patientId);
      setDelivery(result.delivery);
      speakAnnouncement('SOS activation recorded. Review the delivery status.');
      setIsTriggered(true);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger SOS alert');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSOS = async () => {
    try {
      await api.emergency.cancelSos(patientId);
      speakAnnouncement('Emergency alert marked as cancelled.');
      setIsTriggered(false);
      onClose();
    } catch (err: any) {
      alert('The cancellation could not be recorded. Try again.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-dialog-title"
      className="care-overlay animate-fade-in"
    >
      <div className="care-dialog relative max-w-lg rounded-2xl border-2 border-rose-500 bg-white p-4 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 min-h-11 min-w-11 p-2 text-slate-600 sm:top-4 sm:right-4 hover:text-slate-700 rounded-full"
          aria-label="Close dialog"
        >
          <X className="w-6 h-6" />
        </button>

        {!isTriggered ? (
          <div>
            <div className="flex items-start gap-3 pr-9 text-rose-600 mb-4">
              <div className="shrink-0 rounded-xl bg-rose-100 p-2.5">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h2 id="emergency-dialog-title" className="text-lg font-bold text-slate-900 sm:text-2xl">
                  {t.emergency.confirmTitle}
                </h2>
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                  Care Circle Rapid Response
                </p>
              </div>
            </div>

            <p className="text-slate-700 text-sm sm:text-base leading-relaxed mb-6">
              {t.emergency.confirmMessage}
            </p>

            {/* Direct dial callout */}
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 mb-6">
              <p className="text-xs font-bold text-rose-900 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                For Life-Threatening Medical Emergencies:
              </p>
              <p className="text-xs text-rose-800 leading-normal">
                Immediately call local emergency medical dispatch:{' '}
                <strong className="underline text-sm font-black">911</strong> (US/Canada),{' '}
                <strong className="underline text-sm font-black">112</strong> (Europe/India), or{' '}
                <strong className="underline text-sm font-black">999</strong> (UK).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['911', '112', '999'].map(number => <a key={number}
                  href={'tel:' + number}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow hover:bg-rose-700 transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call {number}
                </a>)}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirmSOS}
                disabled={loading}
                className="flex-1 py-3.5 px-6 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl shadow-lg transition-all text-center flex items-center justify-center gap-2"
              >
                {loading ? 'Alerting...' : 'Yes, Send SOS Alert to Care Circle'}
              </button>
              <button
                onClick={onClose}
                className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              SOS activation recorded
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Care Circle email status · {delivery.sent} accepted by provider · {delivery.simulated} simulated · {delivery.failed} failed · {delivery.pending} pending.
            </p>

            {contacts.length > 0 && (
              <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Contacts you can call</h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {contacts.map((c, idx) => (
                    <li key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-none">
                      <span className="font-semibold">{c.name} ({c.relationship})</span>
                      <a href={`tel:${c.phone_number}`} className="text-teal-700 font-bold hover:underline flex items-center gap-1">
                        <PhoneCall className="w-3 h-3" /> {c.phone_number}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleCancelSOS}
              className="w-full py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl transition"
            >
              {t.emergency.cancelActivation}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
