import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ElderlyDashboardPage } from './ElderlyDashboardPage.js';
import { FamilyDashboardPage } from './FamilyDashboardPage.js';
import { CaregiverDashboardPage } from './CaregiverDashboardPage.js';
import { AdminDashboardPage } from './AdminDashboardPage.js';
import { Navigate } from 'react-router-dom';

export const DashboardRouterPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500">Loading CAREVERSE...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'elderly':
      return <ElderlyDashboardPage />;
    case 'family':
      return <FamilyDashboardPage />;
    case 'caregiver':
      return <CaregiverDashboardPage />;
    case 'admin':
      return <AdminDashboardPage />;
    default:
      return <ElderlyDashboardPage />;
  }
};
