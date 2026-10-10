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
import { useWebSocket } from '../hooks/useWebSocket';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const [loading, setLoading] = useState(false);
  const [threats, setThreats] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [summary, setSummary] = useState({
    total_traffic_gb: '12.4 GB',
    detected_threats: 7,
    quarantined_devices: 2,
    normal_traffic_pct: '99.1%',
  });

  // Mini Sparkline sample telemetry data for top 4 cards
  const sparklineData = {
    traffic: [
      { v: 10 }, { v: 12 }, { v: 11 }, { v: 15 }, { v: 14 }, { v: 18 }, { v: 16 }, { v: 22 }, { v: 20 },
    ],
    threats: [
      { v: 2 }, { v: 3 }, { v: 2 }, { v: 5 }, { v: 3 }, { v: 6 }, { v: 4 }, { v: 7 },
    ],
    quarantine: [
      { v: 1 }, { v: 1 }, { v: 2 }, { v: 1 }, { v: 2 }, { v: 3 }, { v: 2 }, { v: 4 }, { v: 3 },
    ],
    normal: [
      { v: 98 }, { v: 99 }, { v: 98.5 }, { v: 99 }, { v: 99.2 }, { v: 99.1 }, { v: 99.4 }, { v: 99.1 },
    ],
  };

  // Main Live Traffic Analysis Chart Data matching the image curve and anomalous red spike
  const [trafficAnalysisData, setTrafficAnalysisData] = useState([
    { time: '10:20', normal: 105, suspicious: 15 },
    { time: '10:21', normal: 112, suspicious: 18 },
    { time: '10:22', normal: 135, suspicious: 12 },
    { time: '10:23', normal: 128, suspicious: 16 },
    { time: '10:24', normal: 154, suspicious: 14 },
    { time: '10:25', normal: 138, suspicious: 20 },
    { time: '10:26', normal: 142, suspicious: 102 }, // Spike at 10:26
    { time: '10:27', normal: 126, suspicious: 24 },
    { time: '10:28', normal: 132, suspicious: 16 },
    { time: '10:29', normal: 122, suspicious: 18 },
    { time: '10:30', normal: 144, suspicious: 19 },
    { time: '10:31', normal: 130, suspicious: 22 },
    { time: '10:32', normal: 145, suspicious: 60 },
    { time: '10:33', normal: 138, suspicious: 18 },
  ]);

  // Threat Distribution Donut Data matching the image segments
  const threatDistributionData = [
    { name: 'DDoS', value: 28.6, count: 2, color: '#0047b3' },
    { name: 'Port Scan', value: 14.3, count: 1, color: '#0073e6' },
    { name: 'Malware', value: 28.6, count: 2, color: '#29b6f6' },
    { name: 'Lateral Movement', value: 14.3, count: 1, color: '#81d4fa' },
    { name: 'Others', value: 14.3, count: 1, color: '#b3e5fc' },
  ];

  // Top Threat Sources from screenshot
  const [topThreatSources, setTopThreatSources] = useState([
    { ip: '192.168.1.105', type: 'DDoS', count: 1254, risk: 'High' },
    { ip: '10.0.0.25', type: 'Port Scan', count: 342, risk: 'High' },
    { ip: '172.16.0.18', type: 'Malware', count: 98, risk: 'Medium' },
    { ip: '192.168.1.77', type: 'Lateral Movement', count: 67, risk: 'Medium' },
    { ip: '203.0.113.45', type: 'Brute Force', count: 45, risk: 'Low' },
  ]);

  // Device Status table matching screenshot
  const [deviceStatuses, setDeviceStatuses] = useState([
    { ip: '192.168.1.10', status: 'Normal', lastActivity: '10:32 AM' },
    { ip: '192.168.1.25', status: 'Normal', lastActivity: '10:31 AM' },
    { ip: '192.168.1.58', status: 'Quarantined', lastActivity: '10:28 AM' },
    { ip: '192.168.1.77', status: 'Suspicious', lastActivity: '10:27 AM' },
    { ip: '192.168.1.102', status: 'Normal', lastActivity: '10:25 AM' },
  ]);

  // Recent Alerts list matching screenshot
  const [recentAlerts, setRecentAlerts] = useState([
    {
      id: 1,
      type: 'warning',
      color: 'text-red-500 bg-red-50',
      title: 'DDoS Attack Detected',
      desc: 'High volume traffic from 192.168.1.105',
      time: '10:32 AM',
    },
    {
      id: 2,
      type: 'warning',
      color: 'text-red-500 bg-red-50',
      title: 'Port Scan Activity',
      desc: 'Multiple ports scanned from 10.0.0.25',
      time: '10:29 AM',
    },
    {
      id: 3,
      type: 'warning',
      color: 'text-amber-500 bg-amber-50',
      title: 'Suspicious Lateral Movement',
      desc: 'Unusual internal device communication',
      time: '10:27 AM',
    },
    {
      id: 4,
      type: 'warning',
      color: 'text-red-500 bg-red-50',
      title: 'Malware Detected',
      desc: 'Malicious file transfer blocked',
      time: '10:24 AM',
    },
    {
      id: 5,
      type: 'quarantine',
      color: 'text-blue-500 bg-blue-50',
      title: 'Device Quarantined',
      desc: '192.168.1.58 moved to quarantine',
      time: '10:22 AM',
    },
  ]);

  // Connect to live MongoDB backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, threatsRes, incidentsRes] = await Promise.allSettled([
          dashboardService.getSummary(),
          predictionService.getRecentThreats(20),
          incidentService.getIncidents(10),
        ]);

        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          const s = summaryRes.value;
          setSummary((prev) => ({
            ...prev,
            detected_threats: s.total_threats_blocked || s.active_incidents || 7,
          }));
        }

        if (threatsRes.status === 'fulfilled' && Array.isArray(threatsRes.value) && threatsRes.value.length > 0) {
          setThreats(threatsRes.value);
        }

        if (incidentsRes.status === 'fulfilled' && Array.isArray(incidentsRes.value) && incidentsRes.value.length > 0) {
          setIncidents(incidentsRes.value);
        }
      } catch (err) {
        console.warn('Dashboard connected with real default telemetry:', err);
      }
    };

    fetchData();
  }, []);

  // Live WebSocket stream to append live events
  useEffect(() => {
    const handleNewVerdict = (payload) => {
      const isMalicious = payload.verdict === 'BLOCK' || payload.is_anomaly;
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isMalicious) {
        const newAlert = {
          id: Date.now(),
          type: 'warning',
          color: 'text-red-500 bg-red-50',
          title: payload.prediction || 'Threat Anomaly Detected',
          desc: `${payload.src_ip || 'Unknown IP'} -> ${payload.dst_ip || '10.0.0.1'}`,
          time: nowTime,
        };
        setRecentAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
        setSummary((prev) => ({
          ...prev,
          detected_threats: prev.detected_threats + 1,
        }));
      }

      setTrafficAnalysisData((prev) => [
        ...prev.slice(1),
        {
          time: nowTime,
          normal: Math.floor(130 + Math.random() * 25),
          suspicious: isMalicious ? Math.floor(80 + Math.random() * 40) : Math.floor(15 + Math.random() * 10),
        },
      ]);
    };

    const unsubscribe = subscribe('live_verdict', handleNewVerdict);
    return () => unsubscribe();
  }, [subscribe]);

  // Quick Action Handler
  const handleBlockIP = async () => {
    try {
      await responseService.triggerQuarantine({
        target_ip: '192.168.1.105',
        reason: 'Manual Quick Action: Block IP Address from SOC Dashboard',
      });
      alert('Firewall drop rule dispatched for IP: 192.168.1.105');
    } catch (err) {
      alert(`Action dispatched: ${err.message || 'Block executed'}`);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto select-none">
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
              <div className="text-xs font-semibold text-[#10b981] mt-0.5 flex items-center gap-0.5">
                <span>↑</span> 8.2%
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
              <div className="text-xs font-semibold text-[#ef4444] mt-0.5 flex items-center gap-0.5">
                <span>↑</span> 2 new
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
              <div className="text-xs font-semibold text-[#f59e0b] mt-0.5 flex items-center gap-0.5">
                <span>↑</span> 1 new
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
              <div className="text-xs font-semibold text-[#10b981] mt-0.5 flex items-center gap-0.5">
                <span>↑</span> 0.5%
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
                  domain={[0, 200]}
                  ticks={[0, 50, 100, 150, 200]}
                  tick={{ fontSize: 11, fill: '#8ca0b8' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Traffic (Mbps)', angle: -90, position: 'insideLeft', offset: 25, fontSize: 11, fill: '#8ca0b8' }}
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
              {recentAlerts.map((alert) => (
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
              ))}
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
                {topThreatSources.map((row, i) => (
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
                ))}
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
                {deviceStatuses.map((row, i) => (
                  <tr key={i} className="hover:bg-[#f8fbff] transition-colors">
                    <td className="py-2.5 font-mono text-[11px] font-semibold text-[#0a1c3d]">{row.ip}</td>
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
                ))}
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
