import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { Splash } from '../pages/Splash';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { LiveTrafficLayer1 } from '../pages/LiveTrafficLayer1';
import { Monitoring } from '../pages/Monitoring';
import { InternalNetworkLayer2 } from '../pages/InternalNetworkLayer2';
import { ThreatDetection } from '../pages/ThreatDetection';
import { DeviceQuarantine } from '../pages/DeviceQuarantine';
import { Reports } from '../pages/Reports';
import { Settings } from '../pages/Settings';
import { AIPerformance } from '../pages/AIPerformance';
import { Users } from '../pages/Users';
import { History } from '../pages/History';
import { NotFound } from '../pages/NotFound';

export const AppRouter = () => {
  return (
    <Routes>
      {/* Root Route: Splash Screen */}
      <Route path="/" element={<Splash />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated Application Routes (Protected via AppLayout) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* 01. Dashboard - Main SOC Overview */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* 02. Live Traffic - External (Pre-Firewall Ingress) */}
        <Route path="/traffic-layer1" element={<LiveTrafficLayer1 />} />
        <Route path="/monitoring" element={<Monitoring />} />

        {/* 03. Internal Network - Internal (Topology & Lateral Movement via React Flow) */}
        <Route path="/network-layer2" element={<InternalNetworkLayer2 />} />
        <Route path="/internal-network" element={<InternalNetworkLayer2 />} />
        <Route path="/analytics" element={<InternalNetworkLayer2 />} />

        {/* 04. Threat Detection - Alerts & Feature Explanations */}
        <Route path="/threats" element={<ThreatDetection />} />
        <Route path="/incidents" element={<ThreatDetection />} />

        {/* 05. Device Quarantine - Internal Isolation Controls & Audit Log */}
        <Route path="/quarantine" element={<DeviceQuarantine />} />

        {/* 06. Reports - Incident Reports & SOC Compliance Audits */}
        <Route path="/reports" element={<Reports />} />

        {/* 07. Settings - NIC Config, AI Thresholds & System Health */}
        <Route path="/settings" element={<Settings />} />

        {/* Legacy redirect for reports-settings */}
        <Route path="/reports-settings" element={<Navigate to="/reports" replace />} />

        {/* Secondary / Admin Routes */}
        <Route path="/ai-performance" element={<AIPerformance />} />
        <Route path="/history" element={<History />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredCapability="MANAGE_USERS">
              <Users />
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
