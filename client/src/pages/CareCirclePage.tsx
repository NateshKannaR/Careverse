import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { api } from '../services/api.js';
import { InviteMemberModal } from '../components/care-circle/InviteMemberModal.js';
import { CareBuddyWidget } from '../components/carebuddy/CareBuddyWidget.js';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';

export const CareCirclePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState<string | null>(null);

  const fetchCircleData = async () => {
    try {
      const [circleRes, logsRes] = await Promise.all([
        api.careCircle.getMembers(user?.patient_id),
        api.audit.getLogs(user?.patient_id)
      ]);
      if (circleRes) {
        setMembers(circleRes.members || []);
        setInvitations(circleRes.invitations || []);
      }
      if (logsRes) setAccessLogs(logsRes.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCircleData();
  }, [user]);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;
    setAccepting(true);
    setAcceptMessage(null);
    try {
      const res = await api.careCircle.acceptInvite(inputToken.trim());
      setAcceptMessage(res.message);
      setInputToken('');
      fetchCircleData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept invitation token');
    } finally {
      setAccepting(false);
    }
  };

  const handleRevoke = async (memberId: string, name: string) => {
    if (window.confirm(`Revoke Care Circle access for ${name}?`)) {
      try {
        await api.careCircle.revokeMember(memberId);
        fetchCircleData();
      } catch (err: any) {
        alert(err.message || 'Failed to revoke access');
      }
    }
  };

  return (
    <div className="care-page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-950 flex items-center gap-2.5">
            <Users className="w-8 h-8 text-teal-600" />
            <span>{t.careCircle.title}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.careCircle.subtitle}</p>
        </div>

        <button
          onClick={() => setInviteModalOpen(true)}
          className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.careCircle.inviteMember}</span>
        </button>
      </div>

      {/* Accept Invitation Code Input Box */}
      <div className="bg-gradient-to-r from-teal-50 to-sky-50 rounded-3xl p-6 border border-teal-200 shadow-xs">
        <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-teal-600" />
          <span>Have an Invitation Code? Accept Care Circle Access</span>
        </h3>
        <p className="text-xs text-slate-600 mb-3">
          Enter the secure token shared by an elderly family member to link your account to their healthcare profile.
        </p>

        {acceptMessage && (
          <div className="mb-3 p-3 bg-emerald-100 text-emerald-900 font-semibold text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>{acceptMessage}</span>
          </div>
        )}

        <form onSubmit={handleAcceptInvite} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
          <input
            type="text"
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
            placeholder="Paste 64-character token or code..."
            className="flex-1 px-4 py-2.5 bg-white border border-teal-300 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <button
            type="submit"
            disabled={accepting || !inputToken.trim()}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>{accepting ? 'Joining...' : t.careCircle.acceptInvite}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Active Care Circle Members */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-navy-950">
          {t.careCircle.activeMembers} ({members.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {members.map(member => (
            <div
              key={member.id}
              className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 font-black text-lg flex items-center justify-center">
                      {(member.member?.full_name || 'M')[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-navy-950">
                        {member.member?.full_name}
                      </h3>
                      <span className="text-xs font-bold text-teal-700 block">
                        {member.relationship}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {member.member?.email}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                {/* Granular Permission Badges */}
                <div className="border-t border-slate-100 pt-3 mb-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Authorized Permissions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      member.can_view ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      View Profile
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      member.can_manage_meds ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      Manage Meds & Doses
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      member.can_manage_appointments ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      Manage Appointments
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      member.can_add_notes ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      Add Care Notes
                    </span>
                  </div>
                </div>
              </div>

              {user?.role === 'elderly' && (
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleRevoke(member.id, member.member?.full_name || 'Member')}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> {t.careCircle.revokeAccess}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h2 className="text-lg font-bold text-navy-950">
            {t.careCircle.pendingInvites} ({invitations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invitations.map(inv => (
              <div key={inv.id} className="p-4 bg-white rounded-2xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900">{inv.invited_email}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    Pending
                  </span>
                </div>
                <div className="text-slate-500 mb-2">
                  Role: <strong className="text-slate-700 capitalize">{inv.role}</strong> ({inv.relationship})
                </div>
                <div className="text-[10px] text-slate-400">
                  Expires: {new Date(inv.expires_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access Audit Transparency Table */}
      <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-card">
        <h3 className="text-base font-bold text-navy-950 mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-teal-600" />
          <span>Profile Access & Management Audit Trail</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">Complete transparent log of who accessed or updated your healthcare records</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-2.5">Time</th>
                <th className="p-2.5">Actor</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accessLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-2.5 font-bold text-slate-900">{log.actor?.full_name || 'Patient'}</td>
                  <td className="p-2.5 font-semibold text-teal-800">{log.action}</td>
                  <td className="p-2.5 text-slate-500">{log.resource_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onMemberInvited={fetchCircleData}
        patientId={user?.patient_id}
      />

      <CareBuddyWidget patientId={user?.patient_id} />
    </div>
  );
};
