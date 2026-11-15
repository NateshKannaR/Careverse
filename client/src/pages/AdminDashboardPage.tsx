import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  ShieldCheck,
  Server,
  Activity,
  Users,
  Bell,
  Database,
  RefreshCw,
  FileText
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes, logsRes] = await Promise.all([
        api.system.getStats(),
        api.system.getHealth(),
        api.audit.getLogs()
      ]);
      setStats(statsRes);
      setHealth(healthRes);
      setAuditLogs(logsRes.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Platform Administrative Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            System Administration & Health Monitor
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time platform metrics, notification delivery queues, and operational audit logs.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* System Health Overview Cards */}
      {health && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
            <span className="text-xs font-bold text-slate-500 block mb-1">System Status</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xl font-black text-navy-950 capitalize">{health.status}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Uptime: {health.uptimeSeconds}s</span>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
            <span className="text-xs font-bold text-slate-500 block mb-1">Active Accounts</span>
            <span className="text-xl font-black text-navy-950 block">{stats.users?.total || 0}</span>
            <span className="text-[10px] text-teal-700 font-semibold mt-1 block">
              {stats.users?.elderly} Elderly • {stats.users?.caregivers} Caregivers
            </span>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
            <span className="text-xs font-bold text-slate-500 block mb-1">Doses Logged</span>
            <span className="text-xl font-black text-emerald-700 block">{stats.clinical?.totalDosesLogged || 0}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {stats.clinical?.activePrescriptions} Prescriptions
            </span>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
            <span className="text-xs font-bold text-slate-500 block mb-1">Notifications</span>
            <span className="text-xl font-black text-sky-700 block">{stats.notifications?.delivered || 0}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Provider: {health.notificationProvider}
            </span>
          </div>
        </div>
      )}

      {/* Operational Audit Trail Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>Operational Security & Audit Activity Trail</span>
            </h3>
            <p className="text-xs text-slate-500">Every sensitive action, dose log, SOS activation, and session event</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {auditLogs.length} Events Logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Resource Type</th>
                <th className="p-3 rounded-r-xl">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 30).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                    {log.actor?.full_name || log.actor_id?.substring(0, 8) || 'System'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      log.action.includes('SOS') ? 'bg-rose-100 text-rose-800' :
                      log.action.includes('DOSE') ? 'bg-emerald-100 text-emerald-800' :
                      log.action.includes('LOGIN') ? 'bg-sky-100 text-sky-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{log.resource_type}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                    {JSON.stringify(log.details || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
