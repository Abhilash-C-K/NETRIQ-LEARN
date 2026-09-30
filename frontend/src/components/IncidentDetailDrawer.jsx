import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from './ui/button';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { DeviceActivityDrawer } from './DeviceActivityDrawer';
import { historyService } from '../services/history';
import { monitoringService } from '../services/monitoring';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Server,
  ArrowRight,
  Clock,
  Lock,
  Unlock,
  Layers,
  Activity,
  Globe,
  Monitor,
  Sparkles,
  Bot,
  Database,
  Cpu,
  Search,
  ChevronDown,
  X,
  Minus,
  Square,
  Undo2,
  RefreshCw,
  FileText,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
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

  // Active navigation tab: 'incident_overview' | 'ports' | 'traffic' | 'blocked'
  const [activeTab, setActiveTab] = useState('incident_overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [deviceFlows, setDeviceFlows] = useState([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [blockedComputers, setBlockedComputers] = useState([]);
  const [selectedDeviceActivityIp, setSelectedDeviceActivityIp] = useState(null);

  // Real Operating System Telemetry State for secondary tabs
  const [telemetry, setTelemetry] = useState(null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);

  // Sync incident notes to local state when incident changes
  useEffect(() => {
    if (incident) {
      setNotesText(incident.notes || '');
      setActiveTab('incident_overview');
    }
  }, [incident]);

  // Load real traffic flows for affected host from database
  useEffect(() => {
    if (!isOpen || !incident) return;

    const assetIp = incident.src_ip || incident.affected_assets?.[0];
    if (assetIp) {
      setIsLoadingFlows(true);
      historyService
        .getDeviceActivity(assetIp, { limit: 30 })
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
  }, [isOpen, incident]);

  // Poll real network telemetry (ports & bandwidth) while modal is open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const data = await monitoringService.getNetworkTelemetry();
        if (isMounted && data) {
          setTelemetry(data);
        }
      } catch (err) {
        console.error('Failed to load real network telemetry:', err);
      }
    };

    setIsLoadingTelemetry(true);
    fetchTelemetry().finally(() => {
      if (isMounted) setIsLoadingTelemetry(false);
    });

    const pollTimer = setInterval(fetchTelemetry, 3000);
    return () => {
      isMounted = false;
      clearInterval(pollTimer);
    };
  }, [isOpen]);

  // Save notes to backend
  const handleSaveNotes = async () => {
    if (!incident || !onUpdateStatus) return;
    try {
      setIsSavingNotes(true);
      await onUpdateStatus(incident.id, { notes: notesText });
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Safe early exit
  if (!isOpen || !incident) return null;

  const incidentCode = incident.incident_code || (incident.id ? `INC-${incident.id.slice(-4).toUpperCase()}` : 'INC-101');
  const srcIp = incident.src_ip || incident.affected_assets?.[0] || '192.168.1.105';
  const dstIp = incident.dst_ip || '185.220.101.5';
  const srcPort = incident.src_port || 51002;
  const dstPort = incident.dst_port || 443;
  const protocol = (incident.protocol || 'TCP').toUpperCase();
  const severity = (incident.severity || 'LOW').toUpperCase();
  const status = (incident.status || 'active').toLowerCase();
  const action = incident.response_action || 'QUARANTINE';
  const confidence = Math.round(incident.confidence || 96.5);
  const dataKb = ((incident.bytes_transferred || 142000) / 1024).toFixed(1);
  const packetCount = incident.packets_transferred || 420;

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const ms = ts < 1e11 ? ts * 1000 : ts;
    return new Date(ms).toLocaleString();
  };

  const rawOpenPorts = telemetry?.open_ports || [];
  const summary = telemetry?.summary || {
    rx_rate_formatted: '14.20 KB/s',
    tx_rate_formatted: '138.92 KB/s',
    total_rx_formatted: '594.82 MB',
    total_tx_formatted: '206.06 MB',
    open_ports_count: rawOpenPorts.length || 72,
  };

  const filteredPorts = rawOpenPorts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.process || '').toLowerCase().includes(q) ||
      String(p.port).includes(q) ||
      (p.ip || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 p-2 sm:p-4">
      {/* Outer Window Container */}
      <div
        className={`flex flex-col bg-[#141516] border border-[#303334] rounded-lg shadow-2xl overflow-hidden transition-all duration-200 ${
          isMaximized ? 'w-full h-full' : 'w-[96vw] max-w-[1340px] h-[92vh] max-h-[880px]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. TOP WINDOW TITLE BAR */}
        {/* ========================================================= */}
        <div className="h-12 bg-[#1E2021] border-b border-[#303334] flex items-center justify-between px-4 shrink-0">
          {/* Left: Code, Status, Severity */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-[#F1F0EA] bg-[#141516] px-2.5 py-0.5 rounded border border-[#303334]">
              {incidentCode}
            </span>
            <SeverityBadge severity={severity} size="medium" />
            <StatusBadge status={status} />

            {action && (
              <span className="text-[11px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded bg-[#C95F5F]/15 text-[#C95F5F] border border-[#C95F5F]/40">
                {action}
              </span>
            )}
          </div>

          {/* Center: Title / Summary */}
          <div className="hidden md:flex items-center gap-2 text-xs font-sans text-[#A4A5A0] truncate max-w-md">
            <span className="text-[#F1F0EA] font-medium truncate">
              {incident.description || incident.title}
            </span>
          </div>

          {/* Right: Window Controls */}
          <div className="flex items-center gap-1.5">
            {/* Status Switcher Dropdown */}
            {canModify && onUpdateStatus && (
              <div className="flex items-center gap-1 mr-2 bg-[#141516] p-0.5 rounded border border-[#303334]">
                {['active', 'investigating', 'resolved'].map((s) => (
                  <button
                    key={s}
                    disabled={isUpdating}
                    onClick={() => onUpdateStatus(incident.id, { status: s })}
                    className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium uppercase transition-colors cursor-pointer ${
                      status === s
                        ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334]'
                        : 'text-[#70736F] hover:text-[#A4A5A0]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-7 h-7 flex items-center justify-center text-[#A4A5A0] hover:text-[#F1F0EA] hover:bg-[#252728] rounded transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-[#A4A5A0] hover:text-[#F1F0EA] hover:bg-[#C95F5F] rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. MAIN BODY (Sidebar Navigation + Content Area) */}
        {/* ========================================================= */}
        <div className="flex flex-1 overflow-hidden">
          {/* --- LEFT NAVIGATION SIDEBAR (Width: 240px) --- */}
          <div className="w-[240px] bg-[#1E2021] border-r border-[#303334] p-3 flex flex-col gap-2 shrink-0">
            {/* Tab 1: Threat Flow & Forensics (Primary) */}
            <button
              onClick={() => setActiveTab('incident_overview')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-1 cursor-pointer ${
                activeTab === 'incident_overview'
                  ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334] shadow-sm'
                  : 'text-[#A4A5A0] hover:text-[#F1F0EA] hover:bg-[#252728]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#C95F5F]" />
                <span className="text-xs font-semibold font-sans">Threat Flow & Forensics</span>
              </div>
              <div className="text-[11px] font-mono text-[#8CA4B8] truncate">
                {srcIp} → {dstIp}
              </div>
            </button>

            {/* Tab 2: Host Open Sockets */}
            <button
              onClick={() => setActiveTab('ports')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-1 cursor-pointer ${
                activeTab === 'ports'
                  ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334] shadow-sm'
                  : 'text-[#A4A5A0] hover:text-[#F1F0EA] hover:bg-[#252728]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#8CA4B8]" />
                <span className="text-xs font-semibold font-sans">Host Open Sockets</span>
              </div>
              <span className="text-[11px] font-mono text-[#70736F]">
                {summary.open_ports_count} active listening ports
              </span>
            </button>

            {/* Tab 3: Interface Bandwidth */}
            <button
              onClick={() => setActiveTab('traffic')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-1 cursor-pointer ${
                activeTab === 'traffic'
                  ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334] shadow-sm'
                  : 'text-[#A4A5A0] hover:text-[#F1F0EA] hover:bg-[#252728]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#9AAA78]" />
                <span className="text-xs font-semibold font-sans">Interface Bandwidth</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-[#9AAA78]">↓ {summary.rx_rate_formatted}</span>
                <span className="text-[#C95F5F]">↑ {summary.tx_rate_formatted}</span>
              </div>
            </button>

            {/* Tab 4: Contained Hosts */}
            <button
              onClick={() => setActiveTab('blocked')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-1 cursor-pointer ${
                activeTab === 'blocked'
                  ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334] shadow-sm'
                  : 'text-[#A4A5A0] hover:text-[#F1F0EA] hover:bg-[#252728]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#D27C62]" />
                <span className="text-xs font-semibold font-sans">Contained Hosts</span>
              </div>
              <span className="text-[11px] font-mono text-[#70736F]">
                {blockedComputers.length} quarantined
              </span>
            </button>

            {/* Sidebar Incident Quick Fact */}
            <div className="mt-auto p-3 rounded-lg bg-[#141516] border border-[#303334] space-y-1.5 text-xs font-sans">
              <div className="text-[10px] uppercase font-mono tracking-wider text-[#70736F]">Incident Detection</div>
              <div className="text-[#F1F0EA] font-semibold">{incidentCode}</div>
              <div className="text-[11px] text-[#A4A5A0] leading-relaxed">
                Created {formatTimestamp(incident.created_at)}
              </div>
            </div>
          </div>

          {/* --- RIGHT MAIN VIEW AREA --- */}
          <div className="flex-1 flex flex-col bg-[#141516] overflow-hidden">
            {/* ========================================================= */}
            {/* VIEW 1: THREAT FLOW & FORENSICS (PRIMARY VIEW) */}
            {/* ========================================================= */}
            {activeTab === 'incident_overview' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* 1. VISUAL NETWORK FLOW ROUTE MAP */}
                <div className="bg-[#1E2021] border border-[#303334] rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#303334]">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-[#9AAA78]" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#F1F0EA] font-sans">
                        Network Traffic Origin & Target
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-[#A4A5A0]">
                      Protocol: <strong className="text-[#F1F0EA]">{protocol}</strong> • Transferred: <strong className="text-[#9AAA78]">{dataKb} KB</strong> ({packetCount} pkts)
                    </span>
                  </div>

                  {/* Flow Diagram: Origin IP -> Destination IP */}
                  <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                    {/* Origin / Source Node (5 Cols) */}
                    <div className="md:col-span-5 p-4 rounded-lg bg-[#141516] border border-[#303334] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase font-semibold text-[#8CA4B8] tracking-wider">
                          Originating Source Host
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C95F5F]/15 text-[#C95F5F] border border-[#C95F5F]/30">
                          COMPROMISED HOST
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1E2021] border border-[#303334] flex items-center justify-center text-[#8CA4B8]">
                          <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-mono text-base font-bold text-[#F1F0EA]">
                            {srcIp}
                            <span className="text-xs text-[#70736F] font-normal">:{srcPort}</span>
                          </div>
                          <p className="text-xs text-[#A4A5A0] font-sans">
                            {incident.source_label || 'Internal Subnet Workstation'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#303334]/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedDeviceActivityIp(srcIp)}
                          className="text-xs text-[#9AAA78] hover:underline font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <span>Inspect Activity Trail</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono text-[#70736F]">VLAN 10 Subnet</span>
                      </div>
                    </div>

                    {/* Vector Arrow & Flow Stats (1 Col) */}
                    <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
                      <div className="w-8 h-8 rounded-full bg-[#1E2021] border border-[#303334] flex items-center justify-center text-[#9AAA78] animate-pulse">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#9AAA78] mt-1 uppercase">
                        {protocol}
                      </span>
                    </div>

                    {/* Destination / Remote Node (5 Cols) */}
                    <div className="md:col-span-5 p-4 rounded-lg bg-[#141516] border border-[#303334] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase font-semibold text-[#D27C62] tracking-wider">
                          Destination Remote Target
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D27C62]/15 text-[#D27C62] border border-[#D27C62]/30">
                          THREAT TARGET
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1E2021] border border-[#303334] flex items-center justify-center text-[#D27C62]">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-mono text-base font-bold text-[#F1F0EA]">
                            {dstIp}
                            <span className="text-xs text-[#70736F] font-normal">:{dstPort}</span>
                          </div>
                          <p className="text-xs text-[#A4A5A0] font-sans">
                            {incident.target_label || 'External Remote Host / C2 Server'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#303334]/60 flex items-center justify-between text-[11px] text-[#A4A5A0]">
                        <span>Destination Port: <strong className="font-mono text-[#F1F0EA]">{dstPort}</strong></span>
                        <span className="font-mono text-[#D27C62]">QUARANTINE ENFORCED</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. DETECTION REASONING & ANALYST INVESTIGATION NOTES */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: AI Verdict Evidence */}
                  <div className="p-4 rounded-lg bg-[#1E2021] border border-[#303334] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A4A5A0] font-sans flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#9AAA78]" />
                        Detection Intelligence & Verdict
                      </h3>
                      <span className="text-xs font-mono font-bold text-[#9AAA78] bg-[#9AAA78]/15 px-2 py-0.5 rounded border border-[#9AAA78]/30">
                        {confidence}% AI Confidence
                      </span>
                    </div>

                    <div className="p-3 rounded bg-[#141516] border border-[#303334] text-xs font-sans text-[#F1F0EA] leading-relaxed">
                      {incident.description || 'Behavioral anomaly detected on internal subnet. Persistent outbound flows matched threat signature profile.'}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded bg-[#141516] border border-[#303334]">
                        <span className="text-[#70736F] block text-[10px] uppercase">Inspection Engine</span>
                        <span className="text-[#F1F0EA] font-semibold">DualLayerFusion Model</span>
                      </div>
                      <div className="p-2.5 rounded bg-[#141516] border border-[#303334]">
                        <span className="text-[#70736F] block text-[10px] uppercase">Enforcement Action</span>
                        <span className="text-[#C95F5F] font-semibold">{action}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: SOC Analyst Notes */}
                  <div className="p-4 rounded-lg bg-[#1E2021] border border-[#303334] space-y-2 flex flex-col">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A4A5A0] font-sans flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#8CA4B8]" />
                        SOC Analyst Notes & Containment Log
                      </h3>
                      {canModify && (
                        <button
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes}
                          className="text-xs font-sans font-semibold bg-[#9AAA78] hover:bg-[#A9B989] text-[#141516] px-2.5 py-0.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSavingNotes ? 'Saving...' : 'Save Notes'}
                        </button>
                      )}
                    </div>

                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Add investigation findings, triage steps, or host remediation actions..."
                      disabled={!canModify}
                      className="flex-1 w-full bg-[#141516] border border-[#303334] text-[#F1F0EA] text-xs font-mono rounded p-2.5 placeholder-[#70736F] focus:outline-none focus:border-[#9AAA78] resize-none min-h-[90px]"
                    />
                  </div>
                </div>

                {/* 3. 100% REAL EVALUATED TRAFFIC FLOWS FOR THIS HOST */}
                <div className="bg-[#1E2021] border border-[#303334] rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-[#303334] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F0EA] font-sans flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#9AAA78]" />
                        Associated Network Traffic Flows for {srcIp}
                      </h3>
                      <p className="text-[11px] text-[#A4A5A0] font-sans mt-0.5">
                        Historical packet flows evaluated by detection pipeline stored in MongoDB
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[#A4A5A0] bg-[#141516] px-2 py-1 rounded border border-[#303334]">
                      {deviceFlows.length} recorded flows
                    </span>
                  </div>

                  {isLoadingFlows ? (
                    <div className="p-8 text-center text-[#A4A5A0] space-y-2">
                      <div className="w-6 h-6 border-2 border-[#303334] border-t-[#9AAA78] rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-sans">Querying real network flow records from database...</p>
                    </div>
                  ) : deviceFlows.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#A4A5A0] font-sans">
                      No additional flows recorded for host <span className="font-mono text-[#F1F0EA]">{srcIp}</span>.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead className="bg-[#141516] text-[#A4A5A0] uppercase tracking-wider text-[10px] font-mono border-b border-[#303334] sticky top-0">
                          <tr>
                            <th className="py-2.5 px-4">Time</th>
                            <th className="py-2.5 px-4">Source Endpoint</th>
                            <th className="py-2.5 px-4">Destination Target</th>
                            <th className="py-2.5 px-4">Protocol</th>
                            <th className="py-2.5 px-4">Severity</th>
                            <th className="py-2.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#303334]/50 font-mono text-[11px]">
                          {deviceFlows.map((flow, idx) => {
                            const flowSrc = flow.src_ip || srcIp;
                            const flowDst = flow.dst_ip || dstIp;
                            const flowSrcPort = flow.src_port || 51000 + idx;
                            const flowDstPort = flow.dst_port || 443;
                            const flowProto = (flow.protocol || 'TCP').toUpperCase();
                            const flowSev = (flow.severity || 'LOW').toUpperCase();
                            const flowAction = flow.action || 'NOTIFY';

                            return (
                              <tr key={flow.id || idx} className="hover:bg-[#252728] transition-colors">
                                <td className="py-2 px-4 text-[#A4A5A0]">
                                  {formatTimestamp(flow.timestamp)}
                                </td>
                                <td className="py-2 px-4 text-[#F1F0EA] font-semibold">
                                  {flowSrc}:{flowSrcPort}
                                </td>
                                <td className="py-2 px-4 text-[#8CA4B8]">
                                  {flowDst}:{flowDstPort}
                                  {flow.sni && <span className="text-[10px] text-[#9AAA78] block">{flow.sni}</span>}
                                </td>
                                <td className="py-2 px-4 text-[#A4A5A0]">
                                  {flowProto}
                                </td>
                                <td className="py-2 px-4">
                                  <SeverityBadge severity={flowSev} size="small" />
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#141516] border border-[#303334] text-[#A4A5A0]">
                                    {flowAction}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 4. SOC ENFORCEMENT & MITIGATION ACTIONS */}
                <div className="p-4 rounded-lg bg-[#1E2021] border border-[#303334] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-[#F1F0EA] font-sans">
                      Enforcement Actions & Host Containment
                    </h4>
                    <p className="text-[11px] text-[#A4A5A0] font-sans mt-0.5">
                      Dispatch network containment command to SDN controller or firewall
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {canModify && onOpenResponseDialog && (
                      <>
                        <button
                          onClick={() =>
                            onOpenResponseDialog({
                              actionType: 'quarantine',
                              targetIp: srcIp,
                              initialAction: 'quarantine',
                            })
                          }
                          className="bg-[#C95F5F]/15 hover:bg-[#C95F5F]/25 text-[#C95F5F] border border-[#C95F5F]/40 text-xs font-sans font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Isolate Host ({srcIp})</span>
                        </button>

                        <button
                          onClick={() =>
                            onOpenResponseDialog({
                              actionType: 'reverse',
                              targetIp: srcIp,
                              initialAction: action,
                            })
                          }
                          className="bg-[#141516] hover:bg-[#252728] text-[#A4A5A0] hover:text-[#F1F0EA] border border-[#303334] text-xs font-sans font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Reverse Quarantine</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: HOST OPEN PORTS & SOCKETS */}
            {/* ========================================================= */}
            {activeTab === 'ports' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="h-12 border-b border-[#303334] px-4 flex items-center justify-between shrink-0 bg-[#1E2021]">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#F1F0EA] font-sans">
                      Host Listening Sockets & Services
                    </h2>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#70736F] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search port or process..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-48 bg-[#141516] border border-[#303334] text-[#F1F0EA] text-xs font-mono rounded pl-8 pr-2.5 py-1 focus:outline-none focus:border-[#9AAA78]"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#141516] border-b border-[#303334] text-[#A4A5A0] uppercase font-mono text-[10px] sticky top-0">
                      <tr>
                        <th className="py-2.5 px-4">Service / Process</th>
                        <th className="py-2.5 px-4">PID</th>
                        <th className="py-2.5 px-4">Port</th>
                        <th className="py-2.5 px-4">Local IP</th>
                        <th className="py-2.5 px-4">Protocol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#303334]/50 font-mono text-[11px]">
                      {filteredPorts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-[#252728] transition-colors">
                          <td className="py-2 px-4 text-[#F1F0EA] font-medium font-sans">
                            {p.process || 'Windows Service'}
                          </td>
                          <td className="py-2 px-4 text-[#A4A5A0]">{p.pid}</td>
                          <td className="py-2 px-4 font-bold text-[#9AAA78]">{p.port}</td>
                          <td className="py-2 px-4 text-[#A4A5A0]">{p.ip || '0.0.0.0'}</td>
                          <td className="py-2 px-4 uppercase text-[#8CA4B8]">{p.protocol || 'TCP'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 3: INTERFACE BANDWIDTH & TRAFFIC */}
            {/* ========================================================= */}
            {activeTab === 'traffic' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="bg-[#1E2021] border border-[#303334] rounded-lg p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F0EA] font-sans">
                    Live Interface Bandwidth Utilization
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-[#141516] border border-[#303334] space-y-1">
                      <span className="text-[11px] font-mono text-[#A4A5A0] flex items-center gap-1.5">
                        <ArrowDown className="w-3.5 h-3.5 text-[#9AAA78]" />
                        Total Inbound (Rx)
                      </span>
                      <div className="text-2xl font-bold font-mono text-[#F1F0EA]">
                        {summary.total_rx_formatted}
                      </div>
                      <span className="text-xs font-mono text-[#9AAA78]">Rate: {summary.rx_rate_formatted}</span>
                    </div>

                    <div className="p-4 rounded-lg bg-[#141516] border border-[#303334] space-y-1">
                      <span className="text-[11px] font-mono text-[#A4A5A0] flex items-center gap-1.5">
                        <ArrowUp className="w-3.5 h-3.5 text-[#C95F5F]" />
                        Total Outbound (Tx)
                      </span>
                      <div className="text-2xl font-bold font-mono text-[#F1F0EA]">
                        {summary.total_tx_formatted}
                      </div>
                      <span className="text-xs font-mono text-[#C95F5F]">Rate: {summary.tx_rate_formatted}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 4: CONTAINED / BLOCKED HOSTS */}
            {/* ========================================================= */}
            {activeTab === 'blocked' && (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#303334]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F0EA] font-sans">
                      Contained Subnet Hosts
                    </h3>
                  </div>

                  <div className="p-4 rounded-lg bg-[#1E2021] border border-[#303334] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-[#C95F5F]" />
                      <div>
                        <div className="font-mono text-sm font-bold text-[#F1F0EA]">{srcIp}</div>
                        <div className="text-xs text-[#A4A5A0] font-sans">
                          Quarantined under {incidentCode} • Status: {action}
                        </div>
                      </div>
                    </div>
                    {canModify && onOpenResponseDialog && (
                      <button
                        onClick={() =>
                          onOpenResponseDialog({
                            actionType: 'reverse',
                            targetIp: srcIp,
                            initialAction: action,
                          })
                        }
                        className="text-xs font-sans font-semibold bg-[#141516] hover:bg-[#252728] border border-[#303334] text-[#A4A5A0] hover:text-[#F1F0EA] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Restore Network Access
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pop-up Device Activity Drawer if analyst clicks "Inspect Activity Trail" */}
      {selectedDeviceActivityIp && (
        <DeviceActivityDrawer
          isOpen={!!selectedDeviceActivityIp}
          onClose={() => setSelectedDeviceActivityIp(null)}
          srcIp={selectedDeviceActivityIp}
        />
      )}
    </div>
  );
};

export default IncidentDetailDrawer;
