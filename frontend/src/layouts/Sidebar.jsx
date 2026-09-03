import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sidebar001,
  Sidebar001Header,
  Sidebar001Content,
  Sidebar001Group,
  Sidebar001Item,
  Sidebar001Section,
  Sidebar001Footer,
} from '../components/animations/Sidebar001';
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
  const { hasCapability } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => (e) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <Sidebar001 defaultWidth={250} minWidth={200} maxWidth={320}>
      {/* Brand Header */}
      <Sidebar001Header>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-sm tracking-wider text-slate-100 flex items-center gap-1.5">
              NETRIQ <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-sans uppercase font-semibold">Core</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">Autonomous Dual-Layer NIDS</p>
          </div>
        </div>
      </Sidebar001Header>

      {/* Nav Content */}
      <Sidebar001Content>
        {/* Core Operations Section */}
        <Sidebar001Section label="Security Operations">
          {hasCapability('VIEW_SMART_SUMMARY') && (
            <Sidebar001Item
              href="/dashboard"
              label={
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Smart Summary</span>
                </span>
              }
              isActive={location.pathname === '/dashboard'}
              onClick={handleNavigate('/dashboard')}
            />
          )}

          <Sidebar001Item
            href="/monitoring"
            label={
              <span className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Capture</span>
              </span>
            }
            isActive={location.pathname === '/monitoring'}
            onClick={handleNavigate('/monitoring')}
          />

          <Sidebar001Item
            href="/incidents"
            label={
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Incidents</span>
              </span>
            }
            isActive={location.pathname === '/incidents'}
            onClick={handleNavigate('/incidents')}
          />
        </Sidebar001Section>

        {/* Intelligence & Analytics Group */}
        <Sidebar001Section label="Intelligence">
          <Sidebar001Group label="Analytics & Audit" defaultOpen={true} icon={<BarChart3 />}>
            <Sidebar001Item
              href="/history"
              label={
                <span className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Traffic History</span>
                </span>
              }
              isActive={location.pathname === '/history'}
              onClick={handleNavigate('/history')}
            />

            <Sidebar001Item
              href="/analytics"
              label={
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Analytics</span>
                </span>
              }
              isActive={location.pathname === '/analytics'}
              onClick={handleNavigate('/analytics')}
            />

            <Sidebar001Item
              href="/reports"
              label={
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reports</span>
                </span>
              }
              isActive={location.pathname === '/reports'}
              onClick={handleNavigate('/reports')}
            />
          </Sidebar001Group>

          <Sidebar001Group label="AI & Models" defaultOpen={true} icon={<Cpu />}>
            <Sidebar001Item
              href="/ai-performance"
              label={
                <span className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  <span>AI Performance</span>
                </span>
              }
              isActive={location.pathname === '/ai-performance'}
              onClick={handleNavigate('/ai-performance')}
            />
          </Sidebar001Group>
        </Sidebar001Section>

        {/* System Administration */}
        {(hasCapability('MANAGE_USERS') || hasCapability('MANAGE_SETTINGS')) && (
          <Sidebar001Section label="Administration">
            {hasCapability('MANAGE_USERS') && (
              <Sidebar001Item
                href="/users"
                label={
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>User Management</span>
                  </span>
                }
                isActive={location.pathname === '/users'}
                onClick={handleNavigate('/users')}
              />
            )}

            {hasCapability('MANAGE_SETTINGS') && (
              <Sidebar001Item
                href="/settings"
                label={
                  <span className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>System Settings</span>
                  </span>
                }
                isActive={location.pathname === '/settings'}
                onClick={handleNavigate('/settings')}
              />
            )}
          </Sidebar001Section>
        )}
      </Sidebar001Content>

      {/* Status Footer */}
      <Sidebar001Footer>
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            NIDS Engine
          </span>
          <span className="text-emerald-400 uppercase font-semibold">Active</span>
        </div>
      </Sidebar001Footer>
    </Sidebar001>
  );
};
