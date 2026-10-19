import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  AlertTriangle,
  Shield,
  CheckCircle,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  ShieldPlus,
  FileText,
  Settings,
  Bug,
  Lock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '../services/dashboard';
import { predictionService } from '../services/prediction';
import { incidentService } from '../services/incidents';
import { responseService } from '../services/response';
import { monitoringService } from '../services/monitoring';
import { useWebSocket } from '../hooks/useWebSocket';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { subscribe, connectionStatus } = useWebSocket();

  const [loading, setLoading] = useState(false);
  const [threats, setThreats] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [liveMonitorStatus, setLiveMonitorStatus] = useState({ is_running: true, active_flows: 0 });
  const [summary, setSummary] = useState({
    total_traffic_gb: '0.0 GB',
    detected_threats: 0,
    quarantined_devices: 0,
    normal_traffic_pct: '100%',
  });

  // Dynamic Sparkline telemetry data for top 4 cards
  const [sparklineData, setSparklineData] = useState({
    traffic: [{ v: 0 }, { v: 0 }, { v: 0 }],
    threats: [{ v: 0 }, { v: 0 }, { v: 0 }],
    quarantine: [{ v: 0 }, { v: 0 }, { v: 0 }],
    normal: [{ v: 100 }, { v: 100 }, { v: 100 }],
  });

  // Main Live Traffic Analysis Chart Data dynamically bucketed from real records
  const [trafficAnalysisData, setTrafficAnalysisData] = useState([]);

  // Threat Distribution Donut Data dynamically calculated from real threat records
  const [threatDistributionData, setThreatDistributionData] = useState([]);

  // Top Threat Sources dynamically extracted from real threats
  const [topThreatSources, setTopThreatSources] = useState([]);

  // Device Status table dynamically derived from real observed devices
  const [deviceStatuses, setDeviceStatuses] = useState([]);

  // Recent Alerts list dynamically derived from real incidents & threat outliers
  const [recentAlerts, setRecentAlerts] = useState([]);

  // Connect to live MongoDB backend & Network Telemetry
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [summaryRes, threatsRes, incidentsRes, topologyRes, monitorStatusRes] = await Promise.allSettled([
          dashboardService.getSummary(),
          predictionService.getRecentThreats(100),
          incidentService.getIncidents(50),
          monitoringService.getLocalTopology(),
          monitoringService.getStatus(),
        ]);

        if (!isMounted) return;

        const s = summaryRes.status === 'fulfilled' && summaryRes.value ? summaryRes.value : {};
        const threatsList = threatsRes.status === 'fulfilled' && Array.isArray(threatsRes.value) ? threatsRes.value : [];
        const incidentsList = incidentsRes.status === 'fulfilled' && Array.isArray(incidentsRes.value) ? incidentsRes.value : [];
        const topoData = topologyRes.status === 'fulfilled' && topologyRes.value ? topologyRes.value : {};
        const mStatus = monitorStatusRes.status === 'fulfilled' && monitorStatusRes.value ? monitorStatusRes.value : {};

        if (mStatus) setLiveMonitorStatus(mStatus);
        if (threatsList.length > 0) setThreats(threatsList);
        if (incidentsList.length > 0) setIncidents(incidentsList);

        // 1. Dynamic Summary KPIs from real telemetry
        const actualThreatRecords = threatsList.filter(
          (t) =>
            t.is_anomaly ||
            t.action === 'RECOMMEND_BLOCK' ||
            t.action === 'QUARANTINE' ||
            t.verdict === 'BLOCK' ||
            t.prediction === 'MALICIOUS' ||
            String(t.severity).toUpperCase() === 'HIGH' ||
            String(t.severity).toUpperCase() === 'CRITICAL'
        );
        const quarantinedCount = incidentsList.filter(
          (i) => i.response_action === 'quarantine' || String(i.description).includes('QUARANTINE')
        ).length;
        const benignCount = threatsList.filter((t) => !t.is_anomaly && t.prediction === 'BENIGN').length;
        const normalPct = threatsList.length > 0 ? ((benignCount / threatsList.length) * 100).toFixed(1) + '%' : '100%';

        // Compute actual wire byte volume across observed flows
        const totalBytes = threatsList.reduce((acc, t) => {
          const bytes = t.raw_data?.byte_count || t.bytes_transferred || (t.protocol === 'TCP' ? 1460 : 512);
          return acc + bytes;
        }, 0);

        let trafficStr = '0.0 MB';
        if (totalBytes >= 1024 * 1024 * 1024) {
          trafficStr = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        } else if (totalBytes >= 1024 * 1024) {
          trafficStr = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
        } else {
          trafficStr = `${Math.max(1, Math.round(totalBytes / 1024))} KB`;
        }

        const totalThreatsDetected = actualThreatRecords.length + (incidentsList ? incidentsList.length : 0);

        setSummary({
          total_traffic_gb: trafficStr,
          detected_threats: totalThreatsDetected,
          quarantined_devices: quarantinedCount,
          normal_traffic_pct: normalPct,
          total_flows: threatsList.length,
          benign_count: benignCount,
        });

        // 2. Dynamic Top Threat Sources (Only populated from actual threats & incidents)
        const threatEntities = [
          ...actualThreatRecords.map((t) => ({
            ip: t.src_ip,
            type: t.prediction || t.reason || 'Network Anomaly',
            severity: t.severity || 'High',
          })),
          ...incidentsList.map((inc) => ({
            ip: inc.src_ip || (inc.affected_assets && inc.affected_assets[0]) || 'Unknown',
            type: inc.description || 'AI Incident',
            severity: inc.severity || 'High',
          })),
        ];

        if (threatEntities.length > 0) {
          const ipMap = {};
          threatEntities.forEach((t) => {
            const ip = t.ip;
            if (!ip) return;
            if (!ipMap[ip]) {
              ipMap[ip] = {
                ip,
                type: t.type,
                count: 0,
                risk: String(t.severity || 'High').charAt(0).toUpperCase() + String(t.severity || 'high').slice(1).toLowerCase(),
              };
            }
            ipMap[ip].count += 1;
          });
          const sortedSources = Object.values(ipMap).sort((a, b) => b.count - a.count).slice(0, 5);
          setTopThreatSources(sortedSources);
        } else {
          setTopThreatSources([]);
        }

        // 3. Dynamic Device Statuses from Observed Real Local Wi-Fi Topology & Incidents
        const topoDevices = Array.isArray(topoData.devices) ? topoData.devices : [];
        if (topoDevices.length > 0) {
          const devList = topoDevices.slice(0, 6).map((dev) => {
            const ip = dev.ip;
            const isQuar = incidentsList.some((inc) => (inc.src_ip === ip || (inc.affected_assets && inc.affected_assets.includes(ip))) && inc.response_action === 'quarantine');
            const isSusp = threatsList.some((t) => (t.src_ip === ip || t.dst_ip === ip) && (t.is_anomaly || t.severity === 'CRITICAL' || t.severity === 'HIGH'));
            return {
              ip,
              hostname: dev.hostname || dev.label || ip,
              status: isQuar ? 'Quarantined' : isSusp ? 'Suspicious' : 'Normal',
              type: dev.type || 'workstation',
              lastActivity: 'Active on Wi-Fi',
            };
          });
          setDeviceStatuses(devList);
        } else if (threatsList.length > 0) {
          const devMap = {};
          threatsList.forEach((t) => {
            const ip = t.src_ip;
            if (!ip || devMap[ip]) return;
            const isQuar = t.action === 'QUARANTINE' || incidentsList.some((inc) => (inc.src_ip === ip || (inc.affected_assets && inc.affected_assets.includes(ip))) && inc.response_action === 'quarantine');
            const isSusp = t.is_anomaly || t.severity === 'CRITICAL' || t.severity === 'HIGH';
            devMap[ip] = {
              ip,
              hostname: ip,
              status: isQuar ? 'Quarantined' : isSusp ? 'Suspicious' : 'Normal',
              lastActivity: t.timestamp ? new Date(t.timestamp * (t.timestamp < 10000000000 ? 1000 : 1)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            };
          });
          setDeviceStatuses(Object.values(devMap).slice(0, 5));
        }

        // 4. Dynamic Recent Alerts from Real Incidents and Threat Outliers
        const realAlerts = [];
        incidentsList.slice(0, 3).forEach((inc, idx) => {
          realAlerts.push({
            id: `INC-ALERT-${idx}`,
            type: inc.response_action === 'quarantine' ? 'quarantine' : 'warning',
            color: inc.response_action === 'quarantine' ? 'text-blue-500 bg-blue-50' : 'text-red-500 bg-red-50',
            title: inc.description ? inc.description.slice(0, 36) : 'Threat Anomaly Flagged',
            desc: inc.src_ip ? `Host ${inc.src_ip} flagged by AI engine` : 'Investigated by Response Engine',
            time: inc.created_at ? new Date(inc.created_at * (inc.created_at < 10000000000 ? 1000 : 1)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          });
        });

        threatsList.filter((t) => t.is_anomaly || t.severity === 'CRITICAL').slice(0, 2).forEach((thr, idx) => {
          realAlerts.push({
            id: `THR-ALERT-${idx}`,
            type: 'warning',
            color: 'text-amber-500 bg-amber-50',
            title: thr.prediction || 'Behavioral Flow Outlier',
            desc: `${thr.src_ip || 'Host'} -> ${thr.dst_ip || 'Gateway'}`,
            time: thr.timestamp ? new Date(thr.timestamp * (thr.timestamp < 10000000000 ? 1000 : 1)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          });
        });

        if (realAlerts.length > 0) {
          setRecentAlerts(realAlerts.slice(0, 5));
        }

        // 5. Dynamic Traffic Analysis Timeline Buckets
        if (threatsList.length > 0) {
          const sortedByTime = [...threatsList].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          const minTime = sortedByTime[0]?.timestamp || (Date.now() / 1000 - 3600);
          const maxTime = sortedByTime[sortedByTime.length - 1]?.timestamp || (Date.now() / 1000);
          const timeSpan = Math.max(maxTime - minTime, 60);
          const bucketsCount = 10;
          const bucketSize = timeSpan / bucketsCount;

          const buckets = Array.from({ length: bucketsCount }, (_, i) => {
            const bucketStart = minTime + i * bucketSize;
            const timeLabel = new Date(bucketStart * (bucketStart < 10000000000 ? 1000 : 1)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return { time: timeLabel, normal: 0, suspicious: 0 };
          });

          threatsList.forEach((t) => {
            const ts = t.timestamp || minTime;
            const idx = Math.min(Math.floor((ts - minTime) / bucketSize), bucketsCount - 1);
            if (idx >= 0 && idx < bucketsCount) {
              if (t.is_anomaly || t.prediction === 'MALICIOUS' || t.prediction === 'ANOMALY') {
                buckets[idx].suspicious += 1;
              } else {
                buckets[idx].normal += 1;
              }
            }
          });
          setTrafficAnalysisData(buckets);

          // Dynamic Sparklines for top cards
          setSparklineData({
            traffic: buckets.map((b) => ({ v: b.normal + b.suspicious })),
            threats: buckets.map((b) => ({ v: b.suspicious })),
            quarantine: buckets.map((b) => ({ v: Math.min(b.suspicious, quarantinedCount) })),
            normal: buckets.map((b) => ({ v: b.normal + b.suspicious > 0 ? Number(((b.normal / (b.normal + b.suspicious)) * 100).toFixed(1)) : 100 })),
          });
        }

        // 6. Dynamic Threat Distribution Donut Data
        if (threatsList.length > 0) {
          const catCounts = {
            'DDoS': 0,
            'Port Scan': 0,
            'Malware': 0,
            'Lateral Movement': 0,
            'Others': 0,
          };
          const anomalies = threatsList.filter((t) => t.is_anomaly || t.prediction !== 'BENIGN');
          anomalies.forEach((t) => {
            const pred = String(t.prediction || t.reason || '').toLowerCase();
            if (pred.includes('ddos') || pred.includes('syn') || pred.includes('flood')) {
              catCounts['DDoS'] += 1;
            } else if (pred.includes('scan') || pred.includes('probe') || pred.includes('recon')) {
              catCounts['Port Scan'] += 1;
            } else if (pred.includes('malware') || pred.includes('c2') || pred.includes('trojan')) {
              catCounts['Malware'] += 1;
            } else if (pred.includes('lateral') || pred.includes('smb') || pred.includes('auth')) {
              catCounts['Lateral Movement'] += 1;
            } else {
              catCounts['Others'] += 1;
            }
          });

          const totalAnom = Math.max(anomalies.length, 1);
          const colors = {
            'DDoS': '#0047b3',
            'Port Scan': '#0073e6',
            'Malware': '#29b6f6',
            'Lateral Movement': '#81d4fa',
            'Others': '#b3e5fc',
          };
          const distData = Object.entries(catCounts)
            .filter(([_, count]) => count > 0 || anomalies.length === 0)
            .map(([name, count]) => ({
              name,
              count,
              value: Math.round((count / totalAnom) * 100) || (anomalies.length === 0 && name === 'Others' ? 100 : 0),
              color: colors[name],
            }));
          setThreatDistributionData(distData.length > 0 ? distData : [{ name: 'Benign Flow', value: 100, count: 0, color: '#10b981' }]);
        }
      } catch (err) {
        console.warn('Dashboard telemetry error:', err);
      }
    };

    fetchData();
    // Auto-refresh periodically to keep telemetry completely live
    const interval = setInterval(fetchData, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Multi-event Live WebSocket subscriptions for instant wire reaction
  useEffect(() => {
    const handleNewVerdict = (payload) => {
      if (!payload) return;
      const isMalicious = 
        payload.action === 'RECOMMEND_BLOCK' ||
        payload.action === 'QUARANTINE' ||
        payload.verdict === 'BLOCK' ||
        payload.verdict === 'DROP' ||
        payload.is_anomaly ||
        payload.prediction === 'MALICIOUS' ||
        String(payload.severity).toUpperCase() === 'HIGH' ||
        String(payload.severity).toUpperCase() === 'CRITICAL';

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isMalicious) {
        const newAlert = {
          id: Date.now(),
          type: 'warning',
          color: 'text-red-500 bg-red-50',
          title: payload.prediction || 'Threat Anomaly Detected',
          desc: `${payload.src_ip || 'Internal Host'} -> ${payload.dst_ip || 'Gateway'}`,
          time: nowTime,
        };
        setRecentAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
        setSummary((prev) => ({
          ...prev,
          detected_threats: (prev.detected_threats || 0) + 1,
        }));
      }

      // Live Traffic Timeline updates with real incoming flow counts
      setTrafficAnalysisData((prev) => {
        if (!prev || prev.length === 0) {
          return [{ time: nowTime, normal: isMalicious ? 0 : 1, suspicious: isMalicious ? 1 : 0 }];
        }
        const last = prev[prev.length - 1];
        if (last.time === nowTime) {
          return [
            ...prev.slice(0, prev.length - 1),
            {
              ...last,
              normal: last.normal + (isMalicious ? 0 : 1),
              suspicious: last.suspicious + (isMalicious ? 1 : 0),
            },
          ];
        } else {
          return [
            ...prev.slice(Math.max(0, prev.length - 9)),
            {
              time: nowTime,
              normal: isMalicious ? 0 : 1,
              suspicious: isMalicious ? 1 : 0,
            },
          ];
        }
      });
    };

    const handleNewIncident = (payload) => {
      if (!payload) return;
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newAlert = {
        id: `INC-LIVE-${Date.now()}`,
        type: payload.response_action === 'quarantine' ? 'quarantine' : 'warning',
        color: payload.response_action === 'quarantine' ? 'text-blue-500 bg-blue-50' : 'text-red-500 bg-red-50',
        title: payload.description || 'Autonomous Incident Created',
        desc: payload.src_ip ? `Host ${payload.src_ip} flagged` : 'Enforcement triggered',
        time: nowTime,
      };
      setRecentAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
      setSummary((prev) => ({
        ...prev,
        detected_threats: (prev.detected_threats || 0) + 1,
      }));
    };

    const handleQuarantine = (payload) => {
      if (!payload) return;
      setSummary((prev) => ({
        ...prev,
        quarantined_devices: (prev.quarantined_devices || 0) + 1,
      }));
      if (payload.ip) {
        setDeviceStatuses((prev) =>
          prev.map((d) => (d.ip === payload.ip ? { ...d, status: 'Quarantined' } : d))
        );
      }
    };

    const unsub1 = subscribe('live_verdict', handleNewVerdict);
    const unsub2 = subscribe('new_incident', handleNewIncident);
    const unsub3 = subscribe('quarantine_action', handleQuarantine);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [subscribe]);

  // Quick Action Handler
  const handleBlockIP = async () => {
    const defaultIp = topThreatSources[0]?.ip;
    const targetIp = window.prompt('Enter target IP address to block:', defaultIp || '');
    if (!targetIp) return;
    try {
      await responseService.triggerQuarantine({
        target_ip: targetIp,
        reason: `Manual Quick Action: Block IP Address from SOC Dashboard (${targetIp})`,
      });
      alert(`Firewall drop rule dispatched for IP: ${targetIp}`);
    } catch (err) {
      alert(`Action error: ${err.message || 'Block executed'}`);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto select-none">
      {/* LIVE SOC TELEMETRY BEACON HEADER */}
      <div className="bg-white rounded-2xl p-4 border border-[#e2eaf4] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0a1c3d] tracking-tight">LIVE NETWORK TELEMETRY ACTIVE</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {connectionStatus === 'connected' ? 'WebSocket Live' : 'Connecting'}
              </span>
            </div>
            <p className="text-xs text-[#687d9a] mt-0.5">
              Continuous Layer 1 & 2 wire capture active on Wi-Fi subnet • {deviceStatuses.length} verified endpoints monitored
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/monitoring')}
            className="px-3.5 py-1.5 rounded-xl border border-[#dbe6f5] hover:bg-[#f0f5fc] text-xs font-semibold text-[#0a1c3d] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 text-blue-600" /> View Live Wire
          </button>
          <button
            onClick={() => navigate('/threat-detection')}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Threat Detection
          </button>
        </div>
      </div>

      {/* 1. TOP 4 STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Traffic */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#0a3272] flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-900/20">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#687d9a] font-medium">Total Traffic</div>
              <div className="text-2xl font-extrabold text-[#0a1c3d] tracking-tight mt-0.5">
                {summary.total_traffic_gb}
              </div>
              <div className="text-xs font-semibold text-[#0284c7] mt-0.5 flex items-center gap-1">
                <span>●</span> {summary.total_flows || threats.length || 0} live flows
              </div>
            </div>
          </div>
          {/* Sparkline */}
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.traffic}>
                <defs>
                  <linearGradient id="sparkTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#0284c7" strokeWidth={2} fill="url(#sparkTraffic)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Detected Threats */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#03153d] flex items-center justify-center text-white shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs text-[#687d9a] font-medium">Detected Threats</div>
              <div className="text-2xl font-extrabold text-[#0a1c3d] tracking-tight mt-0.5">
                {summary.detected_threats}
              </div>
              <div
                className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${
                  summary.detected_threats > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'
                }`}
              >
                <span>●</span> {summary.detected_threats > 0 ? `${summary.detected_threats} flagged` : 'Subnet clean'}
              </div>
            </div>
          </div>
          {/* Sparkline */}
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.threats}>
                <defs>
                  <linearGradient id="sparkThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#ef4444" strokeWidth={2} fill="url(#sparkThreats)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Quarantined Devices */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#d8e8fc] flex items-center justify-center text-[#0a48a3] shrink-0">
              <Shield className="w-5 h-5 text-[#0a48a3]" />
            </div>
            <div>
              <div className="text-xs text-[#687d9a] font-medium">Quarantined Devices</div>
              <div className="text-2xl font-extrabold text-[#0a1c3d] tracking-tight mt-0.5">
                {summary.quarantined_devices}
              </div>
              <div
                className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${
                  summary.quarantined_devices > 0 ? 'text-[#f59e0b]' : 'text-[#687d9a]'
                }`}
              >
                <span>●</span> {summary.quarantined_devices > 0 ? `${summary.quarantined_devices} isolated` : '0 isolated'}
              </div>
            </div>
          </div>
          {/* Sparkline */}
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.quarantine}>
                <defs>
                  <linearGradient id="sparkQuarantine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={2} fill="url(#sparkQuarantine)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Normal Traffic */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#dcfce7] flex items-center justify-center text-[#10b981] shrink-0">
              <CheckCircle className="w-5 h-5 text-[#10b981]" />
            </div>
            <div>
              <div className="text-xs text-[#687d9a] font-medium">Normal Traffic</div>
              <div className="text-2xl font-extrabold text-[#0a1c3d] tracking-tight mt-0.5">
                {summary.normal_traffic_pct}
              </div>
              <div className="text-xs font-semibold text-[#10b981] mt-0.5 flex items-center gap-1">
                <span>●</span> {summary.benign_count ?? threats.length} clean flows
              </div>
            </div>
          </div>
          {/* Sparkline */}
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.normal}>
                <defs>
                  <linearGradient id="sparkNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} fill="url(#sparkNormal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: Live Traffic Analysis (Left) + Threat Distribution & Recent Alerts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Live Traffic Analysis */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-[#e2eaf4] shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-base font-bold text-[#0a1c3d]">Live Traffic Analysis</h2>

            <div className="flex items-center gap-5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0073e6]" />
                <span className="text-[#687d9a] font-medium">Normal Traffic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <span className="text-[#687d9a] font-medium">Suspicious Traffic</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#e2eaf4] text-[#687d9a] bg-[#f8fbff] cursor-pointer">
                <span>Last 15 minutes</span>
                <ChevronDown className="w-3 h-3 text-[#687d9a]" />
              </div>
            </div>
          </div>

          {/* Area Chart matching screenshot */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficAnalysisData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <defs>
                  <linearGradient id="mainNormalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="mainSuspiciousGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f9" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#8ca0b8' }}
                  axisLine={{ stroke: '#e2eaf4' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 'auto']}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#8ca0b8' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Active Flows', angle: -90, position: 'insideLeft', offset: 25, fontSize: 11, fill: '#8ca0b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a1c3d',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="normal"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fill="url(#mainNormalGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="suspicious"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#mainSuspiciousGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-[11px] text-[#8ca0b8] font-medium -mt-1">Time</div>
        </div>

        {/* Right Column (4 cols): Threat Distribution + Recent Alerts */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card: Threat Distribution Donut */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#0a1c3d]">Threat Distribution</h3>
              <div className="flex items-center gap-1 text-[11px] text-[#687d9a] cursor-pointer">
                <span>Last 24 Hours</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {/* Donut Chart with Center Text */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={threatDistributionData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={2}
                    >
                      {threatDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-extrabold text-[#0a1c3d] leading-none">
                    {summary.detected_threats}
                  </span>
                  <span className="text-[10px] text-[#687d9a] font-medium mt-0.5">Threats</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 flex-1 text-xs">
                {threatDistributionData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[#475569] text-[11px] font-medium">{item.name}</span>
                    </div>
                    <span className="font-semibold text-[#0a1c3d] text-[11px]">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Recent Alerts */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9] mb-3">
              <h3 className="text-sm font-bold text-[#0a1c3d]">Recent Alerts</h3>
              <button
                onClick={() => navigate('/threats')}
                className="text-xs font-semibold text-[#0073e6] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {recentAlerts.length === 0 ? (
                <div className="text-xs text-[#8ca0b8] text-center py-6">No recent alerts recorded.</div>
              ) : (
                recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${alert.color}`}>
                        {alert.type === 'quarantine' ? (
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-600" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#0a1c3d] leading-tight">{alert.title}</div>
                        <div className="text-[11px] text-[#687d9a] leading-tight mt-0.5">{alert.desc}</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-[#8ca0b8] font-medium whitespace-nowrap">{alert.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW: Top Threat Sources (Left) + Device Status (Middle) + Quick Actions (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Box 1: Top Threat Sources */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-xs">
          <h3 className="text-sm font-bold text-[#0a1c3d] mb-3">Top Threat Sources</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8ca0b8] border-b border-[#f1f5f9] font-medium">
                  <th className="pb-2">IP Address</th>
                  <th className="pb-2">Threat Type</th>
                  <th className="pb-2 text-center">Count</th>
                  <th className="pb-2 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8fbff]">
                {topThreatSources.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#8ca0b8]">
                      No active threat sources detected.
                    </td>
                  </tr>
                ) : (
                  topThreatSources.map((row, i) => (
                    <tr key={i} className="hover:bg-[#f8fbff] transition-colors">
                      <td className="py-2.5 font-mono text-[11px] font-semibold text-[#0a1c3d]">{row.ip}</td>
                      <td className="py-2.5 text-[11px] text-[#475569]">{row.type}</td>
                      <td className="py-2.5 font-mono text-[11px] text-[#475569] text-center">{row.count}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.risk === 'High'
                              ? 'bg-[#fee2e2] text-[#ef4444]'
                              : row.risk === 'Medium'
                              ? 'bg-[#fef3c7] text-[#f59e0b]'
                              : 'bg-[#dcfce7] text-[#10b981]'
                          }`}
                        >
                          {row.risk}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Box 2: Device Status */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#0a1c3d]">Device Status</h3>
            <button
              onClick={() => navigate('/network-layer2')}
              className="text-xs font-semibold text-[#0073e6] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8ca0b8] border-b border-[#f1f5f9] font-medium">
                  <th className="pb-2">Device IP</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8fbff]">
                {deviceStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[#8ca0b8]">
                      No active devices observed.
                    </td>
                  </tr>
                ) : (
                  deviceStatuses.map((row, i) => (
                    <tr key={i} className="hover:bg-[#f8fbff] transition-colors">
                      <td className="py-2.5 text-[11px]">
                        <div className="font-semibold text-[#0a1c3d] truncate max-w-[140px]">{row.hostname || row.ip}</div>
                        {row.hostname && row.hostname !== row.ip && (
                          <div className="text-[10px] text-[#687d9a] font-mono">{row.ip}</div>
                        )}
                      </td>
                      <td className="py-2.5 text-[11px]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              row.status === 'Normal'
                                ? 'bg-[#10b981]'
                                : row.status === 'Quarantined'
                                ? 'bg-[#ef4444]'
                                : 'bg-[#f59e0b]'
                            }`}
                          />
                          <span
                            className={
                              row.status === 'Normal'
                                ? 'text-[#10b981]'
                                : row.status === 'Quarantined'
                                ? 'text-[#ef4444]'
                                : 'text-[#f59e0b]'
                            }
                          >
                            {row.status}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 text-[11px] text-[#8ca0b8] text-right font-medium">{row.lastActivity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Box 3: Quick Actions */}
        <div className="bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-[#0a1c3d] mb-3">Quick Actions</h3>

          <div className="space-y-2.5 flex-1 flex flex-col justify-between">
            {/* Action 1: Quarantine Device */}
            <button
              onClick={() => navigate('/quarantine')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#03153d] hover:bg-[#072464] text-white flex items-center justify-between text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Bug className="w-4 h-4 text-white" />
                <span>Quarantine Device</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            {/* Action 2: Block IP Address */}
            <button
              onClick={handleBlockIP}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white flex items-center justify-between text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <ShieldPlus className="w-4 h-4 text-white" />
                <span>Block IP Address</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            {/* Action 3: Generate Report */}
            <button
              onClick={() => navigate('/reports')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#29b6f6] hover:bg-[#029ae4] text-white flex items-center justify-between text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-white" />
                <span>Generate Report</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            {/* Action 4: System Settings */}
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#f0f6fd] hover:bg-[#e4effb] text-[#0a1c3d] border border-[#d5e2f0] flex items-center justify-between text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-[#0a1c3d]" />
                <span>System Settings</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#0a1c3d]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
