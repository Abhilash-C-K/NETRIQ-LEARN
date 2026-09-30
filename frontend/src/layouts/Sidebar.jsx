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
      {/* Brand Header with Official NETRIQ Logo */}
      <Sidebar001Header>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#303334] shrink-0 bg-[#141516] flex items-center justify-center p-0.5">
            <img src="/logo.jpeg" alt="NETRIQ Logo" className="w-full h-full object-cover rounded-md block" />
          </div>
          <div>
            <h1 className="font-corpta text-sm tracking-[0.12em] uppercase flex items-center gap-1 select-none">
              <span className="text-[#F1F0EA]">NETR</span>
              <span className="text-[#9AAA78]">IQ</span>
              <span className="text-[9px] font-sans font-medium bg-[#9AAA78]/15 text-[#9AAA78] border border-[#9AAA78]/30 px-1 py-0.2 rounded uppercase ml-1">
                SOC
              </span>
            </h1>
            <p className="text-[11px] text-[#A4A5A0] font-sans tracking-tight">Security Operations Platform</p>
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
                  <Shield className="w-3.5 h-3.5 text-[#71A99D]" />
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
                <Activity className="w-3.5 h-3.5 text-[#71A99D]" />
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
                <AlertTriangle className="w-3.5 h-3.5 text-[#D3A35D]" />
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
                  <History className="w-3.5 h-3.5 text-[#9AA8B2]" />
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
                  <BarChart3 className="w-3.5 h-3.5 text-[#9AA8B2]" />
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
                  <FileText className="w-3.5 h-3.5 text-[#9AA8B2]" />
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
                  <Cpu className="w-3.5 h-3.5 text-[#9AA8B2]" />
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
                    <Users className="w-3.5 h-3.5 text-[#7895B2]" />
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
                    <Settings className="w-3.5 h-3.5 text-[#9AA8B2]" />
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
        <div className="flex items-center justify-between text-[#9AA8B2] text-xs">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#71A99D]" />
            NIDS Engine
          </span>
          <span className="text-[#71A99D] uppercase font-semibold text-[11px]">Active</span>
        </div>
      </Sidebar001Footer>
    </Sidebar001>
  );
};
export default Sidebar;
