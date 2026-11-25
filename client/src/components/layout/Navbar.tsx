import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3, Calendar, Heart, KeyRound, LogOut, Mail, Menu, Pill, Settings, ShieldAlert, Users, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import type { UserRole } from '../../types/index.js';
import { A11yToolbar } from '../accessibility/A11yToolbar.js';
import { PasscodeCircleModal } from '../carecircle/PasscodeCircleModal.js';
import { EmergencySOSModal } from '../emergency/EmergencySOSModal.js';
import { NotificationSimulatorModal } from '../notifications/NotificationSimulatorModal.js';

const demoRoles = [
  { role: 'elderly', label: 'Patient' },
  { role: 'family', label: 'Family' },
  { role: 'caregiver', label: 'Caregiver' },
  { role: 'admin', label: 'Admin' },
] as const;

export const Navbar: React.FC = () => {
  const { user, logout, demoLogin } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rolePending, setRolePending] = useState<UserRole>();
  const [roleError, setRoleError] = useState('');
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);

  const navLinks = [
    { to: '/dashboard', label: t.nav.dashboard, icon: Heart },
    { to: '/medications', label: t.nav.medications, icon: Pill },
    { to: '/appointments', label: t.nav.appointments, icon: Calendar },
    { to: '/care-circle', label: t.nav.careCircle, icon: Users },
    { to: '/analytics', label: t.nav.analytics, icon: BarChart3 },
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ];

  useEffect(() => {
    setMenuOpen(false);
    setRoleError('');
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    const dismissOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('keydown', dismissOnEscape);
    document.addEventListener('pointerdown', dismissOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', dismissOnEscape);
      document.removeEventListener('pointerdown', dismissOnOutsideClick);
    };
  }, [menuOpen]);

  async function switchDemoRole(role: UserRole) {
    setRolePending(role);
    setRoleError('');
    try {
      await demoLogin(role);
      setMenuOpen(false);
      menuButton.current?.focus();
    } catch {
      setRoleError('Unable to open the demo account. Try again.');
    } finally {
      setRolePending(undefined);
    }
  }

  const navItems = navLinks.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) => `flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        isActive ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-teal-700" />
      <span>{label}</span>
    </NavLink>
  ));

  return (
    <>
      <header ref={header} className="sticky top-0 z-[45] border-b border-slate-200 bg-white shadow-sm">
        <div className="care-width relative">
          <div className="flex min-h-[3.75rem] items-center justify-between gap-2 py-2 sm:min-h-[4.25rem] sm:gap-4">
            <Link
              to={user ? '/dashboard' : '/'}
              className="inline-flex min-w-0 items-center gap-2 text-lg font-black tracking-tight text-navy-950 sm:text-xl"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-teal-700 text-white sm:h-10 sm:w-10">
                <Heart aria-hidden="true" className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
              </span>
              <span>Care<span className="text-teal-700">verse</span></span>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              {user ? (
                <>
                  <div className="hidden min-w-0 border-r border-slate-200 pr-4 text-right md:block">
                    <p className="max-w-[12rem] truncate text-sm font-semibold text-navy-950">{user.full_name}</p>
                    <p className="text-xs capitalize text-slate-600">{user.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSosModalOpen(true); setMenuOpen(false); }}
                    aria-label="Trigger Emergency Assistance"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-700 px-2.5 text-xs font-bold text-white transition-colors hover:bg-rose-800 sm:px-4 sm:text-sm"
                  >
                    <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
                    SOS
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex min-h-11 items-center whitespace-nowrap rounded-xl bg-teal-700 px-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-800 sm:px-4 sm:text-sm"
                >
                  {t.common.login}
                </Link>
              )}

              <button
                ref={menuButton}
                type="button"
                onClick={() => setMenuOpen(open => !open)}
                aria-label="Menu"
                aria-controls="careverse-menu"
                aria-expanded={menuOpen}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-100 sm:px-3"
              >
                {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>

          {user && (
            <nav aria-label="Main navigation" className="hidden flex-wrap items-center gap-1 border-t border-slate-100 py-1.5 lg:flex">
              {navItems}
            </nav>
          )}

          <div
            id="careverse-menu"
            aria-label="Careverse menu"
            hidden={!menuOpen}
            className="absolute inset-x-3 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-b-2xl border border-slate-200 bg-white p-3 shadow-xl sm:left-auto sm:right-6 sm:w-[23rem] sm:p-4 lg:max-h-[calc(100dvh-9rem)]"
          >
            {user && (
              <nav aria-label="Mobile navigation" className="mb-3 grid grid-cols-1 gap-1 border-b border-slate-200 pb-3 min-[380px]:grid-cols-2 lg:hidden">
                {navItems}
              </nav>
            )}
            <A11yToolbar />
            <div className="mt-3 grid gap-1.5">
              <button
                type="button"
                onClick={() => { setSimulatorOpen(true); setMenuOpen(false); }}
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-teal-700" />
                Simulated Inbox
              </button>
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setPasscodeModalOpen(true); setMenuOpen(false); }}
                    className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <KeyRound aria-hidden="true" className="h-4 w-4 shrink-0 text-teal-700" />
                    Passcode Circle
                  </button>
                  <section aria-labelledby="demo-role-label" className="border-y border-slate-200 py-3">
                    <h2 id="demo-role-label" className="mb-2 px-1 text-sm font-semibold text-slate-700">Demo account</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {demoRoles.map(({ role, label }) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => void switchDemoRole(role)}
                          aria-pressed={user.role === role}
                          disabled={rolePending !== undefined}
                          className={`min-h-11 rounded-xl border px-2 py-1 text-sm font-semibold disabled:opacity-60 ${
                            user.role === role ? 'border-teal-200 bg-teal-50 text-teal-900' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {rolePending === role ? 'Opening…' : label}
                        </button>
                      ))}
                    </div>
                    {roleError && <p role="alert" className="mt-2 text-sm text-rose-800">{roleError}</p>}
                  </section>
                  <button
                    type="button"
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4 shrink-0 text-teal-700" />
                    {t.common.logout}
                  </button>
                </>
              ) : (
                <Link to="/register" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">
                  {t.common.register}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <EmergencySOSModal isOpen={sosModalOpen} onClose={() => setSosModalOpen(false)} patientId={user?.patient_id} />
      <NotificationSimulatorModal isOpen={simulatorOpen} onClose={() => setSimulatorOpen(false)} />
      <PasscodeCircleModal isOpen={passcodeModalOpen} onClose={() => setPasscodeModalOpen(false)} patientId={user?.patient_id} />
    </>
  );
};
