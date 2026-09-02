import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { predictionService } from '../services/prediction';
import { VerdictCard } from '../components/VerdictCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Shield,
  Sparkles,
  Terminal,
  Play,
  RefreshCw,
  Lock,
  Activity,
  CheckCircle2,
} from 'lucide-react';

const MAX_FEED_ENTRIES = 50;

export const Dashboard = () => {
  const { hasCapability } = useAuth();
  const { subscribe, connectionStatus } = useWebSocket();

  const [viewMode, setViewMode] = useState('smart'); // 'smart' | 'raw'
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState('');

  const hasRawAccess = hasCapability('VIEW_RAW_LOGS');
  const hasAdminAccess = hasCapability('MANAGE_SETTINGS');

  // Initial REST fetch of recent threats
  const loadRecentThreats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await predictionService.getRecentThreats(20);
      const items = Array.isArray(data) ? data : data.items || data.threats || [];
      setThreats(items.slice(0, MAX_FEED_ENTRIES));
    } catch (err) {
      console.warn('REST fetch error, using empty feed:', err);
      setError('Could not connect to threat telemetry history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentThreats();
  }, [loadRecentThreats]);

  // WebSocket Subscription for Real-Time Live Verdicts
  useEffect(() => {
    const handleNewVerdict = (payload) => {
      if (!payload) return;

      const newThreat = {
        id: payload.id || payload.prediction_id || `ws-${Date.now()}-${Math.random()}`,
        prediction_id: payload.prediction_id || payload.id,
        src_ip: payload.src_ip || '192.168.1.100',
        dst_ip: payload.dst_ip || '185.220.101.5',
        src_port: payload.src_port || 54321,
        dst_port: payload.dst_port || 443,
        protocol: payload.protocol || 'TCP',
        sni: payload.sni || null,
        severity: payload.severity || payload.risk_level || (payload.is_anomaly ? 'HIGH' : 'LOW'),
        action: payload.action || (payload.is_anomaly ? 'RECOMMEND_BLOCK' : 'NOTIFY'),
        verdict: payload.verdict || payload.is_anomaly || false,
        confidence: payload.confidence ?? 0.95,
        timestamp: payload.timestamp || new Date().toISOString(),
        reason: payload.reason || payload.decision_msg,
      };

      setThreats((prev) => {
        // Deduplicate by ID
        const exists = prev.some(
          (t) => (t.id && t.id === newThreat.id) || (t.prediction_id && t.prediction_id === newThreat.prediction_id)
        );
        if (exists) return prev;

        // Bounded list: prepend new threat and slice to max entries
        return [newThreat, ...prev].slice(0, MAX_FEED_ENTRIES);
      });
    };

    const unsubscribeVerdict = subscribe('live_verdict', handleNewVerdict);
    const unsubscribeAlert = subscribe('threat_alert', handleNewVerdict);
    const unsubscribeWildcard = subscribe('*', (data) => {
      if (data?.event_type === 'LIVE_VERDICT' || data?.type === 'live_verdict') {
        handleNewVerdict(data.payload || data);
      }
    });

    return () => {
      unsubscribeVerdict();
      unsubscribeAlert();
      unsubscribeWildcard();
    };
  }, [subscribe]);

  // Handle Simulation Trigger (Requires Admin MANAGE_SETTINGS capability)
  const handleSimulateFlow = async () => {
    if (!hasAdminAccess) return;
    setIsSimulating(true);
    try {
      const { data, predictionId } = await predictionService.runTestPrediction();

      const newThreat = {
        id: predictionId || `sim-${Date.now()}`,
        prediction_id: predictionId,
        src_ip: data.flow_summary?.src_ip || '192.168.1.105',
        dst_ip: data.flow_summary?.dst_ip || '198.51.100.89',
        src_port: data.flow_summary?.src_port || 49152,
        dst_port: data.flow_summary?.dst_port || 443,
        protocol: 'TCP',
        sni: data.flow_summary?.sni || 'youtube.com',
        severity: data.risk_level?.toUpperCase() || (data.verdict ? 'HIGH' : 'LOW'),
        action: data.action?.toUpperCase() || (data.verdict ? 'RECOMMEND_BLOCK' : 'NOTIFY'),
        verdict: data.verdict,
        confidence: data.confidence || 0.94,
        timestamp: new Date().toISOString(),
        reason: data.reason || 'Simulated synthetic traffic flow evaluation.',
      };

      setThreats((prev) => [newThreat, ...prev].slice(0, MAX_FEED_ENTRIES));
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar / View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Smart Summary Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time AI threat telemetry translated into plain-language explanations
          </p>
        </div>

        {/* Action Controls & View Mode Toggle */}
        <div className="flex items-center gap-3">
          {/* RBAC Guarded Simulation Button */}
          {hasAdminAccess ? (
            <Button
              onClick={handleSimulateFlow}
              disabled={isSimulating}
              variant="default"
              size="sm"
            >
              {isSimulating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-cyan-400 mr-1.5" />
              )}
              <span>Simulate Flow</span>
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              size="sm"
              title="Simulate Flow requires Admin capability (MANAGE_SETTINGS)"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
              <span>Simulate (Admin)</span>
            </Button>
          )}

          <Button
            onClick={loadRecentThreats}
            title="Refresh threat feed"
            variant="outline"
            size="icon"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* View Mode Segmented Control */}
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('smart')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-all ${
                viewMode === 'smart'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Smart Summary</span>
            </button>

            <button
              onClick={() => hasRawAccess && setViewMode('raw')}
              disabled={!hasRawAccess}
              title={!hasRawAccess ? 'Raw technical log view requires Analyst capability' : ''}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-all ${
                viewMode === 'raw'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {!hasRawAccess ? <Lock className="w-3 h-3 text-rose-400" /> : <Terminal className="w-3.5 h-3.5" />}
              <span>Raw Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feed Status Summary Card */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Feed Entries ({threats.length})</span>
          </span>
          <span>•</span>
          <span className="text-slate-400">
            WS Status:{' '}
            <strong
              className={connectionStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}
            >
              {connectionStatus.toUpperCase()}
            </strong>
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Showing latest {threats.length} evaluated flows
        </span>
      </div>

      {/* Primary Threat Feed List */}
      {loading && threats.length === 0 ? (
        <div className="py-12">
          <LoadingSpinner size="medium" label="Loading telemetry threat feed..." />
        </div>
      ) : threats.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-dashed">
          <CardContent className="space-y-3 p-0">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-semibold font-mono text-slate-200">
              No Recent Threat Telemetry
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              NIDS engine is actively monitoring network interfaces. Click "Simulate Flow" above to trigger a synthetic threat evaluation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {threats.map((threat) => (
            <VerdictCard
              key={threat.id || threat.prediction_id || Math.random()}
              threat={threat}
              viewMode={viewMode}
              hasRawAccess={hasRawAccess}
            />
          ))}
        </div>
      )}
    </div>
  );
};
