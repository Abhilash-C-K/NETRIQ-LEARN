import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Dock } from '../components/animations/Dock';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  Users,
  Settings,
} from 'lucide-react';

export const AppLayout = () => {
  const navigate = useNavigate();
  const { hasCapability } = useAuth();

  const dockItems = [
    {
      icon: <Shield className="w-5 h-5 text-cyan-400" />,
      label: 'Smart Summary',
      onClick: () => navigate('/dashboard'),
    },
    {
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      label: 'Live Capture',
      onClick: () => navigate('/monitoring'),
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      label: 'Incidents',
      separator: true,
      onClick: () => navigate('/incidents'),
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-purple-400" />,
      label: 'Analytics',
      onClick: () => navigate('/analytics'),
    },
    {
      icon: <FileText className="w-5 h-5 text-blue-400" />,
      label: 'Reports',
      separator: true,
      onClick: () => navigate('/reports'),
    },
    ...(hasCapability('MANAGE_USERS')
      ? [
          {
            icon: <Users className="w-5 h-5 text-indigo-400" />,
            label: 'User Management',
            onClick: () => navigate('/users'),
          },
        ]
      : []),
    ...(hasCapability('MANAGE_SETTINGS')
      ? [
          {
            icon: <Settings className="w-5 h-5 text-slate-300" />,
            label: 'System Settings',
            onClick: () => navigate('/settings'),
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 pb-20 bg-slate-950/60">
          <Outlet />
        </main>

        {/* Floating Quick Access Dock */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
          <Dock
            items={dockItems}
            magnification={1.7}
            distance={140}
            iconSize={38}
            gap={6}
            borderRadius={20}
            className="bg-slate-900/90 border-slate-700/60 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-slate-200"
          />
        </div>
      </div>
    </div>
  );
};
