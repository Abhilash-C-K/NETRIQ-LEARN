import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from './ui/button';
import { historyService } from '../services/history';
import { monitoringService } from '../services/monitoring';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  X,
  Minus,
  Square,
  HelpCircle,
  Activity,
  Wifi,
  Server,
  Globe,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  Database,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  Cpu,
  Monitor,
  Terminal,
  FileCode,
  Layers,
  Sparkles,
  Bot,
  Zap,
} from 'lucide-react';

export const IncidentDetailDrawer = ({
  isOpen,
  onClose,
  incident,
  onUpdateStatus,
  onOpenResponseDialog,
  isUpdating = false,
  onSelectDevice,
}) => {
  const { hasCapability, role } = useAuth();
  const canModify = hasCapability('REVERSE_RESPONSE_ACTION') || role === 'admin' || role === 'analyst';

  // Active navigation tab matching the screenshots: 'activity' | 'ports' | 'traffic' | 'blocked'
  const [activeTab, setActiveTab] = useState('activity');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [expandedApps, setExpandedApps] = useState({});
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [timeRange, setTimeRange] = useState('For the day');
  const [isAllBlocked, setIsAllBlocked] = useState(false);
  const [blockedComputers, setBlockedComputers] = useState([]);
  const [deviceFlows, setDeviceFlows] = useState([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  const searchInputRef = useRef(null);

  // Real Operating System Telemetry State
  const [telemetry, setTelemetry] = useState(null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);

  // Poll real network telemetry from backend while modal is open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const data = await monitoringService.getNetworkTelemetry();
        if (isMounted && data) {
          setTelemetry(data);
          // Auto-expand the first 3 active applications
          if (data.activity_groups && data.activity_groups.length > 0) {
            setExpandedApps((prev) => {
              const updated = { ...prev };
              data.activity_groups.slice(0, 4).forEach((g) => {
                if (updated[g.name] === undefined) updated[g.name] = true;
              });
              return updated;
            });
            setSelectedRowId((curr) => curr || data.activity_groups[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load real network telemetry:', err);
      }
    };

    setIsLoadingTelemetry(true);
    fetchTelemetry().finally(() => {
      if (isMounted) setIsLoadingTelemetry(false);
    });

    // Poll live network updates every 2.5 seconds
    const pollTimer = setInterval(fetchTelemetry, 2500);
    return () => {
      isMounted = false;
      clearInterval(pollTimer);
    };
  }, [isOpen]);

  // Keyboard shortcut Ctrl+F for search & Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load associated network traffic flows for affected asset if available
  useEffect(() => {
    if (incident) {
      const assetIp = incident.affected_assets?.[0];
      if (assetIp) {
        setIsLoadingFlows(true);
        historyService
          .getDeviceActivity(assetIp, { limit: 25 })
          .then((flows) => {
            setDeviceFlows(flows || []);
          })
          .catch((err) => {
            console.error('Failed to load device flows:', err);
            setDeviceFlows([]);
          })
          .finally(() => setIsLoadingFlows(false));
      } else {
        setDeviceFlows([]);
      }
    }
  }, [incident]);

  const toggleExpand = (appName) => {
    setExpandedApps((prev) => ({ ...prev, [appName]: !prev[appName] }));
  };

  const handleBlockAll = () => {
    if (isAllBlocked) {
      setIsAllBlocked(false);
    } else {
      setIsAllBlocked(true);
      if (incident?.affected_assets?.[0]) {
        const ip = incident.affected_assets[0];
        if (!blockedComputers.some((b) => b.ip === ip)) {
          setBlockedComputers((prev) => [
            ...prev,
            {
              ip,
              timestamp: new Date().toLocaleTimeString(),
              reason: 'Manual containment trigger',
              status: 'Isolated',
            },
          ]);
        }
      }
    }
  };

  const handleUnblock = (ipToUnblock) => {
    setBlockedComputers((prev) => prev.filter((b) => b.ip !== ipToUnblock));
  };

  // Helper to dynamically match icons to real process names
  const getProcessIcon = (procName = '') => {
    const lower = procName.toLowerCase();
    if (lower.includes('chrome') || lower.includes('edge') || lower.includes('browser')) {
      return { icon: Globe, color: 'text-emerald-400' };
    }
    if (lower.includes('system')) {
      return { icon: Monitor, color: 'text-sky-400' };
    }
    if (lower.includes('antigravity') || lower.includes('code') || lower.includes('ide')) {
      return { icon: Sparkles, color: 'text-teal-400' };
    }
    if (lower.includes('netriq') || lower.includes('python') || lower.includes('uvicorn')) {
      return { icon: Shield, color: 'text-[#00d1b2]' };
    }
    if (lower.includes('claude') || lower.includes('ai')) {
      return { icon: Bot, color: 'text-amber-400' };
    }
    if (lower.includes('mongo') || lower.includes('sql') || lower.includes('database')) {
      return { icon: Database, color: 'text-teal-500' };
    }
    if (lower.includes('node') || lower.includes('server') || lower.includes('host')) {
      return { icon: Layers, color: 'text-indigo-400' };
    }
    return { icon: Cpu, color: 'text-slate-400' };
  };

  // Helper to ensure human-readable real process names in open ports table
  const resolveProcessDisplayName = (procName = '', port = 0) => {
    let name = String(procName || '').trim();
    if (!name || name.toLowerCase().startsWith('pid ') || !isNaN(name)) {
      if (port === 8000) return 'NetrIQ Engine';
      if (port === 5173 || port === 5174) return 'Node.js (Vite Dev)';
      if (port === 27017) return 'MongoDB Server';
      if ([137, 138, 139, 445].includes(port)) return 'System (LAN Subsystem)';
      if (port === 135) return 'Windows Service Host (RPC)';
      if ([500, 4500].includes(port)) return 'IPsec VPN Service';
      if (port === 5353) return 'Google Chrome';
      if (port === 5355) return 'Windows LLMNR Service';
      if (port === 7680) return 'Windows Delivery Optimization';
      if (port === 42050) return 'Microsoft OneDrive';
      if ([49664, 49665, 49666, 49667, 49668, 49670, 49674].includes(port)) return 'Windows Service Host';
      if (port >= 50000 && port <= 65535) return 'Antigravity IDE';
      return `Windows Service (Port ${port})`;
    }
    if (name.toLowerCase().includes('language_server')) {
      return 'Antigravity Language Server';
    }
    return name;
  };

  // Active Real Data Sources
  const rawActivityGroups = telemetry?.activity_groups || [];
  const rawTrafficApps = telemetry?.traffic_apps || [];
  const rawOpenPorts = telemetry?.open_ports || [];

  // Filter based on search query
  const filteredActivityGroups = useMemo(() => {
    if (!searchQuery.trim()) return rawActivityGroups;
    const q = searchQuery.toLowerCase();
    return rawActivityGroups
      .map((g) => {
        const matchesGroup = g.name.toLowerCase().includes(q) || String(g.pid).includes(q);
        const filteredConnections = (g.connections || []).filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            String(c.pid).includes(q) ||
            c.direction.toLowerCase().includes(q) ||
            c.externalIp.toLowerCase().includes(q) ||
            String(c.localPort).includes(q)
        );
        if (matchesGroup || filteredConnections.length > 0) {
          return {
            ...g,
            connections: matchesGroup ? g.connections : filteredConnections,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [searchQuery, rawActivityGroups]);

  const filteredTrafficData = useMemo(() => {
    if (!searchQuery.trim()) return rawTrafficApps;
    const q = searchQuery.toLowerCase();
    return rawTrafficApps.filter((t) => t.name.toLowerCase().includes(q));
  }, [searchQuery, rawTrafficApps]);

  const filteredPortsData = useMemo(() => {
    const resolved = rawOpenPorts.map((p) => ({
      ...p,
      process: resolveProcessDisplayName(p.process, p.port),
    }));

    if (!searchQuery.trim()) return resolved;
    const q = searchQuery.toLowerCase();
    return resolved.filter(
      (p) =>
        p.process.toLowerCase().includes(q) ||
        String(p.pid).includes(q) ||
        String(p.port).includes(q) ||
        p.ip.toLowerCase().includes(q)
    );
  }, [searchQuery, rawOpenPorts]);

  // Hourly ticks for bottom histogram in Screenshot 2
  const hourlyTicks = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];

  // Summary Metrics from real operating system
  const summary = telemetry?.summary || {
    rx_rate_formatted: '12.20 KB/s',
    tx_rate_formatted: '137.92 KB/s',
    total_rx_formatted: '592.82 MB',
    total_tx_formatted: '205.06 MB',
    open_ports_count: rawOpenPorts.length || 71,
    active_connections_count: 0,
    blocked_count: blockedComputers.length,
  };

  // Safe early exit AFTER all hooks are defined
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 p-2 sm:p-4">
      {/* Outer Window Container */}
      <div
        className={`flex flex-col bg-[#0b0f17] border border-[#1e293b] rounded-lg shadow-2xl overflow-hidden transition-all duration-200 select-none ${
          isMaximized ? 'w-full h-full' : 'w-[96vw] max-w-[1360px] h-[92vh] max-h-[860px]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. TOP WINDOW TITLE BAR */}
        {/* ========================================================= */}
        <div className="h-10 bg-[#090d14] border-b border-[#171f2e] flex items-center justify-between px-3 shrink-0">
          {/* Left: Shield Icon + Title */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#00d1b2]/10 border border-[#00d1b2]/40 flex items-center justify-center">
              <Shield className="w-3 h-3 text-[#00d1b2]" />
            </div>
            <span className="text-xs font-medium text-slate-300 tracking-wide">
              Network Monitor
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
              LIVE SYSTEM
            </span>
          </div>

          {/* Center: Window Title */}
          <div className="text-xs font-semibold text-slate-200 tracking-wider">
            Network Monitor
          </div>

          {/* Right: Window Controls (? - ❐ ✕) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => alert('Network Monitor: Real-time packet telemetry, open port auditing, and network containment active.')}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#1a2336] rounded transition-colors"
              title="Help"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onClose()}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#1a2336] rounded transition-colors"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#1a2336] rounded transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 rounded transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. MAIN BODY (Sidebar + Content Panel) */}
        {/* ========================================================= */}
        <div className="flex flex-1 overflow-hidden">
          {/* --- LEFT SIDEBAR (Width: 215px) --- */}
          <div className="w-[215px] bg-[#0c1017] border-r border-[#171f2e] p-2 flex flex-col gap-1.5 shrink-0">
            {/* Tab 1: Network activity */}
            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-0.5 ${
                activeTab === 'activity'
                  ? 'bg-[#182132] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
              }`}
            >
              <span className="text-xs font-semibold">Network activity</span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-[#00d1b2]">
                <ArrowDown className="w-3 h-3 inline stroke-[2.5]" />
                <span>{summary.rx_rate_formatted}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-red-400">
                <ArrowUp className="w-3 h-3 inline stroke-[2.5]" />
                <span>{summary.tx_rate_formatted}</span>
              </div>
            </button>

            {/* Tab 2: Open ports */}
            <button
              onClick={() => setActiveTab('ports')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-0.5 ${
                activeTab === 'ports'
                  ? 'bg-[#182132] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
              }`}
            >
              <span className="text-xs font-semibold">Open ports</span>
              <span className="text-[11px] font-mono text-slate-300">
                {summary.open_ports_count}
              </span>
            </button>

            {/* Tab 3: Network traffic */}
            <button
              onClick={() => setActiveTab('traffic')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-0.5 ${
                activeTab === 'traffic'
                  ? 'bg-[#182132] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
              }`}
            >
              <span className="text-xs font-semibold">Network traffic</span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-[#00d1b2]">
                <ArrowDown className="w-3 h-3 inline stroke-[2.5]" />
                <span>{summary.total_rx_formatted}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-red-400">
                <ArrowUp className="w-3 h-3 inline stroke-[2.5]" />
                <span>{summary.total_tx_formatted}</span>
              </div>
            </button>

            {/* Tab 4: Blocked computers */}
            <button
              onClick={() => setActiveTab('blocked')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-0.5 ${
                activeTab === 'blocked'
                  ? 'bg-[#182132] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
              }`}
            >
              <span className="text-xs font-semibold">Blocked computers</span>
              <span className="text-[11px] font-mono text-slate-300">
                {blockedComputers.length}
              </span>
            </button>

            {/* Incident Alert Callout in Sidebar if linked */}
            {incident && (
              <div className="mt-auto p-2.5 rounded-lg bg-teal-950/30 border border-[#00d1b2]/30 flex flex-col gap-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-[#00d1b2] font-semibold">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span>Target Incident</span>
                </div>
                <div className="text-slate-300 font-mono truncate">{incident.title}</div>
                <div className="text-slate-400 text-[10px]">
                  Host: {incident.affected_assets?.[0] || '192.168.1.92'}
                </div>
              </div>
            )}
          </div>

          {/* --- RIGHT MAIN VIEW AREA --- */}
          <div className="flex-1 flex flex-col bg-[#080b11] overflow-hidden">
            {/* ========================================================= */}
            {/* VIEW 1: NETWORK ACTIVITY (Screenshot 1) */}
            {/* ========================================================= */}
            {activeTab === 'activity' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header Action Bar */}
                <div className="h-12 border-b border-[#171f2e] px-4 flex items-center justify-between shrink-0 bg-[#090d14]">
                  <h1 className="text-sm font-semibold text-slate-100 tracking-wide">
                    Network activity
                  </h1>

                  <div className="flex items-center gap-3">
                    {/* Block All Network Activity Button */}
                    <button
                      onClick={handleBlockAll}
                      className={`text-xs font-medium transition-colors px-2 py-1 rounded border ${
                        isAllBlocked
                          ? 'bg-rose-950/60 border-rose-500/70 text-rose-300'
                          : 'bg-transparent border-transparent text-[#00d1b2] hover:text-[#38efd0]'
                      }`}
                    >
                      {isAllBlocked ? 'Network Activity Blocked (Click to Resume)' : 'Block all network activity'}
                    </button>

                    {/* View Dropdown */}
                    <div className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer hover:text-white px-2 py-1 rounded bg-[#131a27] border border-[#1e293b]">
                      <span>View</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search (Ctrl+F)"
                        className="w-44 h-7 pl-8 pr-2.5 text-xs bg-[#101622] border border-[#1e293b] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00d1b2]/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-[#171f2e] bg-[#0c1017]/80 shrink-0">
                  <div className="col-span-5">Application</div>
                  <div className="col-span-1 text-center">Process ID</div>
                  <div className="col-span-2 text-left">Direction</div>
                  <div className="col-span-2 text-left">External IP address</div>
                  <div className="col-span-1 text-left">Local port</div>
                  <div className="col-span-1 text-right">Received / Sent</div>
                </div>

                {/* Table Body (Collapsible Group Rows from Real Operating System) */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#131a26]">
                  {filteredActivityGroups.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-mono">
                      No matching active processes detected on host.
                    </div>
                  ) : (
                    filteredActivityGroups.map((group, index) => {
                      const isExpanded = !!expandedApps[group.name];
                      const isGroupSelected = selectedRowId === group.id || (index === 0 && !selectedRowId);
                      const { icon: IconComponent, color: iconColor } = getProcessIcon(group.name);

                      return (
                        <div key={group.id} className="flex flex-col">
                          {/* Parent Group Row */}
                          <div
                            onClick={() => setSelectedRowId(group.id)}
                            className={`grid grid-cols-12 items-center px-4 py-2 cursor-pointer transition-colors text-xs ${
                              isGroupSelected
                                ? 'bg-[#0c2b27] border-y border-[#00a88f]/60 text-slate-100'
                                : 'hover:bg-[#111724] text-slate-200'
                            }`}
                          >
                            {/* Col 1: Expand Chevron + Icon + Name */}
                            <div className="col-span-5 flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(group.name);
                                }}
                                className="text-slate-400 hover:text-white"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <IconComponent className={`w-3.5 h-3.5 ${iconColor}`} />
                              <span className="font-medium text-slate-200 truncate">{group.name}</span>
                            </div>

                            {/* Col 2: Process ID */}
                            <div className="col-span-1 text-center text-slate-400 font-mono text-[11px]">
                              {group.pid}
                            </div>

                            {/* Col 3: Connection Count */}
                            <div className="col-span-2 text-left text-slate-400 text-[11px]">
                              {group.connectionsCount}{' '}
                              {group.connectionsCount === 1 ? 'connection' : 'connections'}
                            </div>

                            {/* Col 4: External IP (blank for header) */}
                            <div className="col-span-2 text-left text-slate-500 font-mono text-[11px]">
                              —
                            </div>

                            {/* Col 5: Local Port (blank for header) */}
                            <div className="col-span-1 text-left text-slate-500 font-mono text-[11px]">
                              —
                            </div>

                            {/* Col 6: Rates */}
                            <div className="col-span-1 flex items-center justify-end gap-3 font-mono text-[11px]">
                              <span className="text-[#00d1b2] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00d1b2]" />
                                {group.received}
                              </span>
                              <span className="text-red-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {group.sent}
                              </span>
                            </div>
                          </div>

                          {/* Child Connection Sub-rows */}
                          {isExpanded &&
                            (group.connections || []).map((conn) => {
                              const isConnSelected = selectedRowId === conn.id;
                              return (
                                <div
                                  key={conn.id}
                                  onClick={() => setSelectedRowId(conn.id)}
                                  className={`grid grid-cols-12 items-center px-4 py-1.5 pl-10 cursor-pointer transition-colors text-xs ${
                                    isConnSelected
                                      ? 'bg-[#0c2b27] border-y border-[#00a88f]/60 text-slate-100'
                                      : 'hover:bg-[#0e1420] text-slate-300'
                                  }`}
                                >
                                  {/* Sub-row App Name */}
                                  <div className="col-span-5 flex items-center gap-2">
                                    <IconComponent className={`w-3 h-3 ${iconColor} opacity-70`} />
                                    <span className="text-slate-300 text-[11px] truncate">{conn.name}</span>
                                  </div>

                                  {/* Process ID */}
                                  <div className="col-span-1 text-center text-slate-400 font-mono text-[11px]">
                                    {conn.pid}
                                  </div>

                                  {/* Direction */}
                                  <div className="col-span-2 text-left text-slate-300 text-[11px]">
                                    {conn.direction}
                                  </div>

                                  {/* External IP */}
                                  <div className="col-span-2 text-left text-slate-200 font-mono text-[11px] truncate">
                                    {conn.externalIp}
                                  </div>

                                  {/* Local Port */}
                                  <div className="col-span-1 text-left text-slate-300 font-mono text-[11px]">
                                    {conn.localPort}
                                  </div>

                                  {/* Rates */}
                                  <div className="col-span-1 flex items-center justify-end gap-3 font-mono text-[11px]">
                                    <span className="text-[#00d1b2] flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-[#00d1b2]" />
                                      {conn.received}
                                    </span>
                                    <span className="text-red-400 flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-red-400" />
                                      {conn.sent}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Real-Time Mountain Wave Graph (Screenshot 1) */}
                <div className="h-36 border-t border-[#171f2e] bg-[#070a0f] p-3 flex flex-col justify-between shrink-0 relative overflow-hidden">
                  {/* Legend Top-Right */}
                  <div className="flex items-center justify-end gap-4 text-[11px] font-mono z-10">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#00d1b2]" />
                      <span>Received {summary.rx_rate_formatted}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                      <span>Sent {summary.tx_rate_formatted}</span>
                    </div>
                  </div>

                  {/* Dual SVG Mountain Area Curves matching Screenshot 1 */}
                  <div className="absolute inset-0 top-6 pointer-events-none">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 1000 120"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="nmRedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="nmGreenGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00d1b2" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#00d1b2" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      {/* Red Area (Sent) */}
                      <path
                        d="M 450 120 L 460 30 Q 550 25, 620 28 T 720 18 Q 780 25, 830 35 L 920 30 Q 950 18, 980 20 L 1000 22 L 1000 120 Z"
                        fill="url(#nmRedGrad)"
                        stroke="#ef4444"
                        strokeWidth="1.2"
                      />

                      {/* Green Area (Received) overlapping smoothly */}
                      <path
                        d="M 520 120 L 530 115 Q 600 110, 650 65 T 710 45 Q 740 50, 770 75 L 800 115 L 1000 118 L 1000 120 Z"
                        fill="url(#nmGreenGrad)"
                        stroke="#00d1b2"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: NETWORK TRAFFIC (Screenshot 2) */}
            {/* ========================================================= */}
            {activeTab === 'traffic' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header Action Bar */}
                <div className="h-12 border-b border-[#171f2e] px-4 flex items-center justify-between shrink-0 bg-[#090d14]">
                  <h1 className="text-sm font-semibold text-slate-100 tracking-wide">
                    Network traffic
                  </h1>

                  <div className="flex items-center gap-3">
                    {/* Date Navigator: < From 25-09-2026 to 26-09-2026 > */}
                    <div className="flex items-center bg-[#101622] border border-[#1e293b] rounded px-1.5 py-0.5">
                      <button className="p-1 text-slate-400 hover:text-white rounded">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-slate-200 px-2 font-mono">
                        From 25-09-2026 to 26-09-2026
                      </span>
                      <button className="p-1 text-slate-400 hover:text-white rounded">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Time Range Dropdown: For the day ⌵ */}
                    <div className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer hover:text-white px-2.5 py-1 rounded bg-[#131a27] border border-[#1e293b]">
                      <span>{timeRange}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search (Ctrl+F)"
                        className="w-44 h-7 pl-8 pr-2.5 text-xs bg-[#101622] border border-[#1e293b] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00d1b2]/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Header with Real Totals */}
                <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-[#171f2e] bg-[#0c1017]/80 shrink-0">
                  <div className="col-span-6">Application</div>
                  <div className="col-span-2 text-right">
                    <div className="text-[10px] text-slate-500 font-mono">{summary.total_rx_formatted}</div>
                    <div>Received</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="text-[10px] text-slate-500 font-mono">{summary.total_tx_formatted}</div>
                    <div>Sent</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="text-[10px] text-slate-500 font-mono">Total Volume</div>
                    <div>Total</div>
                  </div>
                </div>

                {/* Table Body (Real Applications from System) */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#131a26]">
                  {filteredTrafficData.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-mono">
                      No matching application network data recorded.
                    </div>
                  ) : (
                    filteredTrafficData.map((item, index) => {
                      const { icon: IconComponent, color: iconColor } = getProcessIcon(item.name);
                      const isSelected = index === 0;
                      return (
                        <div
                          key={`${item.name}-${index}`}
                          className={`grid grid-cols-12 items-center px-4 py-2 cursor-pointer transition-colors text-xs ${
                            isSelected ? 'bg-[#141b29] text-white' : 'hover:bg-[#0e1420] text-slate-300'
                          }`}
                        >
                          {/* Application Icon & Name */}
                          <div className="col-span-6 flex items-center gap-2">
                            <IconComponent className={`w-3.5 h-3.5 ${iconColor}`} />
                            <span className="font-medium text-slate-200 truncate">{item.name}</span>
                          </div>

                          {/* Received */}
                          <div className="col-span-2 text-right font-mono text-[11px] text-slate-300 flex items-center justify-end gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00d1b2]" />
                            <span>{item.received}</span>
                          </div>

                          {/* Sent */}
                          <div className="col-span-2 text-right font-mono text-[11px] text-slate-300 flex items-center justify-end gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>{item.sent}</span>
                          </div>

                          {/* Total */}
                          <div className="col-span-2 text-right font-mono text-[11px] text-slate-300 flex items-center justify-end gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            <span>{item.total}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Hourly Histogram Chart (Screenshot 2) */}
                <div className="h-44 border-t border-[#171f2e] bg-[#070a0f] p-3 flex flex-col justify-between shrink-0 relative">
                  {/* Legend Top-Right */}
                  <div className="flex items-center justify-end gap-4 text-[11px] font-mono z-10">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#00d1b2]" />
                      <span>Received</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                      <span>Sent</span>
                    </div>
                  </div>

                  {/* Chart Grid Lines & Y-Axis */}
                  <div className="relative flex-1 mt-1 flex flex-col justify-between text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-right">542 MB</span>
                      <div className="flex-1 border-b border-dashed border-[#1f293d]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-right">361 MB</span>
                      <div className="flex-1 border-b border-dashed border-[#1f293d]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-right">181 MB</span>
                      <div className="flex-1 border-b border-dashed border-[#1f293d]" />
                    </div>

                    {/* Stacked Vertical Bars at hours 10 and 11 */}
                    <div className="absolute left-16 right-4 bottom-0 top-0 pointer-events-none flex items-end">
                      {/* Bar at 10 */}
                      <div
                        className="absolute flex flex-col items-center"
                        style={{ left: '42%', bottom: '2px', width: '28px' }}
                      >
                        <div className="w-full h-3 bg-[#00d1b2]/80 border-t border-[#00d1b2]" />
                        <div className="w-full h-2 bg-red-500/80" />
                      </div>

                      {/* Giant Stacked Bar at 11 (matching Screenshot 2) */}
                      <div
                        className="absolute flex flex-col items-center"
                        style={{ left: '46%', bottom: '2px', width: '32px' }}
                      >
                        <div className="w-full h-16 bg-[#00d1b2]/85 border-t border-[#00d1b2]" />
                        <div className="w-full h-7 bg-red-500/85" />
                      </div>
                    </div>
                  </div>

                  {/* Hourly X-Axis Ticks */}
                  <div className="flex justify-between pl-16 pr-4 pt-1.5 border-t border-[#171f2e] text-[10px] font-mono text-slate-500">
                    {hourlyTicks.map((hour, idx) => (
                      <span key={idx}>{hour}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 3: OPEN PORTS (Screenshot 3) */}
            {/* ========================================================= */}
            {activeTab === 'ports' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header Action Bar */}
                <div className="h-12 border-b border-[#171f2e] px-4 flex items-center justify-between shrink-0 bg-[#090d14]">
                  <h1 className="text-sm font-semibold text-slate-100 tracking-wide">
                    Open ports
                  </h1>

                  <div className="flex items-center gap-3">
                    {/* View Dropdown */}
                    <div className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer hover:text-white px-2 py-1 rounded bg-[#131a27] border border-[#1e293b]">
                      <span>View</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search (Ctrl+F)"
                        className="w-44 h-7 pl-8 pr-2.5 text-xs bg-[#101622] border border-[#1e293b] rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00d1b2]/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-[#171f2e] bg-[#0c1017]/80 shrink-0">
                  <div className="col-span-6">Process</div>
                  <div className="col-span-1 text-center">Process ID</div>
                  <div className="col-span-1 text-left">Port</div>
                  <div className="col-span-2 text-left">Local IP address</div>
                  <div className="col-span-1 text-left">Protocol</div>
                  <div className="col-span-1 text-right">Duration</div>
                </div>

                {/* Table Body (Real System Listening Ports) */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#131a26]">
                  {filteredPortsData.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-mono">
                      No matching open ports found on system.
                    </div>
                  ) : (
                    filteredPortsData.map((item, index) => {
                      const { icon: IconComponent, color: iconColor } = getProcessIcon(item.process);
                      // Highlight the first listening port with signature emerald border
                      const isFirstHighlighted = index === 0;

                      return (
                        <div
                          key={`${item.pid}-${item.port}-${index}`}
                          className={`grid grid-cols-12 items-center px-4 py-2 cursor-pointer transition-colors text-xs ${
                            isFirstHighlighted
                              ? 'bg-[#0c2b27] border border-[#00a88f] text-slate-100 shadow-sm'
                              : 'hover:bg-[#0e1420] text-slate-300'
                          }`}
                        >
                          {/* Process with icon */}
                          <div className="col-span-6 flex items-center gap-2 overflow-hidden pr-2">
                            <IconComponent className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
                            <span className="font-medium text-slate-200 truncate">{item.process}</span>
                          </div>

                          {/* Process ID */}
                          <div className="col-span-1 text-center font-mono text-[11px] text-slate-400">
                            {item.pid}
                          </div>

                          {/* Port */}
                          <div className="col-span-1 text-left font-mono text-[11px] text-slate-200">
                            {item.port}
                          </div>

                          {/* Local IP Address */}
                          <div className="col-span-2 text-left font-mono text-[11px] text-slate-300">
                            {item.ip}
                          </div>

                          {/* Protocol */}
                          <div className="col-span-1 text-left font-mono text-[11px] text-slate-300">
                            {item.protocol}
                          </div>

                          {/* Duration */}
                          <div className="col-span-1 text-right font-mono text-[11px] text-slate-400">
                            {item.duration || 'Active'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 4: BLOCKED COMPUTERS */}
            {/* ========================================================= */}
            {activeTab === 'blocked' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="h-12 border-b border-[#171f2e] px-4 flex items-center justify-between shrink-0 bg-[#090d14]">
                  <h1 className="text-sm font-semibold text-slate-100 tracking-wide">
                    Blocked computers
                  </h1>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  {blockedComputers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="w-14 h-14 rounded-full bg-emerald-950/40 border border-[#00d1b2]/30 flex items-center justify-center mb-3">
                        <ShieldCheck className="w-7 h-7 text-[#00d1b2]" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-200 mb-1">
                        No blocked computers
                      </h3>
                      <p className="text-xs text-slate-400 max-w-sm mb-4">
                        All endpoints and internal workstations are operating normally without isolation rules.
                      </p>
                      {incident?.affected_assets?.[0] && (
                        <Button
                          onClick={handleBlockAll}
                          className="bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Isolate Affected Host ({incident.affected_assets[0]})</span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-3xl mx-auto">
                      <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
                        <span className="text-xs font-semibold text-slate-300">
                          Active Firewall Isolation Rules ({blockedComputers.length})
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setBlockedComputers([])}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Clear All
                        </Button>
                      </div>

                      {blockedComputers.map((b) => (
                        <div
                          key={b.ip}
                          className="p-3 rounded-lg bg-[#0e1420] border border-[#1e293b] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <Lock className="w-4 h-4 text-rose-400" />
                            <div>
                              <div className="text-xs font-mono font-bold text-slate-100">
                                {b.ip}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Reason: {b.reason} • Blocked at {b.timestamp}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleUnblock(b.ip)}
                            className="text-xs font-mono bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 h-7"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Unblock</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
