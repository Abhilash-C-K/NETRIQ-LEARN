import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { VerdictCard } from '../components/VerdictCard';
import { DeviceActivityDrawer } from '../components/DeviceActivityDrawer';
import { CyberTerminal } from '../components/ui/CyberTerminal';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { predictionService } from '../services/prediction';
import { dashboardService } from '../services/dashboard';
import {
  Shield,
  Play,
  RefreshCw,
  Terminal,
  FileText,
  Lock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Search,
  ExternalLink,
} from 'lucide-react';

export const Dashboard = () => {
  const { role, hasCapability } = useAuth();
  const { connectionStatus, subscribe } = useWebSocket();

  const [threats, setThreats] = useState([]);
  const [summary, setSummary] = useState({
    total_threats_blocked: 0,
    active_incidents: 0,
    system_health: 'OPERATIONAL',
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('smart'); // 'smart' | 'raw'
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedDeviceIp, setSelectedDeviceIp] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(8);

  const hasRawAccess = hasCapability('VIEW_RAW_LOGS') || role === 'analyst' || role === 'admin';
  const hasAdminAccess = hasCapability('MANAGE_SETTINGS') || role === 'admin';

  const loadData = async () => {
    try {
      setLoading(true);
      const [threatsData, summaryData] = await Promise.all([
        predictionService.getRecentThreats(35),
        dashboardService.getSummary(),
      ]);
      setThreats(threatsData || []);
      if (summaryData) {
        setSummary(summaryData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time WebSocket Listeners
  useEffect(() => {
    const handleNewVerdict = (payload) => {
      setThreats((prev) => [payload, ...prev.slice(0, 34)]);
    };

    const handleThreatAlert = (payload) => {
      setThreats((prev) => [payload, ...prev.slice(0, 34)]);
    };

    const unsubscribeVerdict = subscribe('live_verdict', handleNewVerdict);
    const unsubscribeAlert = subscribe('threat_alert', handleThreatAlert);

    return () => {
      unsubscribeVerdict();
      unsubscribeAlert();
    };
  }, [subscribe]);

  const handleSimulateFlow = async () => {
    if (!hasAdminAccess) return;
    try {
      setIsSimulating(true);
      const mockPayload = {
        src_ip: '10.40.184.165',
        src_port: 58496,
        dst_ip: '159.41.181.98',
        dst_port: 27017,
        protocol: 'TCP',
        flow_duration_ms: 142.5,
        packet_count: 85,
        bytes_sent: 14200,
        bytes_received: 384000,
        payload_entropy: 7.82,
        model_used: 'DualLayerFusion',
        severity: 'CRITICAL',
        confidence: 0.98,
        is_anomaly: true,
        anomaly_score: 0.92,
        action: 'QUARANTINE',
        timestamp: Date.now() / 1000,
        top_shap_features: [
          { feature: 'payload_entropy', shap_value: 0.42, description: 'High entropy indicates encrypted payload' },
          { feature: 'bytes_received', shap_value: 0.35, description: 'Abnormal data exfiltration volume' },
          { feature: 'flow_duration_ms', shap_value: 0.18, description: 'Persistent connection duration' },
        ],
        reason: 'Host isolated on VLAN 99: CobaltStrike beaconing signature verified by Isolation Forest.',
      };

      setThreats((prev) => [mockPayload, ...prev.slice(0, 34)]);
      setSummary((prev) => ({
        ...prev,
        total_threats_blocked: (prev.total_threats_blocked || 0) + 1,
      }));
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setTimeout(() => setIsSimulating(false), 500);
    }
  };

  // Severity Distribution Counts
  const severityCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    threats.forEach((t) => {
      const s = String(t.severity || 'LOW').toUpperCase();
      if (counts[s] !== undefined) counts[s]++;
      else counts.LOW++;
    });
    return counts;
  }, [threats]);

  // Filtered Threats
  const filteredThreats = useMemo(() => {
    return threats.filter((t) => {
      const sev = String(t.severity || 'LOW').toUpperCase();
      if (severityFilter !== 'ALL' && sev !== severityFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const src = String(t.src_ip || '').toLowerCase();
        const dst = String(t.dst_ip || '').toLowerCase();
        const sni = String(t.sni || '').toLowerCase();
        const reason = String(t.reason || t.description || '').toLowerCase();
        return src.includes(query) || dst.includes(query) || sni.includes(query) || reason.includes(query);
      }
      return true;
    });
  }, [threats, severityFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Clean Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1E2021] border border-[#303334] p-5 rounded-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-[#F1F0EA] font-sans flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#9AAA78]" />
              Operations Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium bg-[#9AAA78]/15 text-[#9AAA78] border border-[#9AAA78]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9AAA78] animate-pulse" />
              Two-Layer Defense Active
            </span>
          </div>
          <p className="text-xs text-[#A4A5A0] mt-1 font-sans">
            Continuous Layer 1 wire packet inspection &amp; Layer 2 host behavioral anomaly containment
          </p>
        </div>

        {/* Action Controls & View Mode Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {hasAdminAccess ? (
            <button
              onClick={handleSimulateFlow}
              disabled={isSimulating}
              className="bg-[#9AAA78] hover:bg-[#A9B989] text-[#141516] font-sans text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSimulating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Simulate Attack Flow</span>
            </button>
          ) : (
            <Button
              disabled
              variant="outline"
              size="sm"
              className="text-xs border-[#303334] bg-[#141516] text-[#70736F]"
              title="Simulate Flow requires Admin capability (MANAGE_SETTINGS)"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5 text-[#C95F5F]" />
              <span>Simulate (Admin)</span>
            </Button>
          )}

          <Button
            onClick={loadData}
            title="Refresh threat feed"
            variant="outline"
            size="icon"
            className="w-8 h-8 border-[#303334] bg-[#141516] text-[#A4A5A0] hover:text-[#F1F0EA]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* View Mode Segmented Control */}
          <div className="bg-[#141516] p-1 rounded-lg border border-[#303334] flex items-center gap-1">
            <button
              onClick={() => setViewMode('smart')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer ${
                viewMode === 'smart'
                  ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334]'
                  : 'text-[#A4A5A0] hover:text-[#F1F0EA]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#9AAA78]" />
              <span>Smart Feed</span>
            </button>

            <button
              onClick={() => hasRawAccess && setViewMode('raw')}
              disabled={!hasRawAccess}
              title={!hasRawAccess ? 'Raw technical log view requires Analyst capability' : ''}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334]'
                  : 'text-[#A4A5A0] hover:text-[#F1F0EA] disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {!hasRawAccess ? <Lock className="w-3 h-3 text-[#C95F5F]" /> : <Terminal className="w-3.5 h-3.5 text-[#8CA4B8]" />}
              <span>Kernel Raw</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: System Health */}
        <div className="bg-[#1E2021] border border-[#303334] rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-sans uppercase font-medium text-[#A4A5A0] tracking-wider">
              NIDS Pipeline
            </span>
            <div className="text-lg font-bold text-[#F1F0EA] font-sans mt-0.5 flex items-center gap-1.5">
              <span>{summary.system_health || 'OPERATIONAL'}</span>
            </div>
            <p className="text-[11px] text-[#9AAA78] font-sans mt-0.5">Physical TAP + Host Agent Hook</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#141516] border border-[#303334] flex items-center justify-center text-[#9AAA78]">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Threats Blocked (24h) */}
        <div className="bg-[#1E2021] border border-[#303334] rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-sans uppercase font-medium text-[#A4A5A0] tracking-wider">
              Threats Blocked (24h)
            </span>
            <div className="text-xl font-mono font-bold text-[#F1F0EA] mt-0.5">
              {summary.total_threats_blocked || severityCounts.CRITICAL + severityCounts.HIGH}
            </div>
            <p className="text-[11px] text-[#A4A5A0] font-sans mt-0.5">Deterministic Firewall Sync</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#141516] border border-[#303334] flex items-center justify-center text-[#C95F5F]">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Active Investigations */}
        <div className="bg-[#1E2021] border border-[#303334] rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-sans uppercase font-medium text-[#A4A5A0] tracking-wider">
              Active Incidents
            </span>
            <div className="text-xl font-mono font-bold text-[#D0A05C] mt-0.5">
              {summary.active_incidents || severityCounts.CRITICAL}
            </div>
            <Link to="/incidents" className="text-[11px] text-[#8CA4B8] hover:underline font-sans mt-0.5 inline-flex items-center gap-1">
              <span>Manage Incidents</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#141516] border border-[#303334] flex items-center justify-center text-[#D0A05C]">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: AI Model Confidence */}
        <div className="bg-[#1E2021] border border-[#303334] rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-sans uppercase font-medium text-[#A4A5A0] tracking-wider">
              AI Confidence Rate
            </span>
            <div className="text-xl font-mono font-bold text-[#9AAA78] mt-0.5">
              {(() => {
                if (summary?.ai_confidence_rate != null && summary.ai_confidence_rate > 0) {
                  return `${summary.ai_confidence_rate}%`;
                }
                const scores = threats
                  .map(t => {
                    const c = Number(t.confidence);
                    if (isNaN(c) || c <= 0) return null;
                    return c <= 1.0 ? c * 100 : c;
                  })
                  .filter(c => c !== null);
                if (scores.length > 0) {
                  return `${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}%`;
                }
                return '90.0%';
              })()}
            </div>
            <p className="text-[11px] text-[#A4A5A0] font-sans mt-0.5">Dual-Layer SHAP Explainability</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#141516] border border-[#303334] flex items-center justify-center text-[#9AAA78]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Main Content: Structured 2-Column Grid */}
      {viewMode === 'smart' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Left Column: Curated Threat Feed (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-[#1E2021] border border-[#303334] p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Severity Pills */}
              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded text-xs font-sans font-medium transition-colors cursor-pointer ${
                      severityFilter === sev
                        ? 'bg-[#252728] text-[#F1F0EA] border border-[#9AAA78]/40'
                        : 'text-[#A4A5A0] hover:text-[#F1F0EA]'
                    }`}
                  >
                    {sev === 'ALL' ? 'All Alerts' : sev}
                    {sev !== 'ALL' && severityCounts[sev] > 0 && (
                      <span className="ml-1.5 text-[10px] font-mono text-[#70736F]">
                        {severityCounts[sev]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-[#70736F] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by IP / SNI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#141516] border border-[#303334] text-[#F1F0EA] text-xs font-mono rounded pl-8 pr-3 py-1.5 placeholder-[#70736F] focus:outline-none focus:border-[#9AAA78]"
                />
              </div>
            </div>

            {/* Verdict Cards List */}
            {loading ? (
              <div className="p-12 text-center text-[#A4A5A0] space-y-3 bg-[#1E2021] border border-[#303334] rounded-lg">
                <div className="w-7 h-7 border-2 border-[#303334] border-t-[#9AAA78] rounded-full animate-spin mx-auto" />
                <p className="text-xs font-sans">Connecting to live security telemetry feed...</p>
              </div>
            ) : filteredThreats.length === 0 ? (
              <div className="p-12 text-center bg-[#1E2021] border border-[#303334] rounded-lg text-[#A4A5A0] text-xs font-sans space-y-2">
                <p className="font-medium text-[#F1F0EA]">No threats match current filter criteria</p>
                <p className="text-[#70736F]">Try clearing your search query or clicking "Simulate Attack Flow" above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredThreats.slice(0, displayLimit).map((t, idx) => (
                  <VerdictCard
                    key={t.id || idx}
                    threat={t}
                    viewMode="smart"
                    hasRawAccess={hasRawAccess}
                    onSelectDevice={setSelectedDeviceIp}
                  />
                ))}

                {/* Show More Pagination Trigger */}
                {filteredThreats.length > displayLimit && (
                  <div className="text-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDisplayLimit((prev) => prev + 8)}
                      className="border-[#303334] bg-[#1E2021] text-[#A4A5A0] hover:text-[#F1F0EA] text-xs font-sans"
                    >
                      Show More ({filteredThreats.length - displayLimit} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Column: Defense Architecture & Fast Controls (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Architecture Telemetry Widget */}
            <div className="bg-[#1E2021] border border-[#303334] rounded-lg p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A4A5A0] font-sans flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#9AAA78]" />
                Defense Architecture Status
              </h3>

              <div className="space-y-3">
                {/* Layer 1 Status */}
                <div className="p-3 rounded-lg bg-[#141516] border border-[#303334] flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F1F0EA] font-sans">Layer 1: Pre-Firewall TAP</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#9AAA78]/15 text-[#9AAA78] border border-[#9AAA78]/30">ACTIVE</span>
                    </div>
                    <p className="text-[11px] text-[#A4A5A0] font-sans mt-1">
                      Passive optical TAP mirror. Zero inline packet delay, RECOMMEND_BLOCK signals active.
                    </p>
                  </div>
                </div>

                {/* Layer 2 Status */}
                <div className="p-3 rounded-lg bg-[#141516] border border-[#303334] flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F1F0EA] font-sans">Layer 2: Post-Firewall AI</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#9AAA78]/15 text-[#9AAA78] border border-[#9AAA78]/30">ISOLATION READY</span>
                    </div>
                    <p className="text-[11px] text-[#A4A5A0] font-sans mt-1">
                      East-West behavioral model detecting lateral movement, ransomware, and credential abuse.
                    </p>
                  </div>
                </div>

                {/* Deterministic Fallback */}
                <div className="p-3 rounded-lg bg-[#141516] border border-[#303334] flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F1F0EA] font-sans">Heuristic Safety Fallback</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#8CA4B8]/15 text-[#8CA4B8] border border-[#8CA4B8]/30">STANDBY</span>
                    </div>
                    <p className="text-[11px] text-[#A4A5A0] font-sans mt-1">
                      Enforces deterministic rules if AI model confidence drops below threshold.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Threat Distribution Card */}
            <div className="bg-[#1E2021] border border-[#303334] rounded-lg p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A4A5A0] font-sans flex items-center justify-between">
                <span>Active Threat Spectrum</span>
                <span className="text-[11px] font-mono text-[#70736F]">{threats.length} total</span>
              </h3>

              <div className="space-y-2.5 pt-1">
                {/* Critical */}
                <div>
                  <div className="flex items-center justify-between text-xs font-sans mb-1">
                    <span className="text-[#C95F5F] font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#C95F5F]" />
                      Critical
                    </span>
                    <span className="font-mono text-[#F1F0EA]">{severityCounts.CRITICAL}</span>
                  </div>
                  <div className="w-full bg-[#141516] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#C95F5F] h-full transition-all"
                      style={{ width: `${threats.length ? (severityCounts.CRITICAL / threats.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* High */}
                <div>
                  <div className="flex items-center justify-between text-xs font-sans mb-1">
                    <span className="text-[#D27C62] font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D27C62]" />
                      High
                    </span>
                    <span className="font-mono text-[#F1F0EA]">{severityCounts.HIGH}</span>
                  </div>
                  <div className="w-full bg-[#141516] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#D27C62] h-full transition-all"
                      style={{ width: `${threats.length ? (severityCounts.HIGH / threats.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Medium */}
                <div>
                  <div className="flex items-center justify-between text-xs font-sans mb-1">
                    <span className="text-[#D0A05C] font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D0A05C]" />
                      Medium
                    </span>
                    <span className="font-mono text-[#F1F0EA]">{severityCounts.MEDIUM}</span>
                  </div>
                  <div className="w-full bg-[#141516] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#D0A05C] h-full transition-all"
                      style={{ width: `${threats.length ? (severityCounts.MEDIUM / threats.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Low */}
                <div>
                  <div className="flex items-center justify-between text-xs font-sans mb-1">
                    <span className="text-[#8CA4B8] font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#8CA4B8]" />
                      Low / Normal
                    </span>
                    <span className="font-mono text-[#F1F0EA]">{severityCounts.LOW}</span>
                  </div>
                  <div className="w-full bg-[#141516] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#8CA4B8] h-full transition-all"
                      style={{ width: `${threats.length ? (severityCounts.LOW / threats.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fast Navigation Panel */}
            <div className="bg-[#1E2021] border border-[#303334] rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A4A5A0] font-sans">
                Quick Operations Jump
              </h3>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/monitoring"
                  className="p-2.5 rounded-lg bg-[#141516] border border-[#303334] hover:border-[#9AAA78] text-xs font-sans text-[#F1F0EA] transition-colors flex items-center gap-2"
                >
                  <Activity className="w-3.5 h-3.5 text-[#9AAA78]" />
                  <span>Live Capture</span>
                </Link>
                <Link
                  to="/incidents"
                  className="p-2.5 rounded-lg bg-[#141516] border border-[#303334] hover:border-[#9AAA78] text-xs font-sans text-[#F1F0EA] transition-colors flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-[#D0A05C]" />
                  <span>Incidents</span>
                </Link>
                <Link
                  to="/analytics"
                  className="p-2.5 rounded-lg bg-[#141516] border border-[#303334] hover:border-[#9AAA78] text-xs font-sans text-[#F1F0EA] transition-colors flex items-center gap-2"
                >
                  <Cpu className="w-3.5 h-3.5 text-[#8CA4B8]" />
                  <span>Analytics</span>
                </Link>
                <Link
                  to="/reports"
                  className="p-2.5 rounded-lg bg-[#141516] border border-[#303334] hover:border-[#9AAA78] text-xs font-sans text-[#F1F0EA] transition-colors flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-[#A4A5A0]" />
                  <span>Reports</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CyberTerminal logs={threats} isLive={connectionStatus === 'connected'} />
      )}

      {/* Device Activity Trail Drawer */}
      <DeviceActivityDrawer
        isOpen={!!selectedDeviceIp}
        onClose={() => setSelectedDeviceIp(null)}
        srcIp={selectedDeviceIp}
      />
    </div>
  );
};

export default Dashboard;
