import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { X, UserPlus, Check, Copy, Shield, Key } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberInvited: () => void;
  patientId?: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onMemberInvited,
  patientId
}) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [role, setRole] = useState<'family' | 'caregiver'>('family');
  const [canView, setCanView] = useState(true);
  const [canManageMeds, setCanManageMeds] = useState(false);
  const [canManageAppointments, setCanManageAppointments] = useState(true);
  const [canAddNotes, setCanAddNotes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !relationship.trim()) return;
    setLoading(true);
    try {
      const res = await api.careCircle.invite({
        patient_id: patientId,
        invited_email: email.trim(),
        relationship: relationship.trim(),
        role,
        can_view: canView,
        can_manage_meds: canManageMeds,
        can_manage_appointments: canManageAppointments,
        can_add_notes: canAddNotes,
        expires_in_days: 7
      });
      setCreatedInvite(res.invitation);
      onMemberInvited();
    } catch (err: any) {
      alert(err.message || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (createdInvite?.raw_token) {
      navigator.clipboard.writeText(createdInvite.raw_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-invite-title"
      className="care-overlay"
    >
      <div className="care-dialog bg-white rounded-2xl max-w-lg p-4 sm:p-8 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-200 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-800 rounded-2xl">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 id="modal-invite-title" className="text-xl font-bold text-slate-900">
                {t.careCircle.inviteMember}
              </h2>
              <p className="text-xs text-slate-500">Secure hashed invitation with granular permissions</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="min-h-11 min-w-11 shrink-0 p-2 text-slate-600 hover:text-slate-700 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!createdInvite ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Invitee Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="family.member@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship *</label>
                <input
                  type="text"
                  required
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  placeholder="e.g. Daughter, Nurse"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
                <select
                  value={role}
                  onChange={e => {
                    const r = e.target.value as 'family' | 'caregiver';
                    setRole(r);
                    if (r === 'caregiver') setCanManageMeds(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                >
                  <option value="family">{t.roles.family}</option>
                  <option value="caregiver">{t.roles.caregiver}</option>
                </select>
              </div>
            </div>

            {/* Granular Permissions */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-1">
                <Shield className="w-4 h-4 text-teal-600" />
                <span>Granular Access Permissions</span>
              </div>

              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>View Profile & Health Records</span>
                <input
                  type="checkbox"
                  checked={canView}
                  onChange={e => setCanView(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>Manage Medications & Record Doses</span>
                <input
                  type="checkbox"
                  checked={canManageMeds}
                  onChange={e => setCanManageMeds(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>Manage Medical Appointments</span>
                <input
                  type="checkbox"
                  checked={canManageAppointments}
                  onChange={e => setCanManageAppointments(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>Write Care Notes & Observations</span>
                <input
                  type="checkbox"
                  checked={canAddNotes}
                  onChange={e => setCanAddNotes(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition"
              >
                {loading ? 'Generating...' : 'Send Secure Invitation'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Invitation Created!</h3>
            <p className="text-xs text-slate-500 mb-4">
              Share this secure code with <strong>{createdInvite.invited_email}</strong>. The recipient must authenticate to join your Care Circle.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-6">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-center gap-1">
                <Key className="w-3 h-3 text-teal-600" />
                Cryptographically Hashed Invitation Code
              </div>
              <div className="font-mono text-sm font-bold text-slate-800 break-all select-all py-1">
                {createdInvite.raw_token}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyInviteCode}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Invitation Code'}
              </button>
              <button
                onClick={onClose}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
