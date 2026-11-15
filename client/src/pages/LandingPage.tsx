import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import {
  Heart,
  ShieldCheck,
  BellRing,
  Bot,
  Users,
  Calendar,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Lock,
  Activity,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types/index.js';

export const LandingPage: React.FC = () => {
  const { demoLogin, user } = useAuth();
  const { t } = useLanguage();

  const handleDemo = (role: UserRole) => {
    demoLogin(role);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 bg-gradient-to-b from-teal-50/50 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold tracking-wide uppercase mb-6 shadow-xs animate-fade-in">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Next-Generation Elderly Healthcare Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-navy-950 tracking-tight leading-[1.1] mb-6">
              Your Health. Your Family.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
                One Connected Circle.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-slate-600 font-medium leading-relaxed mb-10 max-w-2xl mx-auto">
              Empowering seniors to maintain independence while keeping family members and caregivers effortlessly aligned through real-time dose tracking, smart reminders, and AI-assisted care intelligence.
            </p>

            {/* Evaluator 1-Click Instant Demo Login Banner */}
            <div className="p-6 bg-white rounded-3xl border-2 border-teal-500/30 shadow-card mb-8 max-w-2xl mx-auto text-left">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-600" />
                  Hackathon Evaluator 1-Click Demo Logins
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Pre-configured realistic fictional accounts
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleDemo('elderly')}
                  className="py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition text-center"
                >
                  Elderly Patient
                </button>
                <button
                  onClick={() => handleDemo('family')}
                  className="py-2.5 px-3 bg-navy-800 hover:bg-navy-900 text-white rounded-xl text-xs font-bold shadow-sm transition text-center"
                >
                  Family Member
                </button>
                <button
                  onClick={() => handleDemo('caregiver')}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition text-center"
                >
                  Nurse / Caregiver
                </button>
                <button
                  onClick={() => handleDemo('admin')}
                  className="py-2.5 px-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition text-center"
                >
                  Admin Portal
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white text-base font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-slate-800 text-base font-bold rounded-2xl border border-slate-200 shadow-sm transition"
              >
                Sign In to Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Ecosystem Value Pillars */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight mb-3">
              Designed Centered Around the Elderly Individual
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              CAREVERSE combines simplicity for seniors with comprehensive coordination tools for their circle of support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 hover:border-teal-300 transition-all shadow-card group">
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

            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 hover:border-teal-300 transition-all shadow-card group">
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

            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 hover:border-teal-300 transition-all shadow-card group">
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
      <section className="py-16 sm:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-4">
                <Lock className="w-4 h-4 text-teal-400" /> Security & Privacy First
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

            <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700 shadow-2xl">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-teal-600 fill-teal-600" />
            <span className="font-bold text-slate-800">CAREVERSE Ecosystem</span>
            <span>• Hackathon Submission Edition</span>
          </div>
          <div>
            Built with React, TypeScript, Tailwind CSS, Express, and Supabase PostgreSQL.
          </div>
        </div>
      </footer>
    </div>
  );
};
