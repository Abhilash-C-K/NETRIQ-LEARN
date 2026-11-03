import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SnifferControlPanel } from '../components/SnifferControlPanel';
import { OperationalMetrics } from '../components/OperationalMetrics';
import { FlowRateChart } from '../components/FlowRateChart';
import { ConnectionTable } from '../components/ConnectionTable';
import { VerdictCard } from '../components/VerdictCard';
import { DeviceActivityDrawer } from '../components/DeviceActivityDrawer';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { monitoringService } from '../services/monitoring';
import { incidentService } from '../services/incidents';
import { predictionService } from '../services/prediction';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CyberTerminal } from '../components/ui/CyberTerminal';
import {
  Activity,
  Radio,
  AlertTriangle,
  Zap,
  Terminal as TerminalIcon,
  Laptop,
  Router,
  Smartphone,
  Server,
  Network,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const Monitoring = () => {
  const navigate = useNavigate();
  const { role, hasCapability } = useAuth();
  const isAdmin = role === 'admin' || hasCapability('MANAGE_SETTINGS');

  const [status, setStatus] = useState(null);
  const [feed, setFeed] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards' | 'terminal'
  const [selectedDeviceIp, setSelectedDeviceIp] = useState(null);

  // Fetch local network topology devices
  useEffect(() => {
    monitoringService.getLocalTopology()
      .then((topo) => {
        if (topo && Array.isArray(topo.devices)) {
          setDevices(topo.devices);
        }
      })
      .catch((err) => console.warn('Could not load local network topology devices:', err));
  }, []);

  // Fetch initial sniffer status & recent captured flows (merging active incidents)
  const fetchStatus = useCallback(async () => {
    try {
      const [statusData, threatsData, incidentsData] = await Promise.allSettled([
        monitoringService.getStatus(),
        predictionService.getRecentThreats(50),
        incidentService.getIncidents(20),
      ]);
      if (statusData.status === 'fulfilled') setStatus(statusData.value);

      const incList = incidentsData.status === 'fulfilled' && Array.isArray(incidentsData.value) ? incidentsData.value : [];
      const thrList = threatsData.status === 'fulfilled' && Array.isArray(threatsData.value) ? threatsData.value : [];

      const activeIncFlows = incList
        .filter((i) => i.status !== 'resolved')
        .map((inc, idx) => ({
          id: inc.id || `INC-${idx}`,
          src_ip: inc.src_ip || '185.220.101.5',
          dst_ip: inc.dst_ip || '192.168.1.77',
          src_port: inc.src_port || 54321,
          dst_port: inc.dst_port || 80,
          protocol: inc.protocol || 'TCP',
          prediction: inc.description || 'Active Threat Incident',
          confidence: typeof inc.confidence === 'number' ? (inc.confidence > 1 ? +(inc.confidence / 100).toFixed(3) : inc.confidence) : 0.965,
          severity: inc.severity || 'CRITICAL',
          action: inc.response_action || 'RECOMMEND_BLOCK',
          is_anomaly: true,
          timestamp: inc.created_at || (Date.now() / 1000),
        }));

      const combined = [...activeIncFlows, ...thrList];
      if (combined.length > 0) {
        const threats = combined.filter((item) => item.is_anomaly || ['CRITICAL', 'HIGH', 'MEDIUM'].includes(item.severity) || ['BLOCK', 'RECOMMEND_BLOCK', 'QUARANTINE'].includes(item.action));
        const benign = combined.filter((item) => !threats.includes(item));
        setFeed([...threats, ...benign.slice(0, 100)].slice(0, 150));
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch monitoring status:', err);
      setError('Unable to fetch live sniffer status from server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // WebSocket Live Events
  const { connectionStatus, subscribe } = useWebSocket();

  useEffect(() => {
    const isThreatItem = (item) => Boolean(
      item.is_anomaly ||
      ['CRITICAL', 'HIGH', 'MEDIUM'].includes(item.severity) ||
      ['CRITICAL', 'HIGH', 'MEDIUM'].includes(item.risk_category?.toUpperCase()) ||
      ['BLOCK', 'RECOMMEND_BLOCK', 'QUARANTINE'].includes(item.action) ||
      ['BLOCK', 'RECOMMEND_BLOCK', 'QUARANTINE'].includes(item.decision?.action)
    );

    const handleVerdict = (payload) => {
      if (!payload) return;
      setFeed((prev) => {
        const next = [payload, ...prev];
        const threats = next.filter(isThreatItem);
        const benign = next.filter((item) => !threats.includes(item));
        return [...threats, ...benign.slice(0, 100)].slice(0, 150);
      });
    };

    const handleStatus = (payload) => {
      if (!payload) return;
      setStatus((prev) => ({ ...prev, ...payload }));
    };

    const handleNewIncident = (payload) => {
      if (!payload) return;
      const incFlow = {
        id: payload.id,
        src_ip: payload.src_ip || '185.220.101.5',
        dst_ip: payload.dst_ip || '192.168.1.77',
        src_port: payload.src_port || 54321,
        dst_port: payload.dst_port || 80,
        protocol: payload.protocol || 'TCP',
        prediction: payload.description || 'Simulated Threat Incident',
        confidence: payload.confidence || 0.965,
        severity: payload.severity || 'CRITICAL',
        action: payload.response_action || 'RECOMMEND_BLOCK',
        is_anomaly: true,
        timestamp: payload.created_at || (Date.now() / 1000),
      };
      setFeed((prev) => {
        const next = [incFlow, ...prev];
        const threats = next.filter(isThreatItem);
        const benign = next.filter((item) => !threats.includes(item));
        return [...threats, ...benign.slice(0, 100)].slice(0, 150);
      });
    };

    const unsub1 = subscribe('live_verdict', handleVerdict);
    const unsub2 = subscribe('threat_alert', handleVerdict);
    const unsub3 = subscribe('new_incident', handleNewIncident);
    const unsub4 = subscribe('monitor_status', handleStatus);
    const unsub5 = subscribe('sniffer_status', handleStatus);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [subscribe]);

  const handleStart = async () => {
    try {
      setIsLoading(true);
      await monitoringService.start();
      await fetchStatus();
    } catch (err) {
      console.error('Failed to start sniffer:', err);
      setError('Failed to start packet capture engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsLoading(true);
      await monitoringService.stop();
      await fetchStatus();
    } catch (err) {
      console.error('Failed to stop sniffer:', err);
      setError('Failed to stop packet capture engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateThreat = async () => {
    try {
      const { data, predictionId } = await predictionService.runTestPrediction();
      const payload = {
        prediction_id: predictionId,
        src_ip: data.flow_summary?.src_ip || '10.40.184.165',
        dst_ip: data.flow_summary?.dst_ip || '159.41.181.98',
        src_port: data.flow_summary?.src_port || 58496,
        dst_port: data.flow_summary?.dst_port || 27017,
        protocol: 'TCP',
        sni: data.flow_summary?.sni,
        severity: data.risk_level?.toUpperCase() || (data.verdict ? 'HIGH' : 'LOW'),
        action: data.action?.toUpperCase() || (data.verdict ? 'QUARANTINE' : 'NOTIFY'),
        verdict: data.verdict,
        confidence: typeof data.confidence === 'number' ? (data.confidence > 1 ? +(data.confidence / 100).toFixed(4) : data.confidence) : 0.96,
        timestamp: new Date().toISOString(),
        reason: data.reason,
      };
      setFeed((prev) => [payload, ...prev].slice(0, 50));
    } catch (err) {
      console.error('Simulation error:', err);
    }
  };

  const isRunning = status?.is_running ?? false;
  const metrics = status?.operational_metrics || status?.metrics || {};

  const displayFeed = useMemo(() => {
    if (selectedDevice === 'ALL') return feed;
    return feed.filter((item) => {
      const src = item.src_ip || item.flow_data?.src_ip || '';
      const dst = item.dst_ip || item.flow_data?.dst_ip || '';
      return src.includes(selectedDevice) || dst.includes(selectedDevice);
    });
  }, [feed, selectedDevice]);

  const terminalLogs = displayFeed.map(
    (item) =>
      `[${new Date(item.timestamp || Date.now()).toLocaleTimeString()}] FLOW: ${item.src_ip}:${item.src_port || 0} -> ${item.dst_ip}:${item.dst_port || 0} | ACTION: ${item.action || 'PASS'} | VERDICT: ${item.verdict ? 'MALICIOUS' : 'BENIGN'}`
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Sniffer Control & Statistics (Hierarchy: Capture status -> Statistics) */}
      <SnifferControlPanel
        status={status}
        onStart={handleStart}
        onStop={handleStop}
        isLoading={isLoading}
      />

      {/* 2. Operational Metrics Cards */}
      <OperationalMetrics metrics={metrics} />

      {/* 3. Real-Time Flow Throughput Chart */}
      <FlowRateChart entries={feed} isRunning={isRunning} />

      {/* 4. Connected Network Systems (Wi-Fi / LAN) Overview */}
      {devices && devices.length > 0 && (
        <Card className="bg-white border border-[#e2eaf4] text-[#0a1c3d] shadow-xs rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-[#e2eaf4]">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#0a1c3d] font-sans">
                  Connected Systems on Local Network
                </h3>
                <span className="text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-semibold">
                  {devices.length} {devices.length === 1 ? 'System' : 'Systems'} Online
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/network-layer2"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold hover:underline"
                >
                  <span>Layer 2 Topology Canvas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <p className="text-xs text-[#687d9a] mb-4 font-sans">
              Select any system below to isolate its ingress/egress packets in the live telemetry stream.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map((dev) => {
                const isSelected = selectedDevice === dev.ip;
                const count = feed.filter((item) => {
                  const s = item.src_ip || item.flow_data?.src_ip || '';
                  const d = item.dst_ip || item.flow_data?.dst_ip || '';
                  return s.includes(dev.ip) || d.includes(dev.ip);
                }).length;

                return (
                  <div
                    key={dev.ip}
                    onClick={() => setSelectedDevice(isSelected ? 'ALL' : dev.ip)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-500'
                        : 'bg-[#f8fafc] hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              dev.is_gateway || dev.type === 'router'
                                ? 'bg-zinc-950 text-white border border-zinc-700'
                                : dev.type === 'mobile' || dev.type === 'smartphone'
                                ? 'bg-[#C1E8FF] text-[#034466] border border-[#7EC5F2]'
                                : dev.type === 'server' || dev.type === 'iot'
                                ? 'bg-[#0747a1] text-white border border-[#0747a1]'
                                : 'bg-[#065A72] text-white border border-[#065A72]'
                            }`}
                          >
                            {dev.is_gateway || dev.type === 'router' ? (
                              <Router className="w-4 h-4 text-white" />
                            ) : dev.type === 'mobile' || dev.type === 'smartphone' ? (
                              <Smartphone className="w-4 h-4 text-[#034466]" />
                            ) : dev.type === 'server' || dev.type === 'iot' ? (
                              <Server className="w-4 h-4 text-white" />
                            ) : (
                              <Laptop className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#0a1c3d] truncate">
                              {dev.hostname || dev.label}
                            </h4>
                            <span className="text-[10px] text-[#687d9a] font-sans">
                              {dev.is_host ? 'Host PC Sensor' : dev.is_gateway ? 'Wi-Fi Default Gateway' : 'Network Endpoint'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isSelected ? 'FILTERED' : 'ONLINE'}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] font-mono text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex justify-between">
                          <span className="text-slate-400">IP:</span>
                          <span className="text-slate-900 font-bold">{dev.ip}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">MAC:</span>
                          <span className="text-slate-600 truncate max-w-[130px]">{dev.mac || 'Active Interface'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Packets in Buffer:</span>
                          <span className="text-blue-600 font-bold">{count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-blue-600 font-semibold">
                        {isSelected ? '✓ Filtering stream' : 'Click to group/filter'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/traffic-layer1?device=${encodeURIComponent(dev.ip)}`);
                        }}
                        className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1 hover:underline cursor-pointer font-medium"
                        title="View Live Wire Traffic for this system"
                      >
                        <span>Wire Traffic</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDevice !== 'ALL' && (
              <div className="mt-4 pt-3 border-t border-[#e2eaf4] flex items-center justify-between text-xs">
                <span className="text-[#0a1c3d] text-xs">
                  Showing stream filtered to system: <strong className="text-blue-700 font-mono">{selectedDevice}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDevice('ALL')}
                  className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Reset / Show All Systems
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Live Stream Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2eaf4] pb-3 pt-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-[#0a1c3d] font-sans">
            Live Stream Feed
          </h2>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs font-sans font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SNIFFING ACTIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={handleSimulateThreat}
              className="bg-white hover:bg-slate-50 text-[#0a1c3d] border border-slate-200 font-sans text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Simulate Threat</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-lg border border-slate-200 text-xs font-sans">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md font-sans text-xs transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-semibold' : 'text-[#687d9a] hover:text-[#0a1c3d] font-medium'
              }`}
            >
              Connection Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-md font-sans text-xs transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-semibold' : 'text-[#687d9a] hover:text-[#0a1c3d] font-medium'
              }`}
            >
              Verdict Cards
            </button>
            <button
              onClick={() => setViewMode('terminal')}
              className={`px-3 py-1 rounded-md font-sans text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === 'terminal' ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-semibold' : 'text-[#687d9a] hover:text-[#0a1c3d] font-medium'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5 text-blue-600" />
              Terminal
            </button>
          </div>
        </div>
      </div>

      {/* Disconnected WS Banner */}
      {connectionStatus !== 'connected' && (
        <Card className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-600" />
              <span>Telemetry disconnected ({connectionStatus}). Reconnecting to backend endpoint...</span>
            </div>
            <Button onClick={fetchStatus} variant="ghost" size="sm" className="h-6 text-xs text-amber-800 hover:bg-amber-100 font-semibold">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Card className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
            <Button onClick={fetchStatus} variant="ghost" size="sm" className="h-6 text-xs text-rose-800 hover:bg-rose-100 font-semibold">
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 6. Packet Data Content View */}
      {!isRunning && feed.length === 0 ? (
        <Card className="bg-white border border-[#e2eaf4] p-8 text-center rounded-xl shadow-xs">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a1c3d] font-sans">
              Packet Capture Engine Stopped
            </h3>
            <p className="text-xs text-[#687d9a] max-w-md mx-auto font-sans leading-relaxed">
              {isAdmin
                ? 'Click "Start Capture" above to initiate Scapy wire listening on active network interfaces.'
                : 'Packet capture engine is currently offline. Contact an Administrator to enable live sniffing.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <ConnectionTable
          entries={feed}
          devices={devices}
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDeviceIp}
          onFilterDevice={setSelectedDevice}
        />
      ) : viewMode === 'terminal' ? (
        <CyberTerminal
          title="NETRIQ Live Packet Sniffer Kernel Feed"
          lines={terminalLogs.length > 0 ? terminalLogs : ["[LiveSniffer] Listening on promiscuous interface..."]}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#687d9a] px-1 font-sans font-medium">
            <span>Evaluating stream ({displayFeed.length} flows in buffer)</span>
            <span>Max buffer: 50 entries</span>
          </div>
          {displayFeed.map((threat, idx) => (
            <VerdictCard
              key={threat.id || threat.prediction_id || idx}
              threat={threat}
              viewMode="smart"
              hasRawAccess={role === 'admin' || role === 'analyst'}
              onSelectDevice={setSelectedDeviceIp}
            />
          ))}
        </div>
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

export default Monitoring;
