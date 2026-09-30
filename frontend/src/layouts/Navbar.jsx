import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { LogOut, User, Wifi, WifiOff, Bell } from 'lucide-react';
import { NotificationBadge } from '../components/ui/NotificationBadge';

export const Navbar = () => {
  const { user, role, logout } = useAuth();
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
    admin: 'bg-[#8CA4B8]/15 text-[#8CA4B8] border-[#8CA4B8]/40',
    analyst: 'bg-[#9AAA78]/15 text-[#9AAA78] border-[#9AAA78]/40',
    viewer: 'bg-[#252728] text-[#A4A5A0] border-[#303334]',
  };

  return (
    <header className="h-14 bg-[#17191A] border-b border-[#303334] px-6 flex items-center justify-between select-none shrink-0">
      {/* Search / Context Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-sans bg-[#1E2021] border border-[#303334] px-3 py-1 rounded-md">
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-[#9AAA78]" />
              <span className="text-[#F1F0EA] font-medium">Live Telemetry</span>
              <span className="text-[10px] text-[#9AAA78] font-semibold uppercase px-1.5 py-0.2 bg-[#9AAA78]/15 rounded">
                Connected
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-[#D0A05C]" />
              <span className="text-[#A4A5A0]">Telemetry Feed</span>
              <span className="text-[10px] text-[#D0A05C] font-semibold uppercase px-1.5 py-0.2 bg-[#D0A05C]/15 rounded">
                {connectionStatus}
              </span>
            </>
          )}
        </div>
      </div>

      {/* User Actions & Session Info */}
      <div className="flex items-center gap-3">
        {/* Notification Icon with Alert Count Badge */}
        <NotificationBadge count={alertCount} variant="count" ping={alertCount > 0}>
          <button
            onClick={() => {
              navigate('/incidents');
              setAlertCount(0);
            }}
            title="View Live Incidents"
            className="w-8 h-8 rounded-lg border border-[#303334] bg-[#1E2021] hover:bg-[#252728] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4 text-[#D0A05C]" />
          </button>
        </NotificationBadge>

        {/* User Identity Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#303334]">
          <div className="w-7 h-7 rounded-full bg-[#1E2021] border border-[#303334] flex items-center justify-center text-[#A4A5A0]">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-[#F1F0EA] flex items-center gap-2 justify-end">
              {user?.username || 'SOC Analyst'}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded border uppercase font-medium ${
                  roleBadges[role] || roleBadges.viewer
                }`}
              >
                {role}
              </span>
            </div>
            <div className="text-[10px] text-[#A4A5A0]">{user?.email || 'analyst@netriq.local'}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Logout of session"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A4A5A0] hover:text-[#C95F5F] hover:bg-[#C95F5F]/10 transition-colors ml-1 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
export default Navbar;
