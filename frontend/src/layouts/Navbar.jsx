import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { LogOut, User, Wifi, WifiOff, Bell, Sun, Moon } from 'lucide-react';
import { NotificationBadge } from '../components/ui/NotificationBadge';
import { SmoothButton } from '../components/ui/SmoothButton';
import { ShineText } from '../components/ui/ShineText';

export const Navbar = () => {
  const { user, role, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { connectionStatus, subscribe } = useWebSocket();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(3);

  useEffect(() => {
    const handleNewThreat = (payload) => {
      if (payload?.verdict || payload?.is_anomaly || payload?.action === 'RECOMMEND_BLOCK' || payload?.action === 'QUARANTINE') {
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

  const roleBadges = {
    admin: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    analyst: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    viewer: 'bg-slate-700/40 text-slate-300 border-slate-600',
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between select-none">
      {/* Search / Context Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-full">
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <ShineText text="Live WS Telemetry" className="text-slate-300 font-semibold" />
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Telemetry Feed</span>
              <span className="text-[10px] text-amber-400 font-semibold uppercase">
                {connectionStatus}
              </span>
            </>
          )}
        </div>
      </div>

      {/* User Actions & Day/Night Toggle */}
      <div className="flex items-center gap-3">
        {/* Day / Night Theme Toggle */}
        <SmoothButton
          onClick={toggleTheme}
          variant="outline"
          size="icon"
          title={isDark ? "Switch to Day Mode (Light)" : "Switch to Night Mode (Dark)"}
          className="rounded-xl border-slate-800 bg-slate-950/70 hover:bg-slate-800 text-amber-400 hover:text-amber-300"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
        </SmoothButton>

        {/* Notification Icon with Animated Spring Count Badge */}
        <NotificationBadge count={alertCount} variant="count" ping={alertCount > 0}>
          <SmoothButton
            variant="outline"
            size="icon"
            onClick={() => {
              navigate('/incidents');
              setAlertCount(0);
            }}
            title="View Live Incidents"
            className="rounded-xl border-slate-800 bg-slate-950/70 hover:bg-slate-800"
          >
            <Bell className="w-4 h-4 text-amber-400" />
          </SmoothButton>
        </NotificationBadge>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2 justify-end">
              {user?.username || 'SOC Analyst'}
              <span
                className={`text-[10px] px-2 py-0.5 rounded border uppercase font-mono font-medium ${
                  roleBadges[role] || roleBadges.viewer
                }`}
              >
                {role}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">{user?.email || 'analyst@netriq.local'}</div>
          </div>
        </div>

        <SmoothButton
          onClick={logout}
          variant="ghost"
          size="icon-sm"
          title="Logout of session"
          className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
        >
          <LogOut className="w-4 h-4" />
        </SmoothButton>
      </div>
    </header>
  );
};
