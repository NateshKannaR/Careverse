import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  Heart,
  ShieldCheck,
  BellRing,
  Bot,
  Users,
  Calendar,
  Pill,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
  Clock,
  Lock,
  Activity,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types/index.js';

const demoAccounts = [
  { role: 'elderly', name: 'Patient', description: 'Track today’s doses', icon: Pill },
  { role: 'family', name: 'Family', description: 'See the care routine', icon: Users },
  { role: 'caregiver', name: 'Caregiver', description: 'Review assigned care', icon: Calendar },
  { role: 'admin', name: 'Admin', description: 'View activity and audit logs', icon: ShieldCheck },
] as const;

export const LandingPage: React.FC = () => {
  const { demoLogin, user } = useAuth();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<UserRole>();
  const [demoError, setDemoError] = useState('');

  async function openDemo(role: UserRole) {
    setOpening(role);
    setDemoError('');
    try {
      await demoLogin(role);
      navigate('/dashboard');
    } catch {
      setDemoError('The demo account could not open. Try again.');
    } finally {
      setOpening(undefined);
    }
  }

  return (
    <div className="flex flex-col bg-slate-50 selection:bg-teal-100 selection:text-teal-900">
      <section className="border-b border-teal-950 bg-[#113d3c] text-white">
        <div className="care-width grid items-center gap-8 py-10 sm:gap-10 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:py-20">
          <div className="min-w-0">
            <h1 className="max-w-[15ch] text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
              Everyday care,<br />
              <span className="text-teal-200">shared with family.</span>
            </h1>
            <p className="mt-5 max-w-[50ch] text-base leading-relaxed text-teal-50 sm:text-lg">
              Keep medication check-ins, appointments, and family updates together so everyone knows what needs attention.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-teal-950 hover:bg-teal-50"
              >
                {user ? 'Open dashboard' : 'Create an account'}
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </div>

          <section aria-labelledby="careverse-demo" className="min-w-0 rounded-2xl border border-teal-100 bg-white p-4 text-navy-950 shadow-card sm:rounded-3xl sm:p-6">
            <div className="flex items-start gap-3">
              <UserCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
              <div className="min-w-0">
                <h2 id="careverse-demo" className="text-lg font-bold sm:text-xl">Explore the demo</h2>
                <p className="mt-1 text-sm text-slate-600">Choose a role to open a fictional account.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2.5 min-[380px]:grid-cols-2">
              {demoAccounts.map(({ role, name, description, icon: Icon }) => (
                <button
                  key={role}
                  type="button"
                  disabled={opening !== undefined}
                  onClick={() => void openDemo(role)}
                  className="group flex min-h-14 min-w-0 items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-teal-400 hover:bg-teal-50 disabled:opacity-60 sm:p-3"
                >
                  <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{opening === role ? 'Opening…' : name}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-600">{description}</span>
                  </span>
                </button>
              ))}
            </div>
            {demoError && <p role="alert" className="mt-3 text-sm text-rose-800">{demoError}</p>}
          </section>
        </div>
      </section>

      {/* Core Ecosystem Value Pillars */}
      <section className="py-10 sm:py-16 bg-white border-b border-slate-200">
        <div className="care-width">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight mb-3">
              Tools for everyone in the care circle
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              CAREVERSE combines simplicity for seniors with comprehensive coordination tools for their circle of support.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            <div className="p-5 sm:p-7 bg-slate-50 rounded-2xl border border-slate-200 hover:border-teal-300 transition-all shadow-card group">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-navy-950 mb-2">Smart Medication Engine</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Automated dosage tracking, 15-minute advance reminders, grace period escalations, and strict clinical safety warnings that prevent accidental double doses.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Refill prediction intelligence
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Multi-channel email delivery
                </li>
              </ul>
            </div>

            <div className="p-5 sm:p-7 bg-slate-50 rounded-2xl border border-slate-200 hover:border-teal-300 transition-all shadow-card group">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-navy-950 mb-2">Family Care Circle</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Connect adult children, relatives, and professional nurses with cryptographically hashed invitations and granular permissions for total peace of mind.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Patient data isolation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Automated daily family digest
                </li>
              </ul>
            </div>

            <div className="p-5 sm:p-7 bg-slate-50 rounded-2xl border border-slate-200 hover:border-teal-300 transition-all shadow-card group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-navy-950 mb-2">CareBuddy AI Companion</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                A contextual healthcare assistant that summarizes daily routines, explains complex medical terms in plain English, and suggests questions to ask clinicians.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Web Speech read-aloud support
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Strict medical safety disclaimers
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Accessibility Section */}
      <section className="py-10 sm:py-16 bg-slate-900 text-white">
        <div className="care-width">
          <div className="grid min-w-0 grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-4">
                <Lock className="w-4 h-4 text-teal-400" /> Privacy and accessibility
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                Engineered for Healthcare Privacy & Accessibility
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                Built from the ground up with Supabase PostgreSQL Row Level Security (RLS), SHA-256 token hashing, strict patient data isolation, and comprehensive audit trails.
              </p>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-white">WCAG 2.2 AA Accessibility</h4>
                    <p className="text-xs text-slate-400">High contrast mode, 125% large text scaling, audible alerts, and multilingual support (English, Tamil, Hindi).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-white">Transparent Daily Care Score</h4>
                    <p className="text-xs text-slate-400">A clear routine completion indicator based on actual recorded events, clearly demarcated from clinical diagnosis.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-white">Emergency SOS Assistance</h4>
                    <p className="text-xs text-slate-400">One-tap rapid alerting for emergency contacts, accidental activation cancellation, and local 911 / 112 dialing instructions.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 p-5 sm:p-8 rounded-2xl border border-slate-700 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-teal-400" />
                Notification Engine Highlights
              </h3>
              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700">
                  <span className="font-bold text-teal-300">Background Engine:</span> Runs idempotent cron evaluations checking for due doses, grace periods, and appointment alerts.
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700">
                  <span className="font-bold text-teal-300">Caregiver Escalation:</span> If a vital dose is unrecorded beyond 30 minutes, authorized caregivers receive alert emails.
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700">
                  <span className="font-bold text-teal-300">Resend & Simulator:</span> Supports live production email dispatch via Resend SDK or the zero-config in-app visual simulator.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-12">
        <div className="care-width flex flex-col items-start justify-between gap-4 text-xs text-slate-600 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-teal-600 fill-teal-600" />
            <span className="font-bold text-slate-800">CAREVERSE Ecosystem</span>
          </div>
          <div>
            Built with React, TypeScript, Tailwind CSS, Express, and Supabase PostgreSQL.
          </div>
        </div>
      </footer>
    </div>
  );
};
