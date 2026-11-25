import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  Heart,
  ShieldCheck,
  Users,
  Calendar,
  Pill,
  ArrowRight,
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
              <button type="button" disabled={opening !== undefined} onClick={() => user ? navigate('/dashboard') : openDemo('elderly')}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-teal-950 hover:bg-teal-50">
                {user ? 'Open dashboard' : 'Try the patient demo'}<ArrowRight aria-hidden="true" size={16} />
              </button>
              {!user && <Link to="/register" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-white underline underline-offset-4">Create an account</Link>}
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

      <section aria-labelledby="care-plan-preview" className="bg-white py-10 sm:py-16">
        <div className="care-width grid items-center gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-12">
          <div>
            <h2 id="care-plan-preview" className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">One care plan for the day</h2>
            <ul className="mt-5 divide-y divide-slate-200">
              {[
                { icon: Pill, title: 'Record a dose', detail: 'Review the schedule in the patient’s time zone and log the outcome.' },
                { icon: Users, title: 'Hand off a refill', detail: 'A shared note tells family and caregivers which prescription needs follow-up.' },
                { icon: Calendar, title: 'Prepare for a visit', detail: 'Check off preparation tasks and save the visit to your calendar.' },
              ].map(({ icon: Icon, title, detail }) => <li key={title} className="flex items-start gap-3 py-3">
                <Icon size={19} className="mt-0.5 shrink-0 text-teal-700" />
                <div><h3 className="font-bold text-navy-950">{title}</h3><p className="mt-1 text-sm text-slate-600">{detail}</p></div>
              </li>)}
            </ul>
          </div>
          <img src={new URL('../assets/daily-care-plan.webp', import.meta.url).href}
            alt="Eleanor’s fictional care plan with dose schedule, wellbeing check-in, next visit and care resources"
            width="1080" height="690" loading="lazy" className="w-full rounded-2xl border border-slate-200 shadow-card" />
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
            Public demo with fictional patient records.
          </div>
        </div>
      </footer>
    </div>
  );
};
