import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { Splash } from '../pages/Splash';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { LiveTrafficLayer1 } from '../pages/LiveTrafficLayer1';
import { InternalNetworkLayer2 } from '../pages/InternalNetworkLayer2';
import { ThreatDetection } from '../pages/ThreatDetection';
import { DeviceQuarantine } from '../pages/DeviceQuarantine';
import { ReportsSettings } from '../pages/ReportsSettings';
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

        {/* 02. Live Traffic - Layer 1 (Pre-Firewall Ingress) */}
        <Route path="/traffic-layer1" element={<LiveTrafficLayer1 />} />
        <Route path="/monitoring" element={<LiveTrafficLayer1 />} />

        {/* 03. Internal Network - Layer 2 (Topology & Lateral Movement via React Flow) */}
        <Route path="/network-layer2" element={<InternalNetworkLayer2 />} />
        <Route path="/internal-network" element={<InternalNetworkLayer2 />} />
        <Route path="/analytics" element={<InternalNetworkLayer2 />} />

        {/* 04. Threat Detection - Alerts & SHAP-based Feature Explanations */}
        <Route path="/threats" element={<ThreatDetection />} />
        <Route path="/incidents" element={<ThreatDetection />} />

        {/* 05. Device Quarantine - Layer 2 Isolation Controls & Audit Log */}
        <Route path="/quarantine" element={<DeviceQuarantine />} />

        {/* 06. Reports and Settings - Incident Reports, NIC Config, AI Thresholds, System Health */}
        <Route path="/reports-settings" element={<ReportsSettings />} />
        <Route path="/reports" element={<ReportsSettings />} />
        <Route path="/settings" element={<ReportsSettings />} />

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
