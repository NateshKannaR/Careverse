import React, { useState, useEffect } from 'react';
import { Flame, AlertCircle, Lightbulb, ShieldAlert, Sparkles, Volume2 } from 'lucide-react';
import { api } from '../../services/api';

import type { ClientAdherenceInsight } from '../../utils/adherenceInsights';

interface AdherenceInsightsCardProps {
  patientId?: string;
  doseRevision?: string;
  className?: string;
}

export const AdherenceInsightsCard: React.FC<AdherenceInsightsCardProps> = ({
  patientId,
  doseRevision,
  className = ''
}) => {
  const [insight, setInsight] = useState<ClientAdherenceInsight | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState(false);
  const [speaking, setSpeaking] = useState<boolean>(false);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError(false);
    api.analytics.getAdherencePatterns(patientId, controller.signal)
      .then(({ insight: nextInsight }) => {
        if (current) setInsight(nextInsight);
      })
      .catch(() => {
        if (current) setError(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [patientId, doseRevision]);

  const handleSpeakSuggestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse ${className}`}>
        <div className="h-5 w-44 bg-slate-800 rounded mb-4"></div>
        <div className="h-20 bg-slate-800/60 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className={`p-6 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-200 ${className}`}>
        Could not load adherence records.
      </p>
    );
  }

  if (!insight || !insight.has_data) {
    return (
      <div className={`p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center py-8 ${className}`}>
        <p className="text-sm font-semibold text-slate-300">No Adherence Data Yet</p>
        <p className="text-xs text-slate-500 mt-1">Log dose outcomes to see adherence and recurring patterns.</p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5 ${className}`}>
      {/* Header with KPI highlights */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Adherence insights</span>
          </h3>
          <p className="text-xs text-slate-400">Dose times in {insight.time_zone}</p>
        </div>

        {/* Streak Counter Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-black tracking-wide">{insight.streak_days} Day Streak</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-center">
          <p className="text-xs text-slate-400">7-Day Adherence</p>
          <p className="text-xl font-bold text-teal-400 mt-1">
            {insight.weekly_adherence_rate == null ? 'No outcomes' : `${insight.weekly_adherence_rate}%`}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-center">
          <p className="text-xs text-slate-400">Doses Taken</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {insight.total_taken_week} <span className="text-xs text-slate-500 font-normal">/ {insight.total_scheduled_week}</span>
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-center">
          <p className="text-xs text-slate-400">Missed or Skipped</p>
          <p className={`text-xl font-bold mt-1 ${insight.total_missed_week > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {insight.total_missed_week}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Adherence uses recorded outcomes.
        {insight.total_pending_week > 0 && ` ${insight.total_pending_week} due without an outcome.`}
      </p>

      {/* Detected Patterns */}
      {insight.patterns.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Recurring missed or skipped doses</span>
          </h4>

          {insight.patterns.map((pat, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  {pat.slot_name} Slot ({pat.time_window})
                </span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {pat.missed_count} of {pat.total_scheduled} recorded missed or skipped ({pat.missed_percentage}%)
                </span>
              </div>

              <div className="flex items-start space-x-2 text-xs text-slate-200">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{pat.suggestion}</p>
              </div>

              <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  <span>Habit Cue Recommendation</span>
                </span>
                <button
                  onClick={() => handleSpeakSuggestion(pat.suggestion)}
                  disabled={speaking}
                  className="py-1 px-2.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-semibold transition flex items-center space-x-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read Aloud</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No recurring pattern found in the recorded outcomes.</p>
      )}

      {/* Mandatory Non-Medical Disclaimer */}
      <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40 flex items-start space-x-2 text-[11px] text-slate-400 leading-relaxed">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <p>{insight.disclaimer}</p>
      </div>
    </div>
  );
};
