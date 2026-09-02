import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Activity,
  AlertTriangle,
  History,
  BarChart3,
  FileText,
  Cpu,
  Users,
  Settings,
  Flame,
} from 'lucide-react';

export const Sidebar = () => {
  const { hasCapability, role } = useAuth();

  const navItems = [
    {
      label: 'Smart Summary',
      path: '/dashboard',
      icon: Shield,
      capability: 'VIEW_SMART_SUMMARY',
    },
    {
      label: 'Live Capture',
      path: '/monitoring',
      icon: Activity,
    },
    {
      label: 'Incidents',
      path: '/incidents',
      icon: AlertTriangle,
    },
    {
      label: 'Traffic History',
      path: '/history',
      icon: History,
    },
    {
      label: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: FileText,
    },
    {
      label: 'AI Performance',
      path: '/ai-performance',
      icon: Cpu,
    },
    {
      label: 'User Management',
      path: '/users',
      icon: Users,
      capability: 'MANAGE_USERS',
    },
    {
      label: 'System Settings',
      path: '/settings',
      icon: Settings,
      capability: 'MANAGE_SETTINGS',
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.capability) return true;
    return hasCapability(item.capability);
  });

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/50">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-cyan">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-mono font-bold text-lg tracking-wider text-slate-100 flex items-center gap-1.5">
            NETRIQ <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-sans uppercase">Core</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-mono tracking-tight">Autonomous Dual-Layer NIDS</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
          Security Modules
        </div>
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 font-semibold pl-2.5 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 font-mono text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            NIDS Engine
          </span>
          <span className="text-emerald-400 uppercase font-semibold">Active</span>
        </div>
      </div>
    </aside>
  );
};
