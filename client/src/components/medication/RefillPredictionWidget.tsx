import React, { useState, useEffect } from 'react';
import { Pill, AlertCircle, Calendar, RefreshCw, CheckCircle2, TrendingDown } from 'lucide-react';
import { api } from '../../services/api';

interface RefillForecastItem {
  medication_id: string;
  medication_name: string;
  current_supply: number;
  daily_consumption: number;
  days_remaining: number;
  predicted_runout_date: string;
  is_low_stock: boolean;
  needs_urgent_refill: boolean;
}

interface RefillPredictionWidgetProps {
  patientId?: string;
  className?: string;
}

export const RefillPredictionWidget: React.FC<RefillPredictionWidgetProps> = ({
  patientId,
  className = ''
}) => {
  const [forecasts, setForecasts] = useState<RefillForecastItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [requestedRefills, setRequestedRefills] = useState<Set<string>>(new Set());

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/medications/refills/forecast${patientId ? `?patient_id=${patientId}` : ''}`);
      setForecasts(res.data.forecast || []);
    } catch (err) {
      console.error('Failed to load refill forecasts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, [patientId]);

  const handleRequestRefill = (medicationId: string, medName: string) => {
    setRequestedRefills((prev) => new Set(prev).add(medicationId));
    // Simulated audit & alert dispatch
    alert(`Refill request for ${medName} sent to pharmacy and care circle!`);
  };

  if (loading) {
    return (
      <div className={`p-5 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse ${className}`}>
        <div className="h-5 w-40 bg-slate-800 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-slate-800/60 rounded-xl"></div>
          <div className="h-16 bg-slate-800/60 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (forecasts.length === 0) return null;

  const urgentCount = forecasts.filter((f) => f.needs_urgent_refill).length;

  return (
    <div className={`p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Days-to-Depletion Refill Forecast</span>
              {urgentCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {urgentCount} Urgent
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Predictive stock exhaustion based on daily dosage frequency</p>
          </div>
        </div>

        <button
          onClick={fetchForecasts}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Refresh forecast"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Medication Refill Cards */}
      <div className="space-y-3">
        {forecasts.map((item) => {
          const isRequested = requestedRefills.has(item.medication_id);
          const stockPercent = Math.min(100, Math.round((item.current_supply / 30) * 100));

          return (
            <div
              key={item.medication_id}
              className={`p-4 rounded-xl border transition ${
                item.needs_urgent_refill
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : item.is_low_stock
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-slate-800/40 border-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>{item.medication_name}</span>
                    {item.needs_urgent_refill && (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Refill Soon</span>
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {item.current_supply} units remaining • Consuming {item.daily_consumption}/day
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg ${
                      item.needs_urgent_refill
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : item.is_low_stock
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {item.days_remaining} {item.days_remaining === 1 ? 'day' : 'days'} left
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-end space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Run-out: {item.predicted_runout_date}</span>
                  </p>
                </div>
              </div>

              {/* Depletion Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.needs_urgent_refill
                      ? 'bg-rose-500'
                      : item.is_low_stock
                      ? 'bg-amber-500'
                      : 'bg-teal-500'
                  }`}
                  style={{ width: `${stockPercent}%` }}
                ></div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 flex items-center space-x-1">
                  <TrendingDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>Depletes {item.daily_consumption} dose/day</span>
                </span>

                <button
                  onClick={() => handleRequestRefill(item.medication_id, item.medication_name)}
                  disabled={isRequested}
                  className={`py-1 px-3 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
                    isRequested
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {isRequested ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Refill Requested</span>
                    </>
                  ) : (
                    <span>Request Refill</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
