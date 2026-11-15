import React, { useState, useEffect } from 'react';
import { KeyRound, UserCheck, ShieldCheck, Copy, Check, Clock, AlertTriangle, Users, Lock } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface PasscodeCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  onMemberUpdated?: () => void;
}

export const PasscodeCircleModal: React.FC<PasscodeCircleModalProps> = ({
  isOpen,
  onClose,
  patientId,
  onMemberUpdated
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'invite' | 'join' | 'approvals'>('invite');

  // Invite tab state
  const [generatedPasscode, setGeneratedPasscode] = useState<string | null>(null);
  const [expiresInHours, setExpiresInHours] = useState<number>(48);
  const [relationship, setRelationship] = useState<string>('Family Member');
  const [activePasscodes, setActivePasscodes] = useState<any[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);

  // Join tab state
  const [joinPasscode, setJoinPasscode] = useState<string>('');
  const [joinLoading, setJoinLoading] = useState<boolean>(false);
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Approvals tab state
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (user?.role === 'elderly') {
        fetchPasscodes();
        fetchPendingMembers();
      } else {
        setActiveTab('join');
      }
    }
  }, [isOpen, patientId, user]);

  const fetchPasscodes = async () => {
    try {
      const res = await api.get(`/care-circle/passcodes${patientId ? `?patient_id=${patientId}` : ''}`);
      setActivePasscodes(res.data.passcodes || []);
    } catch (err) {
      console.error('Failed to fetch passcodes', err);
    }
  };

  const fetchPendingMembers = async () => {
    setApprovalsLoading(true);
    try {
      const res = await api.get(`/care-circle/pending${patientId ? `?patient_id=${patientId}` : ''}`);
      setPendingMembers(res.data.pending || []);
    } catch (err) {
      console.error('Failed to fetch pending requests', err);
    } finally {
      setApprovalsLoading(false);
    }
  };

  const handleGeneratePasscode = async () => {
    setInviteLoading(true);
    try {
      const res = await api.post('/care-circle/passcode', {
        patient_id: patientId,
        relationship,
        role: 'family',
        expires_in_hours: expiresInHours,
        max_uses: 5
      });
      setGeneratedPasscode(res.data.passcode);
      fetchPasscodes();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate passcode');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinWithPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinLoading(true);
    setJoinMessage(null);
    try {
      const res = await api.post('/care-circle/join-passcode', {
        passcode: joinPasscode
      });
      setJoinMessage({
        type: 'success',
        text: res.data.message || 'Passcode verified! Your request has been sent for elder approval.'
      });
      setJoinPasscode('');
      if (onMemberUpdated) onMemberUpdated();
    } catch (err: any) {
      setJoinMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to join with passcode.'
      });
    } finally {
      setJoinLoading(false);
    }
  };

  const handleApproveMember = async (memberId: string, role: 'editor' | 'viewer') => {
    try {
      await api.patch(`/care-circle/members/${memberId}/approve`, {
        can_manage_meds: role === 'editor',
        can_manage_appointments: true,
        can_add_notes: true
      });
      fetchPendingMembers();
      if (onMemberUpdated) onMemberUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve member');
    }
  };

  const handleRejectMember = async (memberId: string) => {
    try {
      await api.patch(`/care-circle/members/${memberId}/reject`);
      fetchPendingMembers();
      if (onMemberUpdated) onMemberUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject member');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passcode-modal-title"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 id="passcode-modal-title" className="text-lg font-bold text-white">
                Family Care Circle Passcodes
              </h2>
              <p className="text-xs text-slate-400">Secure, encrypted, elder-approved circle joining</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 pt-3 bg-slate-950/30">
          {user?.role === 'elderly' && (
            <button
              onClick={() => setActiveTab('invite')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
                activeTab === 'invite'
                  ? 'border-teal-400 text-teal-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Generate Passcode
            </button>
          )}

          <button
            onClick={() => setActiveTab('join')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'join'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Join with Passcode
          </button>

          {user?.role === 'elderly' && (
            <button
              onClick={() => {
                setActiveTab('approvals');
                fetchPendingMembers();
              }}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
                activeTab === 'approvals'
                  ? 'border-teal-400 text-teal-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Elder Approval Center</span>
              {pendingMembers.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingMembers.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tab 1: Generate Passcode (Elder) */}
        {activeTab === 'invite' && (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Create New Secure Passcode</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="e.g. Daughter, Visiting Nurse"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Passcode Validity</label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={48}>48 Hours (2 Days)</option>
                    <option value={168}>7 Days (1 Week)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGeneratePasscode}
                disabled={inviteLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
              >
                {inviteLoading ? 'Generating...' : 'Generate 6-Character Passcode'}
              </button>
            </div>

            {/* Generated Code Display */}
            {generatedPasscode && (
              <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-500/40 text-center space-y-2">
                <p className="text-xs text-teal-300 font-medium">Share this code with your family or caregiver:</p>
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-3xl font-mono font-black tracking-widest text-teal-300 bg-slate-900 px-5 py-2 rounded-xl border border-teal-500/30">
                    {generatedPasscode}
                  </span>
                  <button
                    onClick={() => handleCopyCode(generatedPasscode)}
                    className="p-3 bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 rounded-xl transition flex items-center space-x-1"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  New members will join in <strong>pending</strong> status until you approve them.
                </p>
              </div>
            )}

            {/* Active Passcodes List */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Active Passcodes
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {activePasscodes.map((pc) => (
                  <div
                    key={pc.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-teal-400 tracking-wider">
                        {pc.raw_passcode || `${pc.passcode_prefix}****`}
                      </span>
                      <span className="text-xs text-slate-300">({pc.relationship})</span>
                      {pc.raw_passcode === 'CARE-2026' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Demo Code
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(pc.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Join with Passcode */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinWithPasscode} className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <label htmlFor="join-passcode-input" className="block text-sm font-medium text-slate-200">
                Enter 6-to-8 Character Passcode
              </label>
              <input
                id="join-passcode-input"
                type="text"
                value={joinPasscode}
                onChange={(e) => setJoinPasscode(e.target.value.toUpperCase())}
                placeholder="e.g. CARE-2026"
                maxLength={10}
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest bg-slate-900 border border-slate-700 rounded-xl text-teal-300 uppercase focus:outline-none focus:border-teal-400"
                required
              />

              {/* 1-Click Demo Fill */}
              <button
                type="button"
                onClick={() => setJoinPasscode('CARE-2026')}
                className="w-full py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
              >
                1-Click Quick-Fill Demo Passcode: CARE-2026
              </button>
            </div>

            {joinMessage && (
              <div
                className={`p-3.5 rounded-xl text-sm flex items-start space-x-2.5 ${
                  joinMessage.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{joinMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={joinLoading || !joinPasscode}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
            >
              {joinLoading ? 'Validating Passcode...' : 'Join Family Care Circle'}
            </button>
          </form>
        )}

        {/* Tab 3: Elder Approval Center */}
        {activeTab === 'approvals' && (
          <div className="p-6 space-y-4">
            {approvalsLoading ? (
              <p className="text-center text-sm text-slate-400 py-6">Checking pending requests...</p>
            ) : pendingMembers.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <UserCheck className="w-10 h-10 mx-auto text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">No Pending Requests</p>
                <p className="text-xs text-slate-500">
                  When a family member or caregiver redeems a passcode, their request will appear here for your approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {member.member?.full_name || 'Caregiver Applicant'}
                        </h4>
                        <p className="text-xs text-slate-400">{member.member?.email} • {member.relationship}</p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pending Approval
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-700/50">
                      <button
                        onClick={() => handleApproveMember(member.id, 'editor')}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition"
                      >
                        Approve as Editor
                      </button>
                      <button
                        onClick={() => handleApproveMember(member.id, 'viewer')}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition"
                      >
                        Approve as Viewer
                      </button>
                      <button
                        onClick={() => handleRejectMember(member.id)}
                        className="py-1.5 px-3 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-xs font-semibold transition"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
