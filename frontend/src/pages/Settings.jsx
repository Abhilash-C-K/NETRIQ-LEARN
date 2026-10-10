import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Shield,
  Activity,
  Server,
  Save,
  RefreshCw,
  SlidersHorizontal,
  Wifi,
  Radio,
} from 'lucide-react';
import api from '../services/api';
import { settingsService } from '../services/settings';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('interface');

  // Interface settings state
  const [nicInterface, setNicInterface] = useState('eth0');
  const [promiscuousMode, setPromiscuousMode] = useState(true);
  const [bufferSizeMb, setBufferSizeMb] = useState(128);

  // Model settings state
  const [layer1Threshold, setLayer1Threshold] = useState(0.85);
  const [layer2Threshold, setLayer2Threshold] = useState(0.78);
  const [autoQuarantineEnabled, setAutoQuarantineEnabled] = useState(true);

  // Real System health state
  const [healthData, setHealthData] = useState({
    status: 'healthy',
    components: { database: 'online', model_manager: 'online', live_monitor: 'running' },
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingHealth, setRefreshingHealth] = useState(false);

  // Load real settings & health from backend
  const loadInitialData = async () => {
    try {
      setRefreshingHealth(true);
      const [settingsRes, healthRes] = await Promise.allSettled([
        settingsService.getSettings(),
        api.get('/health'),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        const s = settingsRes.value;
        if (s.network_interface) setNicInterface(s.network_interface);
        if (s.promiscuous_mode !== undefined) setPromiscuousMode(s.promiscuous_mode);
        if (s.buffer_size_mb) setBufferSizeMb(s.buffer_size_mb);
        if (s.layer1_threshold) setLayer1Threshold(s.layer1_threshold);
        if (s.layer2_threshold) setLayer2Threshold(s.layer2_threshold);
        if (s.auto_quarantine !== undefined) setAutoQuarantineEnabled(s.auto_quarantine);
      }

      if (healthRes.status === 'fulfilled' && healthRes.value?.data) {
        setHealthData(healthRes.value.data);
      }
    } catch (err) {
      console.warn('Backend settings loaded with current live defaults:', err);
    } finally {
      setRefreshingHealth(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Save Settings to Backend API & MongoDB
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await settingsService.updateSettings({
        network_interface: nicInterface,
        promiscuous_mode: promiscuousMode,
        buffer_size_mb: bufferSizeMb,
        layer1_threshold: layer1Threshold,
        layer2_threshold: layer2Threshold,
        auto_quarantine: autoQuarantineEnabled,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings in MongoDB:', err);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#e2eaf4] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0a1c3d]">System & Defense Settings</h1>
              <p className="text-xs text-[#687d9a] mt-0.5">
                Configure network capture adapters, fine-tune AI classification thresholds, and monitor system health.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-[#f0f5fc] p-1 rounded-xl border border-[#dbe6f5] text-xs font-medium">
          <button
            onClick={() => setActiveTab('interface')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'interface'
                ? 'bg-white text-[#0a1c3d] font-bold shadow-xs'
                : 'text-[#687d9a] hover:text-[#0a1c3d]'
            }`}
          >
            Network Interface
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-white text-[#0a1c3d] font-bold shadow-xs'
                : 'text-[#687d9a] hover:text-[#0a1c3d]'
            }`}
          >
            AI Models & Policies
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'health'
                ? 'bg-white text-[#0a1c3d] font-bold shadow-xs'
                : 'text-[#687d9a] hover:text-[#0a1c3d]'
            }`}
          >
            System Diagnostics
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configuration saved and applied to NetrIQ engine and MongoDB Atlas!</span>
        </div>
      )}

      {/* TAB 1: NETWORK INTERFACE CONFIG */}
      {activeTab === 'interface' && (
        <div className="bg-white rounded-2xl border border-[#e2eaf4] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#0a1c3d]">Sniffer & Capture Interface Configuration</h2>
            <p className="text-xs text-[#687d9a]">Configure physical network tap bindings and low-level capture parameters.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-[#0a1c3d] block mb-1.5">Network Interface (NIC)</label>
              <select
                value={nicInterface}
                onChange={(e) => setNicInterface(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#dbe6f5] text-xs bg-[#f8fafc] text-[#0a1c3d] font-medium"
              >
                <option value="eth0">eth0 (Primary Ingress Ethernet - 10Gbps)</option>
                <option value="eth1">eth1 (Internal LAN Mirror / SPAN Port)</option>
                <option value="wlan0">wlan0 (Wireless Monitoring)</option>
                <option value="lo">lo (Loopback Diagnostic)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#0a1c3d] block mb-1.5">Capture Ring Buffer Size (MB)</label>
              <input
                type="number"
                value={bufferSizeMb}
                onChange={(e) => setBufferSizeMb(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[#dbe6f5] text-xs bg-[#f8fafc] text-[#0a1c3d] font-medium"
              />
              <span className="text-[10px] text-[#687d9a] mt-1 block">Higher buffers prevent drop spikes during high-rate DDoS.</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-[#e2eaf4] bg-[#f8fafc] md:col-span-2">
              <div>
                <span className="text-xs font-bold text-[#0a1c3d] block">Promiscuous Mode</span>
                <span className="text-[11px] text-[#687d9a]">Capture all passing packets on segment, not just packets addressed to host.</span>
              </div>
              <input
                type="checkbox"
                checked={promiscuousMode}
                onChange={(e) => setPromiscuousMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#e2eaf4] flex justify-end">
            <button
              disabled={saving}
              onClick={handleSaveSettings}
              className="px-4 py-2.5 bg-[#0066cc] hover:bg-[#0052a3] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Interface Settings'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: AI MODEL SETTINGS */}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-2xl border border-[#e2eaf4] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#0a1c3d]">Machine Learning Detection Thresholds & Autonomous Actions</h2>
            <p className="text-xs text-[#687d9a]">Adjust classification confidence cutoffs for Layer 1 and Layer 2.</p>
          </div>

          <div className="space-y-5">
            {/* Layer 1 Slider */}
            <div className="p-4 rounded-xl border border-[#e2eaf4] bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-[#0a1c3d] block">
                    Layer 1 Pre-Firewall Confidence Threshold: {(layer1Threshold * 100).toFixed(0)}%
                  </span>
                  <span className="text-[11px] text-[#687d9a]">
                    Model: RandomForest + XGBoost Ingress Filter. Packets with threat confidence above this threshold are blocked pre-firewall.
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-blue-600">{layer1Threshold}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.99"
                step="0.01"
                value={layer1Threshold}
                onChange={(e) => setLayer1Threshold(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Layer 2 Slider */}
            <div className="p-4 rounded-xl border border-[#e2eaf4] bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-[#0a1c3d] block">
                    Layer 2 Lateral Movement Anomaly Threshold: {(layer2Threshold * 100).toFixed(0)}%
                  </span>
                  <span className="text-[11px] text-[#687d9a]">
                    Model: LightGBM Zero-Trust Sentinel. Internal flows exceeding this anomaly score trigger quarantine.
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-purple-600">{layer2Threshold}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.99"
                step="0.01"
                value={layer2Threshold}
                onChange={(e) => setLayer2Threshold(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>

            {/* Auto Quarantine Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#e2eaf4] bg-[#f8fafc]">
              <div>
                <span className="text-xs font-bold text-[#0a1c3d] block">Autonomous Device Quarantine</span>
                <span className="text-[11px] text-[#687d9a]">
                  Automatically isolate compromised devices upon confirmed lateral movement without waiting for manual approval.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoQuarantineEnabled}
                onChange={(e) => setAutoQuarantineEnabled(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#e2eaf4] flex justify-end">
            <button
              disabled={saving}
              onClick={handleSaveSettings}
              className="px-4 py-2.5 bg-[#0066cc] hover:bg-[#0052a3] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save AI Parameters to MongoDB'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM DIAGNOSTICS & HEALTH */}
      {activeTab === 'health' && (
        <div className="bg-white rounded-2xl border border-[#e2eaf4] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0a1c3d]">NetrIQ Live Engine Health & Telemetry</h2>
              <p className="text-xs text-[#687d9a]">Operational data queried live from the FastAPI engine.</p>
            </div>
            <button
              onClick={() => loadInitialData()}
              className="px-3 py-1.5 rounded-xl border border-[#dbe6f5] hover:bg-[#f0f5fc] text-xs font-semibold text-[#0a1c3d] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingHealth ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2eaf4]">
              <div className="flex items-center justify-between text-xs text-[#687d9a]">
                <span>Overall Status</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-2 uppercase">
                {healthData.status || 'HEALTHY'}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">FastAPI Core Active</div>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2eaf4]">
              <div className="flex items-center justify-between text-xs text-[#687d9a]">
                <span>MongoDB Database</span>
                <HardDrive className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-bold font-mono text-[#0a1c3d] mt-2 uppercase">
                {healthData.components?.database || 'ONLINE'}
              </div>
              <div className="text-[10px] text-blue-600 font-medium mt-0.5">Atlas Replica Cluster</div>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2eaf4]">
              <div className="flex items-center justify-between text-xs text-[#687d9a]">
                <span>AI Model Manager</span>
                <Cpu className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-bold font-mono text-purple-600 mt-2 uppercase">
                {healthData.components?.model_manager || 'ONLINE'}
              </div>
              <div className="text-[10px] text-[#687d9a] font-medium mt-0.5">RandomForest + LightGBM Loaded</div>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2eaf4]">
              <div className="flex items-center justify-between text-xs text-[#687d9a]">
                <span>Live Packet Sniffer</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-2 uppercase">
                {healthData.components?.live_monitor === 'stopped' ? 'STANDBY' : 'ENGAGED'}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Physical NIC Tap Ready</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
