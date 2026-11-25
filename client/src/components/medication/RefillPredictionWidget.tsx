import React, { useEffect, useState } from 'react';
import { Check, RefreshCw, Send } from 'lucide-react';
import { api } from '../../services/api.js';
import type { RefillForecastItem } from '../../utils/refillPrediction.js';

type Forecast = RefillForecastItem & { shared_today: boolean };

export function RefillPredictionWidget({ patientId }: { patientId?: string }) {
  const [items, setItems] = useState<Forecast[]>([]);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    api.medications.getRefillForecast(patientId).then(result => {
      if (!current) return;
      setItems(result.forecast);
      setCanShare(result.can_share);
    }).catch(() => { if (current) setError('Supply estimates could not be loaded. Try refreshing.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [patientId, refresh]);

  async function share(id: string) {
    setBusy(id);
    setError('');
    try {
      await api.post(`/medications/${id}/refill-note`);
      setItems(previous => previous.map(item => item.medication_id === id ? { ...item, shared_today: true } : item));
    } catch {
      setError('Unable to share the refill note. Try again.');
    } finally {
      setBusy('');
    }
  }

  return (
    <section aria-labelledby="refill-title" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="refill-title" className="text-xl font-bold text-navy-950">Medication supply</h2>
          <p className="mt-1 text-sm text-slate-600">Estimates use the remaining doses and daily schedule. Share a refill follow-up in your care circle’s notes.</p>
        </div>
        <button aria-label="Refresh supply estimates" onClick={() => setRefresh(value => value + 1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-teal-800"><RefreshCw size={18} /></button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
      {loading ? <p role="status" className="mt-4 text-sm">Loading supply…</p> : (
        <ul className="mt-4 divide-y divide-slate-200">
          {items.map(item => (
            <li key={item.medication_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0 break-words">
                <p className="font-bold text-navy-950">{item.medication_name}</p>
                <p className="text-sm text-slate-600">{item.current_supply} doses left · {item.daily_consumption} scheduled per day</p>
                <p className={`text-sm font-semibold ${item.needs_urgent_refill ? 'text-amber-800' : 'text-teal-800'}`}>{item.days_remaining} full days of supply</p>
              </div>
              {canShare && <button disabled={Boolean(busy) || item.shared_today} onClick={() => share(item.medication_id)}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-teal-900 disabled:border-slate-200 disabled:bg-slate-50">
                {item.shared_today ? <Check size={16} /> : <Send size={16} />}
                {item.shared_today ? 'Shared today' : busy === item.medication_id ? 'Sharing…' : 'Share refill note'}
              </button>}
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && !items.length && <p className="mt-4 text-sm text-slate-600">No daily prescriptions to forecast.</p>}
    </section>
  );
}
