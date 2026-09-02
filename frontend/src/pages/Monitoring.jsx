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
import { Activity, Radio, RefreshCw, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export const Monitoring = () => {
  const { role, hasCapability } = useAuth();
  const isAdmin = role === 'admin' || hasCapability('MANAGE_SETTINGS');

  const [status, setStatus] = useState(null);
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

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
  const { isConnected, lastMessage } = useWebSocket('/ws');

  useEffect(() => {
    if (!lastMessage) return;

    // 1. Live Verdict Event
    if (lastMessage.type === 'live_verdict' || lastMessage.event_type === 'live_verdict') {
      const payload = lastMessage.payload || lastMessage;
      setFeed((prev) => [payload, ...prev.slice(0, 49)]);
    }

    // 2. Monitor Status Event
    if (lastMessage.type === 'monitor_status' || lastMessage.event_type === 'monitor_status') {
      const payload = lastMessage.payload || lastMessage;
      setStatus((prev) => ({
        ...prev,
        is_running: payload.status === 'started' || payload.is_running === True || payload.is_running === true,
        ...(payload.operational_metrics ? { operational_metrics: payload.operational_metrics } : {}),
      }));
    }
  }, [lastMessage]);

  // Start Sniffer Handler
  const handleStart = async () => {
    setIsLoading(true);
    try {
      const updatedStatus = await monitoringService.startMonitoring();
      setStatus(updatedStatus);
    } catch (err) {
      console.error('Failed to start monitoring:', err);
      setError(err.response?.data?.detail || 'Failed to start sniffer capture.');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop Sniffer Handler
  const handleStop = async () => {
    setIsLoading(true);
    try {
      const updatedStatus = await monitoringService.stopMonitoring();
      setStatus(updatedStatus);
    } catch (err) {
      console.error('Failed to stop monitoring:', err);
      setError(err.response?.data?.detail || 'Failed to stop sniffer capture.');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate Synthetic Threat Flow (Admin test helper)
  const handleSimulate = async () => {
    try {
      const result = await predictionService.testPrediction();
      setFeed((prev) => [result, ...prev.slice(0, 49)]);
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  };

  const isRunning = status?.is_running ?? false;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Live Packet Capture & Telemetry Stream
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time Scapy capture, Case A/B taxonomy, queue-drop counters, and connection table
          </p>
        </div>

        {/* Quick Actions & View Toggles */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              onClick={handleSimulate}
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
          </div>
        </div>
      </div>

      {/* Disconnected WS Reconnection Banner */}
      {!isConnected && (
        <Card className="bg-amber-950/40 border-amber-800 text-amber-200 backdrop-blur-md">
          <CardContent className="p-3.5 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>WebSocket stream disconnected. Auto-reconnecting to backend telemetry endpoint...</span>
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
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">Dismiss</button>
          </CardContent>
        </Card>
      )}

      {/* 1. Sniffer Control Panel */}
      <SnifferControlPanel
        status={status}
        onStart={handleStart}
        onStop={handleStop}
        isLoading={isLoading}
      />

      {/* 2. Operational Telemetry Metrics Cards */}
      <OperationalMetrics metrics={status?.operational_metrics} />

      {/* 3. Flow Throughput Sliding-Window Chart */}
      <FlowRateChart entries={feed} />

      {/* 4. Live Stream Content View (Table vs Cards) */}
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
