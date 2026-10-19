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

  // Fetch initial sniffer status & recent captured flows
  const fetchStatus = useCallback(async () => {
    try {
      const [statusData, threatsData] = await Promise.allSettled([
        monitoringService.getStatus(),
        predictionService.getRecentThreats(50),
      ]);
      if (statusData.status === 'fulfilled') setStatus(statusData.value);
      if (threatsData.status === 'fulfilled' && Array.isArray(threatsData.value) && threatsData.value.length > 0) {
        setFeed(threatsData.value.slice(0, 50));
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
    const handleVerdict = (payload) => {
      if (!payload) return;
      setFeed((prev) => [payload, ...prev].slice(0, 50));
    };

    const handleStatus = (payload) => {
      if (!payload) return;
      setStatus((prev) => ({ ...prev, ...payload }));
    };

    const unsub1 = subscribe('live_verdict', handleVerdict);
    const unsub2 = subscribe('threat_alert', handleVerdict);
    const unsub3 = subscribe('monitor_status', handleStatus);
    const unsub4 = subscribe('sniffer_status', handleStatus);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
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
    <div className="space-y-5">
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
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#7895B2]" />
                <h3 className="text-sm font-semibold text-[#E7ECEF] font-sans">
                  Connected Systems on Local Network
                </h3>
                <span className="text-xs text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30 font-medium">
                  {devices.length} {devices.length === 1 ? 'System' : 'Systems'} Online
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/network-layer2"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium hover:underline"
                >
                  <span>Layer 2 Topology Canvas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <p className="text-xs text-[#9AA8B2] mb-3">
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
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-950/50 border-blue-500 shadow-sm shadow-blue-900/30 ring-1 ring-blue-500'
                        : 'bg-[#131D25] hover:bg-[#1a2632] border-[#2A3944]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                              dev.is_host
                                ? 'bg-blue-600 text-white'
                                : dev.is_gateway
                                ? 'bg-emerald-600 text-white'
                                : 'bg-purple-600 text-white'
                            }`}
                          >
                            {dev.is_host ? <Laptop className="w-4 h-4" /> : <Router className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#E7ECEF] truncate">
                              {dev.hostname || dev.label}
                            </h4>
                            <span className="text-[10px] text-[#9AA8B2] font-mono">
                              {dev.is_host ? 'Host PC Sensor' : dev.is_gateway ? 'Wi-Fi Default Gateway' : 'Network Endpoint'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-400'
                              : 'bg-[#202D36] text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isSelected ? 'FILTERED' : 'ONLINE'}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] font-mono text-[#9AA8B2] bg-[#101820] p-2 rounded border border-[#2A3944]/60">
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">IP:</span>
                          <span className="text-[#E7ECEF] font-semibold">{dev.ip}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">MAC:</span>
                          <span className="text-[#94a3b8] truncate max-w-[130px]">{dev.mac || 'Active Interface'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Packets in Buffer:</span>
                          <span className="text-blue-400 font-bold">{count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#2A3944]/40 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-blue-400 font-medium">
                        {isSelected ? '✓ Filtering stream' : 'Click to group/filter'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/traffic-layer1?device=${encodeURIComponent(dev.ip)}`);
                        }}
                        className="text-[10px] text-[#9AA8B2] hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
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
              <div className="mt-3 pt-2.5 border-t border-[#2A3944]/50 flex items-center justify-between text-xs">
                <span className="text-[#E7ECEF] text-xs">
                  Showing stream filtered to system: <strong className="text-blue-400 font-mono">{selectedDevice}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDevice('ALL')}
                  className="text-xs text-[#cc5500] hover:underline font-semibold cursor-pointer"
                >
                  Reset / Show All Systems
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Live Stream Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2A3944] pb-3 pt-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#cc5500]" />
          <h2 className="text-sm font-semibold text-[#E7ECEF] font-sans">
            Live Stream Feed
          </h2>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs font-sans text-[#cc5500] bg-[#cc5500]/15 px-2 py-0.5 rounded border border-[#cc5500]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#cc5500]" />
              SNIFFING ACTIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={handleSimulateThreat}
              className="bg-[#19242E] hover:bg-[#202D36] text-[#E7ECEF] border border-[#2A3944] font-sans text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#D3A35D]" />
              <span>Simulate Threat</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-[#101820] p-1 rounded-lg border border-[#2A3944] text-xs font-sans">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-[#202D36] text-[#E7ECEF] border border-[#2A3944]' : 'text-[#9AA8B2] hover:text-[#E7ECEF]'
              }`}
            >
              Connection Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#202D36] text-[#E7ECEF] border border-[#2A3944]' : 'text-[#9AA8B2] hover:text-[#E7ECEF]'
              }`}
            >
              Verdict Cards
            </button>
            <button
              onClick={() => setViewMode('terminal')}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === 'terminal' ? 'bg-[#202D36] text-[#E7ECEF] border border-[#2A3944]' : 'text-[#9AA8B2] hover:text-[#E7ECEF]'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5 text-[#7895B2]" />
              Terminal
            </button>
          </div>
        </div>
      </div>

      {/* Disconnected WS Banner */}
      {connectionStatus !== 'connected' && (
        <Card className="bg-[#19242E] border border-[#D3A35D]/40 text-[#D3A35D] rounded-lg">
          <CardContent className="p-3 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#D3A35D]" />
              <span>Telemetry disconnected ({connectionStatus}). Reconnecting to backend endpoint...</span>
            </div>
            <Button onClick={fetchStatus} variant="ghost" size="sm" className="h-6 text-xs text-[#D3A35D] hover:bg-[#D3A35D]/10">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Card className="bg-[#19242E] border border-[#DF857C]/40 text-[#DF857C] rounded-lg">
          <CardContent className="p-3 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#DF857C]" />
              <span>{error}</span>
            </div>
            <Button onClick={fetchStatus} variant="ghost" size="sm" className="h-6 text-xs text-[#DF857C] hover:bg-[#DF857C]/10">
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 6. Packet Data Content View */}
      {!isRunning && feed.length === 0 ? (
        <Card className="bg-[#19242E] border border-[#2A3944] p-8 text-center rounded-lg">
          <CardContent className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#101820] border border-[#2A3944] flex items-center justify-center mx-auto text-[#9AA8B2]">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#E7ECEF] font-sans">
              Packet Capture Engine Stopped
            </h3>
            <p className="text-xs text-[#9AA8B2] max-w-md mx-auto font-sans">
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
          <div className="flex items-center justify-between text-xs text-[#9AA8B2] px-1 font-sans">
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
