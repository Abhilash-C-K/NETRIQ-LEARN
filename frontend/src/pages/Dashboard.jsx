import React, { useState, useEffect } from 'react';
import { VerdictCard } from '../components/VerdictCard';
import { DeviceActivityDrawer } from '../components/DeviceActivityDrawer';
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
  FileText,
  Lock,
} from 'lucide-react';

export const Dashboard = () => {
  const { role, hasCapability } = useAuth();
  const { connectionStatus, subscribe } = useWebSocket();

  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('smart'); // 'smart' | 'raw'
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedDeviceIp, setSelectedDeviceIp] = useState(null);

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
        src_ip: '10.40.184.165',
        src_port: 58496,
        dst_ip: '159.41.181.98',
        dst_port: 27017,
        protocol: 'TCP',
        flow_duration_ms: 142.5,
        packet_count: 85,
        bytes_sent: 14200,
        bytes_received: 384000,
        payload_entropy: 7.82,
        model_used: 'DualLayerFusion',
        severity: 'HIGH',
        confidence: 0.96,
        is_anomaly: true,
        anomaly_score: 0.88,
        action: 'QUARANTINE',
        timestamp: new Date().toISOString(),
        top_shap_features: [
          { feature: 'payload_entropy', shap_value: 0.42, description: 'High entropy indicates encrypted payload' },
          { feature: 'bytes_received', shap_value: 0.35, description: 'Abnormal data exfiltration volume' },
          { feature: 'flow_duration_ms', shap_value: 0.18, description: 'Persistent connection duration' },
        ],
        plain_text_summary: 'Internal host isolated due to anomalous activity.',
      };

      setThreats((prev) => [mockPayload, ...prev.slice(0, 24)]);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setTimeout(() => setIsSimulating(false), 600);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner Header: #1E2021, 1px solid #303334, no glow */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1E2021] border border-[#303334] p-5 rounded-lg shadow-none">
        <div>
          <h1 className="text-lg font-semibold tracking-normal text-[#F1F0EA] flex items-center gap-2 font-sans">
            <Shield className="w-5 h-5 text-[#9AAA78]" />
            Smart Summary
          </h1>
          <p className="text-xs text-[#A4A5A0] mt-0.5 font-sans">
            Real-time telemetry and explainable threat verdicts translated into plain language
          </p>
        </div>

        {/* Action Controls & View Mode Toggle */}
        <div className="flex items-center gap-2.5">
          {hasAdminAccess ? (
            <button
              onClick={handleSimulateFlow}
              disabled={isSimulating}
              className="bg-[#9AAA78] hover:bg-[#A9B989] text-[#141516] font-sans text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSimulating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Simulate Flow</span>
            </button>
          ) : (
            <Button
              disabled
              variant="outline"
              size="sm"
              title="Simulate Flow requires Admin capability (MANAGE_SETTINGS)"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5 text-[#C95F5F]" />
              <span>Simulate (Admin)</span>
            </Button>
          )}

          <Button
            onClick={loadRecentThreats}
            title="Refresh threat feed"
            variant="outline"
            size="icon"
            className="w-8 h-8 border-[#303334] bg-[#141516] text-[#A4A5A0] hover:text-[#F1F0EA]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* View Mode Segmented Control */}
          <div className="bg-[#141516] p-1 rounded-lg border border-[#303334] flex items-center gap-1">
            <button
              onClick={() => setViewMode('smart')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer ${
                viewMode === 'smart'
                  ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334]'
                  : 'text-[#A4A5A0] hover:text-[#F1F0EA]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#9AAA78]" />
              <span>Smart Summary</span>
            </button>

            <button
              onClick={() => hasRawAccess && setViewMode('raw')}
              disabled={!hasRawAccess}
              title={!hasRawAccess ? 'Raw technical log view requires Analyst capability' : ''}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334]'
                  : 'text-[#A4A5A0] hover:text-[#F1F0EA] disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {!hasRawAccess ? <Lock className="w-3 h-3 text-[#C95F5F]" /> : <Terminal className="w-3.5 h-3.5 text-[#8CA4B8]" />}
              <span>Raw Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {viewMode === 'smart' ? (
          loading ? (
            <div className="p-12 text-center text-[#A4A5A0] space-y-3">
              <div className="w-7 h-7 border-2 border-[#303334] border-t-[#9AAA78] rounded-full animate-spin mx-auto" />
              <p className="text-xs font-sans">Loading threat telemetry...</p>
            </div>
          ) : threats.length === 0 ? (
            <div className="p-12 text-center bg-[#1E2021] border border-[#303334] rounded-lg text-[#A4A5A0] text-xs font-sans">
              No recent network threat verdicts recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {threats.map((t, idx) => (
                <VerdictCard
                  key={t.id || idx}
                  threat={t}
                  viewMode="smart"
                  hasRawAccess={hasRawAccess}
                  onSelectDevice={setSelectedDeviceIp}
                />
              ))}
            </div>
          )
        ) : (
          <CyberTerminal logs={threats} isLive={connectionStatus === 'connected'} />
        )}
      </div>

      {/* Device Activity Trail Drawer */}
      <DeviceActivityDrawer
        isOpen={!!selectedDeviceIp}
        onClose={() => setSelectedDeviceIp(null)}
        srcIp={selectedDeviceIp}
      />
    </div>
  );
};
export default Dashboard;
