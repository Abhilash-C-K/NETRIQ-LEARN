import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { Splash } from '../pages/Splash';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Monitoring } from '../pages/Monitoring';
import { Incidents } from '../pages/Incidents';
import { History } from '../pages/History';
import { Analytics } from '../pages/Analytics';
import { Reports } from '../pages/Reports';
import { AIPerformance } from '../pages/AIPerformance';
import { Users } from '../pages/Users';
import { Settings } from '../pages/Settings';
import { NotFound } from '../pages/NotFound';

export const AppRouter = () => {
  return (
    <Routes>
      {/* Root Route: Fullscreen Splash Screen (redirects to /login if dismissed this session) */}
      <Route path="/" element={<Splash />} />

      {/* Authentication Route */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated Application Routes (Protected via AppLayout) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredCapability="VIEW_SMART_SUMMARY">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/history" element={<History />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/ai-performance" element={<AIPerformance />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredCapability="MANAGE_USERS">
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredCapability="MANAGE_SETTINGS">
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRouter;
