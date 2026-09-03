import React, { useState, useEffect, useCallback } from 'react';
import { SnifferControlPanel } from '../components/SnifferControlPanel';
import { OperationalMetrics } from '../components/OperationalMetrics';
import { FlowRateChart } from '../components/FlowRateChart';
import { ConnectionTable } from '../components/ConnectionTable';
import { VerdictCard } from '../components/VerdictCard';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { monitoringService } from '../services/monitoring';
import { predictionService } from '../services/prediction';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RippleBackground } from '../components/ui/RippleBackground';
import { CyberTerminal } from '../components/ui/CyberTerminal';
import { Activity, Radio, RefreshCw, AlertTriangle, ShieldCheck, Zap, Terminal as TerminalIcon } from 'lucide-react';

export const Monitoring = () => {
  const { role, hasCapability } = useAuth();
  const isAdmin = role === 'admin' || hasCapability('MANAGE_SETTINGS');

  const [status, setStatus] = useState(null);
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards' | 'terminal'

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
        src_ip: data.flow_summary?.src_ip || '192.168.1.100',
        dst_ip: data.flow_summary?.dst_ip || '185.220.101.5',
        src_port: data.flow_summary?.src_port || 54321,
        dst_port: data.flow_summary?.dst_port || 443,
        protocol: 'TCP',
        sni: data.flow_summary?.sni || 'tor-exit.node',
        severity: data.risk_level?.toUpperCase() || (data.verdict ? 'HIGH' : 'LOW'),
        action: data.action?.toUpperCase() || (data.verdict ? 'RECOMMEND_BLOCK' : 'NOTIFY'),
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
    <div className="space-y-6">
      {/* 1. Sniffer Control Card Container with Magic UI Radar Ripple Background */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <RippleBackground mainCircleSize={180} numCircles={6} className="opacity-40" />
        <div className="relative z-10 p-6">
          <SnifferControlPanel
            status={status}
            onStatusChange={setStatus}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 2. Operational Metrics Cards */}
      <OperationalMetrics metrics={metrics} />

      {/* 3. Real-Time Flow Rate Telemetry Chart */}
      <FlowRateChart entries={feed} isRunning={isRunning} />

      {/* Header Bar for Live Stream */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold font-mono text-slate-100">
            Live Wire Telemetry Stream
          </h2>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              SNIFFING ACTIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              onClick={handleSimulateThreat}
              variant="outline"
              size="sm"
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 font-mono text-xs flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Simulate Threat Flow
            </Button>
          )}

          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded font-medium transition-all ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Connection Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded font-medium transition-all ${
                viewMode === 'cards' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Verdict Cards
            </button>
            <button
              onClick={() => setViewMode('terminal')}
              className={`px-3 py-1.5 rounded font-medium transition-all flex items-center gap-1 ${
                viewMode === 'terminal' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
              Terminal
            </button>
          </div>
        </div>
      </div>

      {/* Disconnected WS Reconnection Banner */}
      {connectionStatus !== 'connected' && (
        <Card className="bg-amber-950/40 border-amber-800 text-amber-200 backdrop-blur-md">
          <CardContent className="p-3.5 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>WebSocket stream ({connectionStatus}). Auto-reconnecting to backend telemetry endpoint...</span>
            </div>
            <Button onClick={fetchStatus} variant="ghost" size="sm" className="h-7 text-xs text-amber-300 hover:bg-amber-500/10">
              Retry Sync
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Card className="bg-rose-950/40 border-rose-800 text-rose-200">
          <CardContent className="p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
            <Button onClick={fetchStatus} variant="ghost" size="sm" className="h-7 text-xs text-rose-300 hover:bg-rose-500/10">
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 4. Live Stream Content View (Table vs Cards vs Terminal) */}
      {!isRunning && feed.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-800 p-8 text-center backdrop-blur-md">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-200">
              Packet Capture Engine Stopped
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {isAdmin
                ? 'Click "Start Capture" above to initiate Scapy wire listening on active network interfaces.'
                : 'Packet capture engine is currently offline. Contact an Administrator to enable live sniffing.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <ConnectionTable entries={feed} />
      ) : viewMode === 'terminal' ? (
        <CyberTerminal
          title="NETRIQ Live Packet Sniffer Kernel Feed"
          lines={terminalLogs.length > 0 ? terminalLogs : ["[LiveSniffer] Listening on promiscuous interface..."]}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <span>Evaluating stream ({feed.length} flows in buffer)</span>
            <span>Max buffer: 50 entries</span>
          </div>
          {feed.map((threat, idx) => (
            <VerdictCard
              key={threat.id || threat.prediction_id || idx}
              threat={threat}
              viewMode="smart"
              hasRawAccess={role === 'admin' || role === 'analyst'}
            />
          ))}
        </div>
      )}
    </div>
  );
};
