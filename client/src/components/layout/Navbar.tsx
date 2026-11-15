import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { A11yToolbar } from '../accessibility/A11yToolbar.js';
import { EmergencySOSModal } from '../emergency/EmergencySOSModal.js';
import { NotificationSimulatorModal } from '../notifications/NotificationSimulatorModal.js';
import {
  Heart,
  Pill,
  Calendar,
  Users,
  BarChart3,
  Bell,
  Settings,
  ShieldAlert,
  LogOut,
  UserCheck,
  Menu,
  X,
  Mail,
  KeyRound
} from 'lucide-react';
import { UserRole } from '../../types/index.js';
import { PasscodeCircleModal } from '../carecircle/PasscodeCircleModal.js';

export const Navbar: React.FC = () => {
  const { user, logout, demoLogin } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/dashboard', label: t.nav.dashboard, icon: Heart },
    { to: '/medications', label: t.nav.medications, icon: Pill },
    { to: '/appointments', label: t.nav.appointments, icon: Calendar },
    { to: '/care-circle', label: t.nav.careCircle, icon: Users },
    { to: '/analytics', label: t.nav.analytics, icon: BarChart3 },
    { to: '/settings', label: t.nav.settings, icon: Settings }
  ];

  const handleRoleSwitch = (role: UserRole) => {
    demoLogin(role);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* Logo */}
            <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 group-hover:bg-teal-700 flex items-center justify-center text-white shadow-md transition-colors">
                <Heart className="w-6 h-6 fill-white" />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-navy-900 flex items-center gap-1">
                  CARE<span className="text-teal-600">VERSE</span>
                </span>
                <span className="hidden lg:block text-[10px] font-semibold text-slate-500 uppercase tracking-widest -mt-1">
                  Connected Elderly Healthcare
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Accessibility & Language Toolbar */}
              <A11yToolbar />

              {/* Notification Simulator Trigger (Hackathon evaluator feature) */}
              <button
                onClick={() => setSimulatorOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold rounded-xl border border-sky-200 transition"
                title="Open Evaluator Notification Delivery Simulator"
              >
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden xl:inline">Simulated Inbox</span>
              </button>

              {/* Passcode Care Circle Modal Button */}
              {user && (
                <button
                  onClick={() => setPasscodeModalOpen(true)}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 transition"
                  title="Passcode Care Circle Joining & Approvals"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Passcode Circle</span>
                </button>
              )}

              {/* Prominent Emergency SOS button */}
              {user && (
                <button
                  onClick={() => setSosModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition-transform transform active:scale-95 animate-pulse"
                  aria-label="Trigger Emergency Assistance"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>SOS</span>
                </button>
              )}

              {/* User Dropdown / Demo Role Switcher */}
              {user ? (
                <div className="flex items-center gap-2">
                  {/* Demo Switcher Quick Buttons */}
                  <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700">
                    <span className="px-2 text-slate-400">Switch Demo:</span>
                    <button
                      onClick={() => handleRoleSwitch('elderly')}
                      className={`px-2 py-0.5 rounded-lg ${user.role === 'elderly' ? 'bg-white text-teal-800 shadow-xs' : 'hover:bg-slate-200'}`}
                    >
                      Elderly
                    </button>
                    <button
                      onClick={() => handleRoleSwitch('family')}
                      className={`px-2 py-0.5 rounded-lg ${user.role === 'family' ? 'bg-white text-teal-800 shadow-xs' : 'hover:bg-slate-200'}`}
                    >
                      Family
                    </button>
                    <button
                      onClick={() => handleRoleSwitch('caregiver')}
                      className={`px-2 py-0.5 rounded-lg ${user.role === 'caregiver' ? 'bg-white text-teal-800 shadow-xs' : 'hover:bg-slate-200'}`}
                    >
                      Caregiver
                    </button>
                    <button
                      onClick={() => handleRoleSwitch('admin')}
                      className={`px-2 py-0.5 rounded-lg ${user.role === 'admin' ? 'bg-white text-teal-800 shadow-xs' : 'hover:bg-slate-200'}`}
                    >
                      Admin
                    </button>
                  </div>

                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                      {user.full_name}
                    </div>
                    <div className="text-[10px] font-semibold text-teal-700 capitalize">
                      {user.role}
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition"
                    title={t.common.logout}
                    aria-label="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-teal-700 transition"
                  >
                    {t.common.login}
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition"
                  >
                    {t.common.register}
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              {user && (
                <button
                  onClick={() => setMobileMenuOpen(prev => !prev)}
                  className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl"
                  aria-label="Toggle mobile menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-6 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Icon className="w-5 h-5 text-teal-600" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setSimulatorOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-sky-800 bg-sky-50 rounded-xl"
              >
                <Mail className="w-4 h-4 text-sky-600" />
                Notification Simulator
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Emergency SOS Modal */}
      <EmergencySOSModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        patientId={user?.patient_id}
      />

      {/* Notification Simulator Modal */}
      <NotificationSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />

      {/* Passcode Care Circle Modal */}
      <PasscodeCircleModal
        isOpen={passcodeModalOpen}
        onClose={() => setPasscodeModalOpen(false)}
        patientId={user?.patient_id}
      />
    </>
  );
};
