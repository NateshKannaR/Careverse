import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useA11y } from '../context/A11yContext.js';
import { api } from '../services/api.js';
import {
  Settings,
  Bell,
  Globe,
  Eye,
  Type,
  Shield,
  Send,
  CheckCircle2,
  Save
} from 'lucide-react';
import { Language } from '../i18n/index.js';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { largeText, toggleLargeText, highContrast, toggleHighContrast } = useA11y();

  const [preferences, setPreferences] = useState({
    email_enabled: true,
    upcoming_dose_minutes: 15,
    missed_dose_grace_minutes: 30,
    appointment_reminders_enabled: true,
    caregiver_escalation_enabled: true,
    daily_digest_enabled: true
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    api.notifications.getPreferences().then(res => {
      if (res.preferences) {
        setPreferences(res.preferences);
      }
    }).catch(console.error);
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.notifications.updatePreferences(preferences);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update preferences');
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await api.notifications.testSend();
      setTestResult(`Test notification processed: ${res.result.message}`);
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-black text-navy-950 flex items-center gap-2.5">
          <Settings className="w-8 h-8 text-teal-600" />
          <span>Account & Notification Settings</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure communication intervals, accessibility preferences, and languages
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Your notification preferences have been saved successfully.</span>
        </div>
      )}

      {/* Reminder Engine Configuration */}
      <form onSubmit={handleSavePreferences} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-teal-100 text-teal-800 rounded-2xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-950">Smart Reminder Schedule Settings</h2>
            <p className="text-xs text-slate-500">Configure automated background notification intervals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Advance Dose Reminder (Minutes before scheduled time)
            </label>
            <select
              value={preferences.upcoming_dose_minutes}
              onChange={e => setPreferences({ ...preferences, upcoming_dose_minutes: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-teal-600 focus:outline-none"
            >
              <option value={10}>10 Minutes Before</option>
              <option value={15}>15 Minutes Before (Recommended)</option>
              <option value={30}>30 Minutes Before</option>
              <option value={45}>45 Minutes Before</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Missed Dose Grace Period (Before marking missed & escalating)
            </label>
            <select
              value={preferences.missed_dose_grace_minutes}
              onChange={e => setPreferences({ ...preferences, missed_dose_grace_minutes: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-teal-600 focus:outline-none"
            >
              <option value={20}>20 Minutes Grace Period</option>
              <option value={30}>30 Minutes Grace Period (Recommended)</option>
              <option value={45}>45 Minutes Grace Period</option>
              <option value={60}>60 Minutes Grace Period</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer text-xs sm:text-sm">
            <div>
              <span className="font-bold text-slate-900 block">Email Reminders Active</span>
              <span className="text-slate-500 text-xs">Receive dosage and appointment emails</span>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_enabled}
              onChange={e => setPreferences({ ...preferences, email_enabled: e.target.checked })}
              className="rounded text-teal-600 focus:ring-teal-500 w-5 h-5"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer text-xs sm:text-sm">
            <div>
              <span className="font-bold text-slate-900 block">Caregiver Escalation</span>
              <span className="text-slate-500 text-xs">Alert authorized Care Circle members when a dose is missed</span>
            </div>
            <input
              type="checkbox"
              checked={preferences.caregiver_escalation_enabled}
              onChange={e => setPreferences({ ...preferences, caregiver_escalation_enabled: e.target.checked })}
              className="rounded text-teal-600 focus:ring-teal-500 w-5 h-5"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer text-xs sm:text-sm">
            <div>
              <span className="font-bold text-slate-900 block">Appointment Reminders (24h & 2h)</span>
              <span className="text-slate-500 text-xs">Receive timely notices before doctor visits</span>
            </div>
            <input
              type="checkbox"
              checked={preferences.appointment_reminders_enabled}
              onChange={e => setPreferences({ ...preferences, appointment_reminders_enabled: e.target.checked })}
              className="rounded text-teal-600 focus:ring-teal-500 w-5 h-5"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer text-xs sm:text-sm">
            <div>
              <span className="font-bold text-slate-900 block">Daily Family Care Digest</span>
              <span className="text-slate-500 text-xs">Summarize daily routine achievements for connected family members</span>
            </div>
            <input
              type="checkbox"
              checked={preferences.daily_digest_enabled}
              onChange={e => setPreferences({ ...preferences, daily_digest_enabled: e.target.checked })}
              className="rounded text-teal-600 focus:ring-teal-500 w-5 h-5"
            />
          </label>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testingEmail ? 'Sending Test...' : 'Send Test Notification'}</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>

        {testResult && (
          <p className="text-xs text-teal-800 font-semibold bg-teal-50 p-2.5 rounded-xl border border-teal-200">
            {testResult}
          </p>
        )}
      </form>

      {/* Accessibility & Language Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-sky-100 text-sky-800 rounded-2xl">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-950">Accessibility & Language Preferences</h2>
            <p className="text-xs text-slate-500">WCAG 2.2 AA compliant options for comfortable readability</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                <Globe className="w-4 h-4 text-teal-600" />
                <span>Primary Language</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Instant translation of dashboard</p>
            </div>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="en">English (US)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                <Type className="w-4 h-4 text-teal-600" />
                <span>Large Text Scaling</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">+25% magnification for seniors</p>
            </div>
            <button
              onClick={toggleLargeText}
              className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                largeText ? 'bg-teal-700 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {largeText ? 'Large Text Enabled' : 'Enable Large Text'}
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                <Eye className="w-4 h-4 text-teal-600" />
                <span>High Contrast Mode</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Crisp dark borders and deep text</p>
            </div>
            <button
              onClick={toggleHighContrast}
              className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                highContrast ? 'bg-navy-950 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {highContrast ? 'High Contrast Enabled' : 'Enable High Contrast'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
