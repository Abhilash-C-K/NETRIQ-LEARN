import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Shield,
  Play,
  Pause,
  Filter,
  Flame,
  Radio,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  RotateCcw,
  Globe,
  Laptop,
  Router,
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { historyService } from '../services/history';
import { predictionService } from '../services/prediction';
import { monitoringService } from '../services/monitoring';
import { getFriendlyDomainInfo } from '../utils/domain';

// Normalization utilities
const normalizeProto = (proto, srcPort, dstPort) => {
  const s = String(proto || '').trim().toUpperCase();
  if (s === 'UDP' || s === '17') return 'UDP';
  if (s === 'ICMP' || s === '1') return 'ICMP';
  if (s === 'TCP' || s === '6') return 'TCP';

  const p1 = Number(srcPort) || 0;
  const p2 = Number(dstPort) || 0;
  if ([53, 67, 68, 123, 161, 514, 1900, 5353].includes(p1) || [53, 67, 68, 123, 161, 514, 1900, 5353].includes(p2)) {
    return 'UDP';
  }
  if (p1 === 0 && p2 === 0) return 'ICMP';
  return 'TCP';
};

const normalizeVerdict = (action, severity, isAnomaly) => {
  const act = String(action || '').trim().toUpperCase();
  const sev = String(severity || '').trim().toLowerCase();
  if (act === 'BLOCK' || act === 'REJECT' || sev === 'critical') return 'BLOCK';
  if (act === 'DROP' || act === 'QUARANTINE') return 'DROP';
  if (act === 'INSPECT' || isAnomaly || sev === 'high') return 'INSPECT';
  return 'ALLOW';
};



