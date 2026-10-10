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
      {/* Ambient background waves matching screenshot - seamlessly blended with soft gradients & blur */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Soft glowing ambient lighting orbs for deep luminous blend */}
        <div
          className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-40"
          style={{
            background: 'radial-gradient(circle, #0284c7 0%, #0369a1 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/2 -left-20 w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-25"
          style={{
            background: 'radial-gradient(circle, #1e40af 0%, #0c4a6e 50%, transparent 75%)',
          }}
        />
        <div
          className="absolute bottom-28 -right-20 w-64 h-64 rounded-full pointer-events-none blur-2xl opacity-30"
          style={{
            background: 'radial-gradient(circle, #0284c7 0%, #1e3a8a 60%, transparent 80%)',
          }}
        />

        {/* Soft blended flowing waves - zero hard strokes, purely smooth gradient transitions */}
        <svg
          className="w-full h-full absolute inset-0 pointer-events-none"
          viewBox="0 0 256 900"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Filter for silky soft edges */}
            <filter id="softWaveBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
            <filter id="deepWaveBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="14" />
            </filter>

            {/* Subtle blended gradients that melt seamlessly into midnight navy */}
            <linearGradient id="blendWave1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.4" />
              <stop offset="45%" stopColor="#072a6b" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#021438" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#021438" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="blendWave2" x1="0%" y1="30%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.32" />
              <stop offset="50%" stopColor="#093175" stopOpacity="0.18" />
              <stop offset="90%" stopColor="#010d2b" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="blendWave3" x1="20%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.22" />
              <stop offset="40%" stopColor="#03459c" stopOpacity="0.12" />
              <stop offset="80%" stopColor="#010d2b" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="blendWave4" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#05245c" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#010d2b" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Deep atmospheric wave layer */}
          <path
            d="M -60 340 C 40 410, 80 270, 270 340 L 270 920 L -60 920 Z"
            fill="url(#blendWave1)"
            filter="url(#deepWaveBlur)"
          />

          {/* Mid organic wave flowing across Quarantine & Reports */}
          <path
            d="M -50 490 C 40 430, 110 570, 280 470 L 280 920 L -50 920 Z"
            fill="url(#blendWave2)"
            filter="url(#softWaveBlur)"
          />

          {/* Lower organic wave swelling gently behind the bottom card */}
          <path
            d="M -40 640 C 70 540, 130 730, 280 590 L 280 920 L -40 920 Z"
            fill="url(#blendWave3)"
            filter="url(#softWaveBlur)"
          />

          {/* Base foundation wave curving from bottom left */}
          <path
            d="M -40 760 C 60 700, 150 810, 280 730 L 280 920 L -40 920 Z"
            fill="url(#blendWave4)"
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

          <div className="font-extrabold text-2xl text-white tracking-tight flex items-center">
            NetrIQ
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
