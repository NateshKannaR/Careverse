import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { A11yProvider } from './context/A11yContext.js';
import { LanguageProvider } from './context/LanguageContext.js';
import { Navbar } from './components/layout/Navbar.js';

// Pages
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { DashboardRouterPage } from './pages/DashboardRouterPage.js';
import { MedicationsPage } from './pages/MedicationsPage.js';
import { AppointmentsPage } from './pages/AppointmentsPage.js';
import { CareCirclePage } from './pages/CareCirclePage.js';
const AnalyticsPage = React.lazy(async () => ({ default: (await import('./pages/AnalyticsPage.js')).AnalyticsPage }));
import { SettingsPage } from './pages/SettingsPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000
    }
  }
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <A11yProvider>
          <LanguageProvider>
            <BrowserRouter>
              <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 transition-colors">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardRouterPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/medications"
                      element={
                        <ProtectedRoute>
                          <MedicationsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/appointments"
                      element={
                        <ProtectedRoute>
                          <AppointmentsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/care-circle"
                      element={
                        <ProtectedRoute>
                          <CareCirclePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute>
                          <React.Suspense fallback={<p role="status" className="care-width py-6">Loading report…</p>}><AnalyticsPage /></React.Suspense>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </BrowserRouter>
          </LanguageProvider>
        </A11yProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
