import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Mail, CheckCircle2, Clock, Send, X, ExternalLink, RefreshCw } from 'lucide-react';

interface NotificationSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSimulatorModal: React.FC<NotificationSimulatorModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [provider, setProvider] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const fetchSimulatorLogs = async () => {
    setLoading(true);
    try {
      const data = await api.notifications.getSimulatorLogs();
      setLogs(data.notifications || []);
      setProvider(data.provider || 'Simulator');
      if (data.notifications && data.notifications.length > 0 && !selectedNotification) {
        setSelectedNotification(data.notifications[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSimulatorLogs();
    }
  }, [isOpen]);

  const handleSendTestNotification = async () => {
    setSendingTest(true);
    try {
      await api.notifications.testSend();
      await fetchSimulatorLogs();
    } catch (err: any) {
      alert(err.message || 'Error dispatching test notification');
    } finally {
      setSendingTest(false);
    }
  };

  const handleTriggerSpecificReminder = async (type: string) => {
    setSendingTest(true);
    try {
      await api.post('/audit/trigger-reminder', { type });
      await fetchSimulatorLogs();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Error triggering reminder');
    } finally {
      setSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulator-title"
      className="care-overlay"
    >
      <div className="care-dialog max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 id="simulator-title" className="text-lg font-bold text-slate-900">
                Healthcare Notification Simulator & Delivery Logs
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>Active Provider:</span>
                <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {provider}
                </span>
                <span>• {logs.length} Total Dispatched</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSimulatorLogs}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Evaluator Interactive Trigger Toolbar */}
        <div className="p-3 bg-teal-950/90 border-b border-teal-800/50 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-teal-300 flex items-center gap-1.5 mr-2">
            <span>⚡ Evaluator Live Triggers:</span>
          </span>
          <button
            onClick={() => handleTriggerSpecificReminder('upcoming_dose_15m')}
            disabled={sendingTest}
            className="px-2.5 py-1 rounded-lg bg-teal-600/40 hover:bg-teal-600 text-teal-200 border border-teal-500/40 font-semibold transition disabled:opacity-50"
          >
            Upcoming Dose (-15m)
          </button>
          <button
            onClick={() => handleTriggerSpecificReminder('missed_dose_15m')}
            disabled={sendingTest}
            className="px-2.5 py-1 rounded-lg bg-amber-600/40 hover:bg-amber-600 text-amber-200 border border-amber-500/40 font-semibold transition disabled:opacity-50"
          >
            Stage 1 Overdue (+15m)
          </button>
          <button
            onClick={() => handleTriggerSpecificReminder('missed_dose_60m')}
            disabled={sendingTest}
            className="px-2.5 py-1 rounded-lg bg-rose-600/40 hover:bg-rose-600 text-rose-200 border border-rose-500/40 font-semibold transition disabled:opacity-50"
          >
            Stage 2 Urgent (+60m)
          </button>
          <button
            onClick={() => handleTriggerSpecificReminder('appointment_24h')}
            disabled={sendingTest}
            className="px-2.5 py-1 rounded-lg bg-blue-600/40 hover:bg-blue-600 text-blue-200 border border-blue-500/40 font-semibold transition disabled:opacity-50"
          >
            Appt Reminder (24h)
          </button>
          <button
            onClick={() => handleTriggerSpecificReminder('refill_alert')}
            disabled={sendingTest}
            className="px-2.5 py-1 rounded-lg bg-purple-600/40 hover:bg-purple-600 text-purple-200 border border-purple-500/40 font-semibold transition disabled:opacity-50"
          >
            Refill Alert
          </button>
        </div>

        {/* Content split pane */}
        <div className="flex min-w-0 flex-col md:flex-row">
          {/* List of dispatched notifications */}
          <div className="max-h-56 w-full md:max-h-[30rem] md:w-5/12 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No notifications dispatched yet.
              </div>
            ) : (
              logs.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedNotification(item)}
                  className={`p-3 rounded-2xl cursor-pointer border text-left transition ${
                    selectedNotification?.id === item.id
                      ? 'bg-white border-teal-500 shadow-sm ring-1 ring-teal-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {item.type.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'simulated'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 truncate mb-1">
                    {item.title}
                  </h4>
                  <div className="text-[11px] text-slate-500 flex justify-between items-center">
                    <span>To: {item.recipient?.full_name || 'User'}</span>
                    <span className="text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at || item.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detailed Email Preview */}
          <div className="flex flex-1 min-w-0 flex-col p-3 sm:p-5 bg-white">
            {selectedNotification ? (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedNotification.title}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {new Date(selectedNotification.created_at || selectedNotification.scheduled_for).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Recipient: <strong className="text-slate-800">{selectedNotification.recipient?.email || selectedNotification.recipient_id}</strong> ({selectedNotification.recipient?.full_name || 'User'})
                  </p>
                </div>

                {/* HTML rendering container */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 shadow-inner overflow-hidden">
                  <div className="text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1 flex justify-between">
                    <span>Rendered Email Preview</span>
                    <span>Provider: {selectedNotification.metadata?.simulated ? 'Dev Simulator' : 'Resend'}</span>
                  </div>

                  {selectedNotification.metadata?.htmlPreview ? (
                    <div
                      className="email-html-body"
                      dangerouslySetInnerHTML={{ __html: selectedNotification.metadata.htmlPreview }}
                    />
                  ) : (
                    <div className="p-4 bg-white rounded-xl text-xs text-slate-700 whitespace-pre-wrap">
                      {selectedNotification.message}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Select a notification from the list to preview content.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
