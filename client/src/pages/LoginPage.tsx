import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { Heart, Lock, Mail, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { UserRole } from '../types/index.js';

export const LoginPage: React.FC = () => {
  const { login, demoLogin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await demoLogin(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-card border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Heart className="w-7 h-7 fill-white" />
          </div>
          <h1 className="text-2xl font-black text-navy-950">Welcome to CAREVERSE</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Sign in to your healthcare portal</p>
        </div>

        {/* 1-Click Demo Login Options for Evaluators */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 mb-2">
            <UserCheck className="w-4 h-4 text-teal-600" />
            <span>Instant Demo Logins (Hackathon Evaluators):</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemo('elderly')}
              className="p-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl font-bold text-slate-800 transition text-center shadow-xs"
            >
              👵 Eleanor (Patient)
            </button>
            <button
              type="button"
              onClick={() => handleDemo('family')}
              className="p-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl font-bold text-slate-800 transition text-center shadow-xs"
            >
              👨‍👧 David (Family)
            </button>
            <button
              type="button"
              onClick={() => handleDemo('caregiver')}
              className="p-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl font-bold text-slate-800 transition text-center shadow-xs"
            >
              👩‍⚕️ Nurse Sarah (Caregiver)
            </button>
            <button
              type="button"
              onClick={() => handleDemo('admin')}
              className="p-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl font-bold text-slate-800 transition text-center shadow-xs"
            >
              🩺 Dr. Marcus (Admin)
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-teal-700 font-bold hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};
