import React, { useState, useEffect, useCallback } from 'react';
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
import { Activity, Radio, AlertTriangle, Zap, Terminal as TerminalIcon } from 'lucide-react';

export const Monitoring = () => {
  const { role, hasCapability } = useAuth();
  const isAdmin = role === 'admin' || hasCapability('MANAGE_SETTINGS');

  const [status, setStatus] = useState(null);
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards' | 'terminal'
  const [selectedDeviceIp, setSelectedDeviceIp] = useState(null);

  // Fetch initial sniffer status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await monitoringService.getStatus();
      setStatus(data);
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
    const unsub3 = subscribe('sniffer_status', handleStatus);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [subscribe]);

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
        confidence: data.confidence || 0.96,
        timestamp: new Date().toISOString(),
        reason: data.reason,
      };
      setFeed((prev) => [payload, ...prev].slice(0, 50));
    } catch (err) {
      console.error('Simulation error:', err);
    }
  };

  const isRunning = status?.is_running ?? false;
  const metrics = status?.metrics || {};

  const terminalLogs = feed.map(
    (item) =>
      `[${new Date(item.timestamp || Date.now()).toLocaleTimeString()}] FLOW: ${item.src_ip}:${item.src_port || 0} -> ${item.dst_ip}:${item.dst_port || 0} | ACTION: ${item.action || 'PASS'} | VERDICT: ${item.verdict ? 'MALICIOUS' : 'BENIGN'}`
  );

  return (
    <div className="space-y-5">
      {/* 1. Sniffer Control & Statistics (Hierarchy: Capture status -> Statistics) */}
      <SnifferControlPanel
        status={status}
        onStatusChange={setStatus}
        isLoading={isLoading}
      />

      {/* 2. Operational Metrics Cards */}
      <OperationalMetrics metrics={metrics} />

      {/* 3. Real-Time Flow Throughput Chart */}
      <FlowRateChart entries={feed} isRunning={isRunning} />

      {/* 4. Live Stream Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2A3944] pb-3 pt-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#71A99D]" />
          <h2 className="text-sm font-semibold text-[#E7ECEF] font-sans">
            Live Stream Feed
          </h2>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs font-sans text-[#71A99D] bg-[#71A99D]/15 px-2 py-0.5 rounded border border-[#71A99D]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#71A99D]" />
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

      {/* 5. Packet Data Content View */}
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
        <ConnectionTable entries={feed} onSelectDevice={setSelectedDeviceIp} />
      ) : viewMode === 'terminal' ? (
        <CyberTerminal
          title="NETRIQ Live Packet Sniffer Kernel Feed"
          lines={terminalLogs.length > 0 ? terminalLogs : ["[LiveSniffer] Listening on promiscuous interface..."]}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#9AA8B2] px-1 font-sans">
            <span>Evaluating stream ({feed.length} flows in buffer)</span>
            <span>Max buffer: 50 entries</span>
          </div>
          {feed.map((threat, idx) => (
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
