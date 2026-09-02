import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { LogOut, User, Wifi, WifiOff, Shield } from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout } = useAuth();
  const { connectionStatus } = useWebSocket();

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
              <span className="text-slate-300">Live WS Telemetry</span>
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

      {/* User Actions */}
      <div className="flex items-center gap-4">
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

        <button
          onClick={logout}
          title="Logout of session"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/30"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
