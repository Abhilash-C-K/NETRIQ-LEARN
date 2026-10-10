import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Monitor,
  ShieldAlert,
  FileText,
  Settings,
} from 'lucide-react';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'dashboard',
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'live-traffic',
      path: '/traffic-layer1',
      aliases: ['/monitoring'],
      label: 'Live Traffic',
      icon: Activity,
    },
    {
      id: 'threat-detection',
      path: '/threats',
      aliases: ['/incidents'],
      label: 'Threat Detection',
      icon: AlertTriangle,
    },
    {
      id: 'system-status',
      path: '/network-layer2',
      aliases: ['/analytics', '/internal-network'],
      label: 'System Status',
      icon: Monitor,
    },
    {
      id: 'quarantine',
      path: '/quarantine',
      label: 'Quarantine',
      icon: ShieldAlert,
    },
    {
      id: 'reports',
      path: '/reports',
      label: 'Reports',
      icon: FileText,
    },
    {
      id: 'settings',
      path: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const isCurrentActive = (item) => {
    if (location.pathname === item.path) return true;
    if (item.aliases && item.aliases.includes(location.pathname)) return true;
    return false;
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-[#021338] via-[#041a4a] to-[#010e2b] flex flex-col justify-between select-none shrink-0 text-white z-20 relative overflow-hidden border-r border-[#0a2761]">
      {/* Ambient background waves matching screenshot - clearly visible & layered */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft radial glow points */}
        <div
          className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.22) 0%, rgba(2,132,199,0.08) 50%, transparent 75%)',
          }}
        />
        <div
          className="absolute bottom-40 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)',
          }}
        />

        {/* High-definition flowing wave curves */}
        <svg
          className="w-full h-full absolute inset-0"
          viewBox="0 0 256 900"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#082f6e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#021438" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="45%" stopColor="#0b387e" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#010e2b" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#02428f" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#031640" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="crestGlow1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="crestGlow2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#031640" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Deep upper wave */}
          <path
            d="M -40 370 C 50 430, 90 290, 260 360 L 260 900 L -40 900 Z"
            fill="url(#waveGrad3)"
          />

          {/* Mid prominent flowing wave with glowing crest */}
          <path
            d="M -50 510 C 30 440, 110 580, 270 490 L 270 900 L -50 900 Z"
            fill="url(#waveGrad1)"
            stroke="url(#crestGlow1)"
            strokeWidth="1.8"
          />

          {/* Lower front wave curving across bottom card */}
          <path
            d="M -40 680 C 60 570, 130 760, 270 610 L 270 900 L -40 900 Z"
            fill="url(#waveGrad2)"
            stroke="url(#crestGlow2)"
            strokeWidth="1.5"
          />

          {/* Bottom subtle secondary ripple */}
          <path
            d="M -30 790 C 80 730, 160 840, 270 760 L 270 900 L -30 900 Z"
            fill="#031b4d"
            fillOpacity="0.5"
            stroke="#38bdf8"
            strokeOpacity="0.25"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Top Branding & Nav Items */}
      <div className="relative z-10">
        {/* Brand Header with official NetrIQ Logo Image */}
        <div className="p-6 pb-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#020b24] border border-cyan-400/40 p-1 flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0 overflow-hidden group">
            <img
              src="/logo.jpeg"
              alt="NetrIQ Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.6)] group-hover:scale-105 transition-transform"
            />
          </div>

          <div>
            <div className="font-extrabold text-xl text-white tracking-tight flex items-center">
              NetriQ
            </div>
            <div className="text-[11px] text-cyan-200/80 font-normal leading-tight">
              Adaptive Network Security
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="px-4 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const active = isCurrentActive(item);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3.5 transition-all cursor-pointer font-medium text-sm ${
                  active
                    ? 'bg-[#1872eb] text-white font-semibold shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span className="leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Status Card matching screenshot */}
      <div className="p-4 relative z-10">
        <div className="bg-[#05235f]/80 backdrop-blur border border-[#0d3b8f] rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-sm shadow-emerald-400/50 animate-pulse" />
            <span className="text-xs font-semibold text-white">System Online</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1">All systems operational</p>
        </div>

        <div className="mt-3 px-1 text-[11px] text-slate-400">
          <div className="text-slate-400 text-[10px]">Last Updated</div>
          <div className="text-slate-300 font-medium">Oct 1, 2026 10:24 AM</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
