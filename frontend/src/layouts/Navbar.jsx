import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  LogOut,
  User,
  Wifi,
  WifiOff,
  Bell,
  Shield,
  Layers,
  Activity,
  AlertCircle
} from 'lucide-react';
import { NotificationBadge } from '../components/ui/NotificationBadge';

export const Navbar = () => {
  const { user, role, logout } = useAuth();
  const { connectionStatus, subscribe } = useWebSocket();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(3);

  useEffect(() => {
    const handleNewThreat = (payload) => {
      if (
        payload?.verdict === 'BLOCK' ||
        payload?.verdict === 'DROP' ||
        payload?.is_anomaly ||
        payload?.action === 'RECOMMEND_BLOCK' ||
        payload?.action === 'QUARANTINE'
      ) {
        setAlertCount((prev) => prev + 1);
      }
    };

    const unsubscribeVerdict = subscribe('live_verdict', handleNewThreat);
    const unsubscribeAlert = subscribe('threat_alert', handleNewThreat);
    return () => {
      unsubscribeVerdict();
      unsubscribeAlert();
    };
  }, [subscribe]);

  return (
    <header className="h-16 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-between select-none shrink-0 shadow-sm">
      {/* Left: Dual Layer SOC Engine Status */}
      <div className="flex items-center gap-3">
        {/* Layer 1 Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#eff6ff] border border-[#bfdbfe] text-xs">
          <Shield className="w-3.5 h-3.5 text-[#2563eb]" />
          <span className="font-semibold text-[#1e40af]">Layer 1: Pre-Firewall</span>
          <span className="inline-block w-2 h-2 rounded-full bg-[#2563eb] animate-subtle-pulse" />
          <span className="text-[11px] font-medium text-[#2563eb]">Filtering</span>
        </div>

        {/* Layer 2 Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#f5f3ff] border border-[#ddd6fe] text-xs">
          <Layers className="w-3.5 h-3.5 text-[#7c3aed]" />
          <span className="font-semibold text-[#5b21b6]">Layer 2: Internal Zero-Trust</span>
          <span className="inline-block w-2 h-2 rounded-full bg-[#7c3aed] animate-subtle-pulse" />
          <span className="text-[11px] font-medium text-[#7c3aed]">Monitoring</span>
        </div>

        {/* Telemetry Live Feed indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#64748b]">
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-[#16a34a]" />
              <span className="text-[#334155] font-medium">Socket Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-[#ea580c]" />
              <span className="text-[#ea580c] font-medium">{connectionStatus}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Quick Alert Notifications, User Info & Logout */}
      <div className="flex items-center gap-3">
        {/* Alerts Button */}
        <NotificationBadge count={alertCount} variant="count" ping={alertCount > 0}>
          <button
            onClick={() => {
              navigate('/threats');
              setAlertCount(0);
            }}
            title="View Threat Detection Alerts"
            className="w-9 h-9 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff] hover:border-[#bfdbfe] flex items-center justify-center transition-colors cursor-pointer text-[#475569] hover:text-[#2563eb]"
          >
            <Bell className="w-4 h-4" />
          </button>
        </NotificationBadge>

        {/* User Pill */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#e2e8f0]">
          <div className="w-8 h-8 rounded-full bg-[#0a122c] text-white flex items-center justify-center font-medium text-xs">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-[#0f172a] flex items-center gap-1.5 justify-end">
              {user?.username || 'SOC Analyst'}
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
                {role || 'analyst'}
              </span>
            </div>
            <div className="text-[11px] text-[#64748b]">{user?.email || 'analyst@netriq.local'}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign out"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors ml-1 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
