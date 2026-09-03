import React, { useState, useEffect } from 'react';
import { VerdictCard } from '../components/VerdictCard';
import { CyberTerminal } from '../components/ui/CyberTerminal';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { predictionService } from '../services/prediction';
import {
  Shield,
  Play,
  RefreshCw,
  Terminal,
  Sparkles,
  Lock,
} from 'lucide-react';

export const Dashboard = () => {
  const { role, hasCapability } = useAuth();
  const { connectionStatus, subscribe } = useWebSocket();

  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('smart'); // 'smart' | 'raw'
  const [isSimulating, setIsSimulating] = useState(false);

  const hasRawAccess = hasCapability('VIEW_RAW_LOGS') || role === 'analyst' || role === 'admin';
  const hasAdminAccess = hasCapability('MANAGE_SETTINGS') || role === 'admin';

  const loadRecentThreats = async () => {
    try {
      setLoading(true);
      const data = await predictionService.getRecentThreats(25);
      setThreats(data || []);
    } catch (err) {
      console.error('Failed to load recent threats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentThreats();
  }, []);

  useEffect(() => {
    const handleNewVerdict = (payload) => {
      setThreats((prev) => [payload, ...prev.slice(0, 24)]);
    };

    const handleThreatAlert = (payload) => {
      setThreats((prev) => [payload, ...prev.slice(0, 24)]);
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
        src_ip: '192.168.1.105',
        src_port: 54321,
        dst_ip: '198.51.100.42',
        dst_port: 443,
        sni: 'malicious-c2-beacon.darknet.local',
        protocol: 'TCP',
        flow_duration_ms: 142.5,
        packet_count: 85,
        bytes_sent: 14200,
        bytes_received: 384000,
        payload_entropy: 7.82,
        model_used: 'DualLayerFusion',
        risk_category: 'CRITICAL',
        confidence_score: 99.4,
        is_anomaly: true,
        anomaly_score: 0.88,
        action: 'QUARANTINE',
        timestamp: new Date().toISOString(),
        top_shap_features: [
          { feature: 'payload_entropy', shap_value: 0.42, description: 'High entropy indicates encrypted payload' },
          { feature: 'bytes_received', shap_value: 0.35, description: 'Abnormal data exfiltration volume' },
          { feature: 'flow_duration_ms', shap_value: 0.18, description: 'Persistent connection duration' },
        ],
        plain_text_summary: 'CRITICAL: Encrypted C2 Beacon exfiltrating 384KB to darknet domain with 99.4% AI confidence.',
      };

      setThreats((prev) => [mockPayload, ...prev.slice(0, 24)]);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setTimeout(() => setIsSimulating(false), 600);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Smart Summary Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time AI threat telemetry translated into plain-language explanations
          </p>
        </div>

        {/* Action Controls & View Mode Toggle */}
        <div className="flex items-center gap-3">
          {hasAdminAccess ? (
            <Button
              onClick={handleSimulateFlow}
              disabled={isSimulating}
              variant="default"
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-md border border-cyan-400/40 flex items-center"
            >
              {isSimulating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5 text-white" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white text-white mr-1.5" />
              )}
              <span className="text-white font-bold">Simulate Flow</span>
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
          <div className="bg-slate-950/80 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
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

      {/* Main Content Area */}
      <div>
        {viewMode === 'smart' ? (
          loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono">Loading threat feed telemetry...</p>
            </div>
          ) : threats.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-xs font-mono">
              No recent network threat verdicts recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {threats.map((t, idx) => (
                <VerdictCard key={t.id || idx} threat={t} viewMode="smart" hasRawAccess={hasRawAccess} />
              ))}
            </div>
          )
        ) : (
          <CyberTerminal logs={threats} isLive={connectionStatus === 'connected'} />
        )}
      </div>
    </div>
  );
};
export default Dashboard;
