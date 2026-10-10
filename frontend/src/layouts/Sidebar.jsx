import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Activity,
  Network,
  AlertTriangle,
  Lock,
  Sliders,
  Radio,
  FileText,
  Server,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'dashboard',
      path: '/dashboard',
      label: '01. Dashboard',
      subtitle: 'SOC Control Center',
      icon: Shield,
      badge: 'Main',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'traffic-layer1',
      path: '/traffic-layer1',
      aliases: ['/monitoring'],
      label: '02. Live Traffic',
      subtitle: 'Layer 1 Pre-Firewall',
      icon: Activity,
      badge: 'L1',
      badgeColor: 'bg-blue-600/25 text-blue-300 border-blue-500/40',
    },
    {
      id: 'network-layer2',
      path: '/network-layer2',
      aliases: ['/analytics'],
      label: '03. Internal Network',
      subtitle: 'Layer 2 Topology',
      icon: Network,
      badge: 'L2 Flow',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      id: 'threats',
      path: '/threats',
      aliases: ['/incidents'],
      label: '04. Threat Detection',
      subtitle: 'Alerts & SHAP Insights',
      icon: AlertTriangle,
      badge: 'Alerts',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'quarantine',
      path: '/quarantine',
      label: '05. Device Quarantine',
      subtitle: 'Layer 2 Isolation & Audit',
      icon: Lock,
      badge: 'Isolation',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
    {
      id: 'reports-settings',
      path: '/reports-settings',
      aliases: ['/reports', '/settings'],
      label: '06. Reports & Settings',
      subtitle: 'Configs, AI & Health',
      icon: Sliders,
      badge: 'Admin',
      badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    },
  ];

  const isCurrentActive = (item) => {
    if (location.pathname === item.path) return true;
    if (item.aliases && item.aliases.includes(location.pathname)) return true;
    return false;
  };

  return (
    <aside className="w-64 bg-[#0a122c] border-r border-[#1a2650] flex flex-col justify-between select-none shrink-0 text-white z-20">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-[#1a2650] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-[#0a122c] rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-base text-white">NETRIQ</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                SOC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Dual-Layer Cyber Defense</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Control Center Pages
          </div>

          {navItems.map((item) => {
            const active = isCurrentActive(item);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all group cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 font-semibold'
                    : 'text-slate-300 hover:bg-[#142047] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      active ? 'bg-white/15 text-white' : 'bg-[#142047] text-slate-400 group-hover:text-blue-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs leading-tight font-semibold">{item.label}</div>
                    <div
                      className={`text-[10px] leading-tight ${
                        active ? 'text-blue-100 font-normal' : 'text-slate-400 group-hover:text-slate-300'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                      active ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer System Status Card */}
      <div className="p-4 border-t border-[#1a2650]">
        <div className="p-3 rounded-lg bg-[#0f1738] border border-[#1a2650] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-subtle-pulse" />
              NIDS Defense Core
            </span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase">ACTIVE</span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>Pre-Firewall (L1):</span>
            <span className="text-blue-400 font-mono">ENFORCING</span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>Zero-Trust (L2):</span>
            <span className="text-purple-400 font-mono">ISOLATING</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