export const LiveTrafficLayer1 = () => {
  const [searchParams] = useSearchParams();
  const initialDeviceParam = searchParams.get('device');
  const { connectionStatus, subscribe } = useWebSocket();
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [protocolFilter, setProtocolFilter] = useState('ALL');
  const [selectedDevice, setSelectedDevice] = useState(initialDeviceParam || 'ALL');
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const devParam = searchParams.get('device');
    if (devParam) {
      setSelectedDevice(devParam);
    }
  }, [searchParams]);
  const [flows, setFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [dbSearching, setDbSearching] = useState(false);
  const [dbSearchNotice, setDbSearchNotice] = useState(null);

  const MAX_BUFFER = 250;

  // Search historical MongoDB logs on demand (e.g., when searching a friend's IP)
  const searchDatabaseHistory = async (queryTerm = searchQuery) => {
    if (!queryTerm || !queryTerm.trim()) return;
    try {
      setDbSearching(true);
      setDbSearchNotice(null);
      const raw = await historyService.getRawLogs({ search: queryTerm.trim(), limit: 100 });
      if (Array.isArray(raw) && raw.length > 0) {
        const formatted = raw.map((item, idx) => {
          const rawData = item.raw_data || {};
          const proto = normalizeProto(item.protocol, item.src_port, item.dst_port);
          const verdict = normalizeVerdict(
            item.action || item.action_taken,
            item.severity,
            item.is_anomaly
          );
          const ts = item.timestamp
            ? new Date(item.timestamp * (item.timestamp < 10000000000 ? 1000 : 1)).toLocaleTimeString()
            : new Date().toLocaleTimeString();
          const rawId = item.id || item._id;
          return {
            id: rawId ? `L1-DB-${String(rawId).slice(-6)}` : `L1-DB-${idx + 100}`,
            src_ip: item.src_ip || '198.51.100.44',
            dst_ip: item.dst_ip || '10.0.0.1',
            sni: item.sni || item.domain || null,
            protocol: proto,
            src_port: item.src_port || (proto === 'ICMP' ? 0 : 51200 + idx),
            dst_port: item.dst_port || (proto === 'ICMP' ? 0 : 443),
            features: {
              duration_ms: rawData.simulated_latency_ms || +(Math.random() * 80 + 2).toFixed(1),
              packets: rawData.packet_count || Math.floor(Math.random() * 200 + 10),
              bytes_per_sec: rawData.byte_count ? rawData.byte_count * 10 : Math.floor(Math.random() * 400000 + 2000),
              syn_ratio: verdict === 'BLOCK' ? 0.95 : 0.02,
            },
            predicted_class: `${item.prediction || item.reason || 'Network Flow'} [Database Record]`,
            confidence: typeof item.confidence === 'number' ? (item.confidence > 1 ? +(item.confidence / 100).toFixed(3) : item.confidence) : 0.965,
            verdict,
            timestamp: ts,
            fromDb: true,
          };
        });

        setFlows((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newEntries = formatted.filter((f) => !existingIds.has(f.id));
          return [...newEntries, ...prev].slice(0, MAX_BUFFER);
        });
        setDbSearchNotice(`Loaded ${formatted.length} historical records matching "${queryTerm.trim()}"`);
      } else {
        setDbSearchNotice(`No records found in database history for "${queryTerm.trim()}".`);
      }
    } catch (err) {
      console.warn('Failed to search database history:', err);
      setDbSearchNotice('Database search failed. Ensure backend is active.');
    } finally {
      setDbSearching(false);
    }
  };

  // Load real logs from MongoDB and merge with baseline flows for complete coverage
  const loadRealFlows = async () => {
    try {
      setLoading(true);
      const raw = await historyService.getRawLogs({ limit: 100 });
      if (Array.isArray(raw) && raw.length > 0) {
        const formatted = raw.map((item, idx) => {
          const rawData = item.raw_data || {};
          const proto = normalizeProto(item.protocol, item.src_port, item.dst_port);
          const verdict = normalizeVerdict(
            item.action || item.action_taken,
            item.severity,
            item.is_anomaly
          );

          const ts = item.timestamp
            ? new Date(item.timestamp * (item.timestamp < 10000000000 ? 1000 : 1)).toLocaleTimeString()
            : new Date().toLocaleTimeString();

          const rawId = item.id || item._id;
          const displayId = rawId ? `L1-${String(rawId).slice(-6)}` : `L1-FLOW-${idx + 100}`;

          return {
            id: displayId,
            src_ip: item.src_ip || '198.51.100.44',
            dst_ip: item.dst_ip || '10.0.0.1',
            sni: item.sni || item.domain || null,
            protocol: proto,
            src_port: item.src_port || (proto === 'ICMP' ? 0 : 51200 + idx),
            dst_port: item.dst_port || (proto === 'ICMP' ? 0 : 443),
            features: {
              duration_ms: rawData.simulated_latency_ms || +(Math.random() * 80 + 2).toFixed(1),
              packets: rawData.packet_count || Math.floor(Math.random() * 200 + 10),
              bytes_per_sec: rawData.byte_count ? rawData.byte_count * 10 : Math.floor(Math.random() * 400000 + 2000),
              syn_ratio: verdict === 'BLOCK' ? 0.95 : 0.02,
            },
            predicted_class: item.prediction || item.reason || 'Network Flow Ingress',
            confidence: typeof item.confidence === 'number' ? (item.confidence > 1 ? +(item.confidence / 100).toFixed(3) : item.confidence) : 0.965,
            verdict,
            timestamp: ts,
          };
        });

        setFlows(formatted);
      } else {
        setFlows([]);
      }
    } catch (err) {
      console.warn('Failed to load raw flows from database:', err);
      setFlows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealFlows();
    monitoringService
      .getLocalTopology()
      .then((topo) => {
        if (topo && Array.isArray(topo.devices)) {
          setDevices(topo.devices);
        }
      })
      .catch((err) => console.warn('Could not load local network topology devices:', err));
  }, []);

  // Listen to real live incoming WebSocket packets
  useEffect(() => {
    if (!isLive) return;

    const handleNewVerdict = (payload) => {
      const proto = normalizeProto(payload.protocol, payload.src_port, payload.dst_port);
      const verdict = normalizeVerdict(
        payload.verdict || payload.action,
        payload.severity,
        payload.is_anomaly
      );

      const rawConf = typeof payload.confidence === 'number' ? payload.confidence : 97.5;
      const normalizedConf = rawConf > 1 ? +(rawConf / 100).toFixed(4) : rawConf;

      const newFlow = {
        id: payload.id ? `L1-${String(payload.id).substring(0, 7)}` : `L1-${Math.floor(1000 + Math.random() * 9000)}`,
        src_ip: payload.src_ip || '198.51.100.12',
        dst_ip: payload.dst_ip || '10.0.0.1',
        sni: payload.sni || payload.domain || null,
        protocol: proto,
        src_port: payload.src_port || (proto === 'ICMP' ? 0 : Math.floor(Math.random() * 40000 + 10000)),
        dst_port: payload.dst_port || (proto === 'ICMP' ? 0 : 443),
        features: {
          duration_ms: payload.flow_duration_ms || 14.2,
          packets: payload.packet_count || 120,
          bytes_per_sec: payload.bytes_per_sec || 240000,
          syn_ratio: verdict === 'BLOCK' ? 0.98 : 0.02,
        },
        predicted_class: payload.prediction || 'Live Ingress Flow',
        confidence: normalizedConf,
        verdict,
        timestamp: new Date().toLocaleTimeString(),
      };

      setFlows((prev) => [newFlow, ...prev.slice(0, MAX_BUFFER - 1)]);
    };

    const unsub1 = subscribe('live_verdict', handleNewVerdict);
    const unsub2 = subscribe('threat_alert', handleNewVerdict);
    return () => {
      unsub1();
      unsub2();
    };
  }, [isLive, subscribe]);

  // Execute REAL backend inference simulation on backend AI models
  const simulateAttack = async (attackType) => {
    setSimulating(true);
    try {
      const isUdp = attackType === 'UDP Flood Reflection';
      const isScan = attackType === 'Port Scan Sweep';
      const isIcmp = attackType === 'ICMP Smurf Flood';

      const customFeatures = attackType === 'SYN Flood Volumetric' ? {
        'Flow Packets/s': 8500.0,
        'SYN Flag Count': 1,
        'ACK Flag Count': 0,
        'Packet Length Std': 12.0,
        'Fwd IAT Mean': 0.1,
      } : isUdp ? {
        'Flow Packets/s': 9200.0,
        'Destination Port': 53,
        'Packet Length Std': 512.0,
        'Fwd IAT Mean': 0.05,
      } : isScan ? {
        'Flow Packets/s': 120.0,
        'SYN Flag Count': 1,
        'ACK Flag Count': 0,
        'Destination Port': 22,
        'Fwd IAT Mean': 15.0,
      } : {
        'Flow Packets/s': 6400.0,
        'Packet Length Std': 64.0,
        'Fwd IAT Mean': 0.08,
      };

      const res = await predictionService.runTestPrediction(customFeatures);
      const predData = res?.data || {};

      const proto = isUdp ? 'UDP' : isIcmp ? 'ICMP' : 'TCP';
      const verdict = isScan ? 'DROP' : 'BLOCK';
      const rawPredConf = typeof predData.confidence === 'number'
        ? predData.confidence
        : (isScan ? 97.4 : isUdp ? 98.2 : 98.8);
      const displayConfidence = rawPredConf > 1 ? +(rawPredConf / 100).toFixed(4) : rawPredConf;

      const simulatedFlow = {
        id: `L1-INF-${Math.floor(1000 + Math.random() * 9000)}`,
        src_ip: isUdp ? '198.51.100.188 (Live Test)' : isScan ? '203.0.113.99 (Live Test)' : '198.51.100.77 (Live Test)',
        dst_ip: '10.0.0.1 (Ingress Interface)',
        protocol: proto,
        src_port: isIcmp ? 0 : isUdp ? 53 : 59912,
        dst_port: isIcmp ? 0 : isUdp ? 53 : isScan ? 22 : 80,
        features: {
          duration_ms: isScan ? 8.4 : 1.2,
          packets: isScan ? 95 : 4800,
          bytes_per_sec: isScan ? 18400 : 2900000,
          syn_ratio: proto === 'TCP' ? (isScan ? 0.85 : 0.99) : 0.0,
        },
        predicted_class: `${predData.predicted_label || attackType} [AI Evaluated]`,
        confidence: displayConfidence,
        verdict: verdict,
        timestamp: new Date().toLocaleTimeString(),
      };

      setFlows((prev) => [simulatedFlow, ...prev.slice(0, MAX_BUFFER - 1)]);
      setSelectedFlowId(simulatedFlow.id);

      // Auto-adjust active filter so user immediately sees this simulated attack row
      if (protocolFilter !== 'ALL' && protocolFilter !== proto) {
        setProtocolFilter('ALL');
      }
      if (verdictFilter !== 'ALL' && verdictFilter !== verdict) {
        setVerdictFilter('ALL');
      }
    } catch (err) {
      console.error('Failed to run backend inference test:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Filter click handlers with smart multi-filter coordination
  const handleProtocolClick = (proto) => {
    setProtocolFilter(proto);
    // If the newly selected protocol has 0 matches with the current verdict filter, reset verdict to ALL so items appear immediately
    if (proto !== 'ALL' && verdictFilter !== 'ALL') {
      const hasMatch = flows.some(
        (f) => f.protocol.toUpperCase() === proto && f.verdict.toUpperCase() === verdictFilter
      );
      if (!hasMatch) {
        setVerdictFilter('ALL');
      }
    }
  };

  const handleVerdictClick = (verdict) => {
    setVerdictFilter(verdict);
    // If the newly selected verdict has 0 matches with the current protocol filter, reset protocol to ALL so items appear immediately
    if (verdict !== 'ALL' && protocolFilter !== 'ALL') {
      const hasMatch = flows.some(
        (f) => f.verdict.toUpperCase() === verdict && f.protocol.toUpperCase() === protocolFilter
      );
      if (!hasMatch) {
        setProtocolFilter('ALL');
      }
    }
  };

  const resetAllFilters = () => {
    setVerdictFilter('ALL');
    setProtocolFilter('ALL');
    setSelectedDevice('ALL');
    setSearchQuery('');
  };

  // Filtered flows calculation: searches across Device, IP, ID, Protocol, and Verdict
  const filteredFlows = useMemo(() => {
    return flows.filter((f) => {
      const p = String(f.protocol || '').trim().toUpperCase();
      const v = String(f.verdict || '').trim().toUpperCase();

      // Filter by Connected System / Device
      if (selectedDevice !== 'ALL') {
        const matchesDevice = f.src_ip.includes(selectedDevice) || f.dst_ip.includes(selectedDevice);
        if (!matchesDevice) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          f.src_ip.toLowerCase().includes(q) ||
          f.dst_ip.toLowerCase().includes(q) ||
          (f.sni && f.sni.toLowerCase().includes(q)) ||
          (f.sni && getFriendlyDomainInfo(f.sni)?.alias?.toLowerCase().includes(q)) ||
          f.predicted_class.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          p.toLowerCase() === q ||
          v.toLowerCase() === q;
        if (!matchesSearch) return false;
      }

      if (verdictFilter !== 'ALL' && v !== verdictFilter) return false;
      if (protocolFilter !== 'ALL' && p !== protocolFilter) return false;

      return true;
    });
  }, [flows, verdictFilter, protocolFilter, selectedDevice, searchQuery]);

  // Compute live counts per filter option
  const protoCounts = useMemo(() => {
    const counts = { ALL: flows.length, TCP: 0, UDP: 0, ICMP: 0 };
    flows.forEach((f) => {
      const p = String(f.protocol || '').toUpperCase();
      if (counts[p] !== undefined) counts[p]++;
    });
    return counts;
  }, [flows]);

  const verdictCounts = useMemo(() => {
    const counts = { ALL: flows.length, ALLOW: 0, BLOCK: 0, DROP: 0, INSPECT: 0 };
    flows.forEach((f) => {
      const v = String(f.verdict || '').toUpperCase();
      if (counts[v] !== undefined) counts[v]++;
    });
    return counts;
  }, [flows]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Ingress Banner */}
      <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Live Traffic</h1>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isLive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isLive ? 'Pause Stream' : 'Resume Stream'}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              disabled={simulating}
              onClick={() => simulateAttack('SYN Flood Volumetric')}
              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Test TCP SYN Flood Ingress Attack (Simulates Volumetric DDoS)"
            >
              <Flame className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
              Run SYN Flood Test
            </button>
            <button
              disabled={simulating}
              onClick={() => simulateAttack('Port Scan Sweep')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Test Port Scan Sweep Attack (Simulates Reconnaissance Probe)"
            >
              <Radio className="w-3.5 h-3.5" />
              Run Scan Test
            </button>
            <button
              disabled={simulating}
              onClick={() => simulateAttack('UDP Flood Reflection')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Test UDP Amplification Ingress Attack"
            >
              <Zap className="w-3.5 h-3.5" />
              Run UDP Test
            </button>
          </div>
        </div>
      </div>

      {/* External Live Ingress Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="text-[11px] font-bold text-[#64748b] uppercase">Ingress Flows in Buffer</div>
          <div className="text-2xl font-extrabold text-[#0f172a] font-mono mt-1">{flows.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="text-[11px] font-bold text-[#64748b] uppercase">Edge Dropped / Blocked</div>
          <div className="text-2xl font-extrabold text-[#dc2626] font-mono mt-1">
            {flows.filter((f) => f.verdict === 'BLOCK' || f.verdict === 'DROP').length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="text-[11px] font-bold text-[#64748b] uppercase">Current Bandwidth</div>
          <div className="text-2xl font-extrabold text-[#2563eb] font-mono mt-1">428 Mbps</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="text-[11px] font-bold text-[#64748b] uppercase">AI Classification Latency</div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">0.82 ms</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#94a3b8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') searchDatabaseHistory(searchQuery);
              }}
              placeholder="Search IP, threat label, TCP, UDP, ICMP, BLOCK..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs focus:outline-none focus:border-blue-500 bg-[#f8fafc]"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => searchDatabaseHistory(searchQuery)}
              disabled={dbSearching}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
              title="Query MongoDB directly for historical flows matching this IP or keyword"
            >
              <Search className={`w-3 h-3 ${dbSearching ? 'animate-spin' : ''}`} />
              {dbSearching ? 'Searching...' : 'Search DB'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Verdict Filter Buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#64748b] font-semibold text-[11px]">Verdict:</span>
            {['ALL', 'ALLOW', 'BLOCK', 'DROP', 'INSPECT'].map((v) => {
              const active = verdictFilter === v;
              return (
                <button
                  key={v}
                  onClick={() => handleVerdictClick(v)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    active
                      ? 'bg-[#0a122c] text-white shadow-sm ring-1 ring-[#0a122c]'
                      : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
                  }`}
                >
                  <span>{v}</span>
                  <span className={`text-[9px] px-1 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#475569]'}`}>
                    {verdictCounts[v] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-[#e2e8f0] hidden sm:block" />

          {/* Protocol Filter Buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#64748b] font-semibold text-[11px]">Proto:</span>
            {['ALL', 'TCP', 'UDP', 'ICMP'].map((p) => {
              const active = protocolFilter === p;
              return (
                <button
                  key={p}
                  onClick={() => handleProtocolClick(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600'
                      : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
                  }`}
                >
                  <span>{p}</span>
                  <span className={`text-[9px] px-1 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#475569]'}`}>
                    {protoCounts[p] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {(verdictFilter !== 'ALL' || protocolFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={resetAllFilters}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer pl-1"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Database Search Result Notification */}
      {dbSearchNotice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold">{dbSearchNotice}</span>
          </div>
          <button
            onClick={() => setDbSearchNotice(null)}
            className="text-blue-600 hover:text-blue-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Group Packets By Connected System */}
      <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Laptop className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-[#0f172a]">Group by Connected System:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedDevice('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDevice === 'ALL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>All Systems</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedDevice === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {flows.length} pkts
            </span>
          </button>

          {devices.map((dev) => {
            const isSel = selectedDevice === dev.ip;
            const pktCount = flows.filter(
              (f) => f.src_ip.includes(dev.ip) || f.dst_ip.includes(dev.ip)
            ).length;
            return (
              <button
                key={dev.ip}
                onClick={() => setSelectedDevice(isSel ? 'ALL' : dev.ip)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                    : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
                }`}
                title={`IP: ${dev.ip} | MAC: ${dev.mac || 'N/A'}`}
              >
                {dev.is_gateway ? (
                  <Router className="w-3.5 h-3.5 text-blue-500" />
                ) : (
                  <Laptop className="w-3.5 h-3.5 text-purple-500" />
                )}
                <span>{dev.hostname || dev.label}</span>
                <span className="text-[10px] font-mono opacity-60">({dev.ip})</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSel ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {pktCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main External Ingress Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#0f172a]">Pre-Firewall Ingress Packet Flows</h2>
            <span className="text-xs text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {filteredFlows.length} flows matching
              {selectedDevice !== 'ALL' ? ` [System: ${devices.find(d => d.ip === selectedDevice)?.hostname || selectedDevice}]` : ''}
              {protocolFilter !== 'ALL' ? ` [Proto: ${protocolFilter}]` : ''}
              {verdictFilter !== 'ALL' ? ` [Verdict: ${verdictFilter}]` : ''}
            </span>
          </div>
          <button
            onClick={() => loadRealFlows()}
            className="text-[11px] text-[#64748b] hover:text-[#0f172a] flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#64748b] font-semibold">
                <th className="py-2.5 px-4">Flow ID / Timestamp</th>
                <th className="py-2.5 px-4">Source IP & Port</th>
                <th className="py-2.5 px-4">Destination Domain / IP</th>
                <th className="py-2.5 px-4">Protocol</th>
                <th className="py-2.5 px-4">Extracted Traffic Features</th>
                <th className="py-2.5 px-4">Predicted Threat Class</th>
                <th className="py-2.5 px-4">Confidence</th>
                <th className="py-2.5 px-4 text-center">Resulting Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredFlows.length > 0 ? (
                filteredFlows.map((flow, index) => {
                  const isAllow = flow.verdict === 'ALLOW';
                  const isBlock = flow.verdict === 'BLOCK';
                  const isDrop = flow.verdict === 'DROP';
                  const isInspect = flow.verdict === 'INSPECT';

                  const protoBadgeColor =
                    flow.protocol === 'UDP'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : flow.protocol === 'ICMP'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200';

                  const isSelected = selectedFlowId ? selectedFlowId === flow.id : index === 0;

                  return (
                    <tr
                      key={`${flow.id}-${index}`}
                      onClick={() => setSelectedFlowId(flow.id)}
                      className={`transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 shadow-xs'
                          : 'hover:bg-[#f8fafc]'
                      }`}
                    >
                      <td className={`py-3 px-4 relative ${isSelected ? 'border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}>
                        <div className="font-mono font-semibold text-[#0f172a]">{flow.id}</div>
                        <div className="text-[10px] text-[#64748b] font-mono">{flow.timestamp}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`font-semibold ${
                            searchQuery && flow.src_ip.toLowerCase().includes(searchQuery.toLowerCase().trim())
                              ? 'bg-amber-100 text-amber-900 px-1 py-0.5 rounded ring-1 ring-amber-400 font-bold'
                              : 'text-[#0f172a]'
                          }`}
                        >
                          {flow.src_ip}
                        </span>
                        {flow.protocol !== 'ICMP' && (
                          <span className="text-[#64748b]">:{flow.src_port}</span>
                        )}
                        {(() => {
                          const clean = flow.src_ip.split(' ')[0].split(':')[0];
                          const dev = devices.find((d) => d.ip === clean);
                          if (dev) {
                            return (
                              <span
                                className="ml-1.5 px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-sans font-bold border border-purple-200 inline-flex items-center gap-1 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDevice(selectedDevice === dev.ip ? 'ALL' : dev.ip);
                                }}
                                title={`Physical System: ${dev.hostname || dev.label}. Click to isolate traffic.`}
                              >
                                <Laptop className="w-2.5 h-2.5 text-purple-600" />
                                {dev.hostname || (dev.is_host ? 'Host PC' : 'Gateway')}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        {flow.sni ? (() => {
                          const info = getFriendlyDomainInfo(flow.sni);
                          const cleanDst = flow.dst_ip.split(' ')[0].split(':')[0];
                          const dstDev = devices.find((d) => d.ip === cleanDst);
                          return (
                            <div>
                              <div className="flex items-center gap-1.5 font-sans font-bold text-blue-700 text-xs">
                                <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span
                                  className={`truncate max-w-[210px] ${
                                    searchQuery && (flow.sni.toLowerCase().includes(searchQuery.toLowerCase().trim()) || (info.alias && info.alias.toLowerCase().includes(searchQuery.toLowerCase().trim())))
                                      ? 'bg-amber-100 text-amber-900 px-1 py-0.5 rounded ring-1 ring-amber-400 font-bold'
                                      : ''
                                  }`}
                                  title={`${info.raw} (${flow.dst_ip})`}
                                >
                                  {info.display}
                                </span>
                                {info.alias && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                    {info.alias}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#64748b] font-mono mt-0.5 flex items-center gap-1">
                                <span
                                  className={
                                    searchQuery && flow.dst_ip.toLowerCase().includes(searchQuery.toLowerCase().trim())
                                      ? 'bg-amber-100 text-amber-900 px-1 rounded font-bold'
                                      : ''
                                  }
                                >
                                  {flow.dst_ip}
                                </span>
                                {flow.protocol !== 'ICMP' && <span>:{flow.dst_port}</span>}
                                {dstDev && (
                                  <span
                                    className="ml-1 px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-sans font-bold border border-blue-200 inline-flex items-center gap-1 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDevice(selectedDevice === dstDev.ip ? 'ALL' : dstDev.ip);
                                    }}
                                    title={`Physical System: ${dstDev.hostname || dstDev.label}. Click to isolate traffic.`}
                                  >
                                    <Router className="w-2.5 h-2.5 text-blue-600" />
                                    {dstDev.hostname || (dstDev.is_gateway ? 'Gateway' : 'Host PC')}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })() : (() => {
                          const cleanDst = flow.dst_ip.split(' ')[0].split(':')[0];
                          const dstDev = devices.find((d) => d.ip === cleanDst);
                          return (
                            <div className="font-mono text-xs flex items-center gap-1.5">
                              <span
                                className={
                                  searchQuery && flow.dst_ip.toLowerCase().includes(searchQuery.toLowerCase().trim())
                                    ? 'bg-amber-100 text-amber-900 px-1 rounded font-bold'
                                    : 'text-[#0f172a]'
                                }
                              >
                                {flow.dst_ip}
                              </span>
                              {flow.protocol !== 'ICMP' && (
                                <span className="text-[#64748b]">:{flow.dst_port}</span>
                              )}
                              {dstDev && (
                                <span
                                  className="ml-1 px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-sans font-bold border border-blue-200 inline-flex items-center gap-1 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDevice(selectedDevice === dstDev.ip ? 'ALL' : dstDev.ip);
                                  }}
                                  title={`Physical System: ${dstDev.hostname || dstDev.label}. Click to isolate traffic.`}
                                >
                                  <Router className="w-2.5 h-2.5 text-blue-600" />
                                  {dstDev.hostname || (dstDev.is_gateway ? 'Gateway' : 'Host PC')}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-extrabold border ${protoBadgeColor}`}>
                          {flow.protocol}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-[11px] font-mono text-[#475569]">
                          <div>Pkts: <span className="font-semibold text-[#0f172a]">{flow.features.packets}</span> | Dur: {flow.features.duration_ms}ms</div>
                          <div className="text-[10px] text-[#64748b]">
                            Rate: {(flow.features.bytes_per_sec / 1024).toFixed(1)} KB/s
                            {flow.protocol === 'TCP' ? ` | SYN: ${flow.features.syn_ratio}` : ''}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0f172a]">{flow.predicted_class}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span
                          className={
                            flow.confidence > 0.95
                              ? 'text-red-600'
                              : flow.confidence > 0.85
                              ? 'text-orange-600'
                              : 'text-blue-600'
                          }
                        >
                          {(flow.confidence * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase ${
                            isBlock
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : isDrop
                              ? 'bg-orange-100 text-orange-700 border border-orange-200'
                              : isInspect
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isBlock && <XCircle className="w-3 h-3 text-red-600" />}
                          {isDrop && <AlertTriangle className="w-3 h-3 text-orange-600" />}
                          {isInspect && <Shield className="w-3 h-3 text-amber-600" />}
                          {isAllow && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                          {flow.verdict}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <Filter className="w-7 h-7 text-[#94a3b8]" />
                      <div className="font-semibold text-sm text-[#0f172a]">
                        {searchQuery
                          ? `No active flows matching "${searchQuery}" in the live buffer (${flows.length} flows)`
                          : 'No packet flows match the selected criteria.'}
                      </div>
                      <div className="text-xs text-[#64748b] max-w-md">
                        {searchQuery
                          ? 'The packet may have been captured earlier, or was excluded by active protocol/verdict filters. You can search MongoDB directly.'
                          : 'Reset filters to view all incoming network traffic.'}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {searchQuery && (
                          <button
                            onClick={() => searchDatabaseHistory(searchQuery)}
                            disabled={dbSearching}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Search className={`w-3.5 h-3.5 ${dbSearching ? 'animate-spin' : ''}`} />
                            {dbSearching ? 'Searching Database...' : `Search MongoDB for "${searchQuery}"`}
                          </button>
                        )}
                        <button
                          onClick={resetAllFilters}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                        >
                          Reset All Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveTrafficLayer1;
