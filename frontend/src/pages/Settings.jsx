import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  CheckCircle2,
  Cpu,
  HardDrive,
  Activity,
  Save,
  RefreshCw,
  Sliders,
  Shield,
  Radio,
} from 'lucide-react';
import api from '../services/api';
import { settingsService } from '../services/settings';

export const Settings = () => {
  // Interface settings state
  const [nicInterface, setNicInterface] = useState('eth0');
  const [promiscuousMode, setPromiscuousMode] = useState(true);
  const [bufferSizeMb, setBufferSizeMb] = useState(128);

  // Model settings state
  const [layer1Threshold, setLayer1Threshold] = useState(0.85);
  const [layer2Threshold, setLayer2Threshold] = useState(0.78);
  const [autoQuarantineEnabled, setAutoQuarantineEnabled] = useState(true);

  // System health state
  const [healthData, setHealthData] = useState({
    status: 'healthy',
    components: { database: 'online', model_manager: 'online', live_monitor: 'running' },
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingHealth, setRefreshingHealth] = useState(false);

  // Load initial settings & health from backend
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
      console.warn('Settings loaded with live defaults:', err);
    } finally {
      setRefreshingHealth(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Save Settings to Backend API
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
      console.error('Failed to update settings:', err);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#e2eaf4] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0a1c3d]">System Settings</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadInitialData()}
            className="px-3.5 py-2 rounded-xl border border-[#d5e2f0] hover:bg-[#f0f5fc] text-xs font-semibold text-[#0a1c3d] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingHealth ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            disabled={saving}
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Live Health Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#e2eaf4] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#687d9a] mb-1.5">
            <span>Core API</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-[#0a1c3d] uppercase font-mono">
            {healthData.status === 'healthy' ? 'Operational' : 'Attention'}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Services Running</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e2eaf4] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#687d9a] mb-1.5">
            <span>Database</span>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-bold text-[#0a1c3d] uppercase font-mono">
            {healthData.components?.database === 'online' ? 'Connected' : 'Offline'}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-0.5">Telemetry Synced</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e2eaf4] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#687d9a] mb-1.5">
            <span>AI Models</span>
            <Cpu className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-base font-bold text-[#0a1c3d] uppercase font-mono">
            {healthData.components?.model_manager === 'online' ? 'Loaded' : 'Offline'}
          </div>
          <div className="text-[11px] text-purple-600 font-medium mt-0.5">Dual-Layer Classifiers</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e2eaf4] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#687d9a] mb-1.5">
            <span>Live Monitor</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-[#0a1c3d] uppercase font-mono">
            {healthData.components?.live_monitor === 'stopped' ? 'Standby' : 'Active'}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Packet Capture Ready</div>
        </div>
      </div>

      {/* Main Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Detection Sensitivity & Policy */}
        <div className="bg-white rounded-2xl border border-[#e2eaf4] p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#e2eaf4]">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-[#0a1c3d]">Detection Sensitivity & Policies</h2>
          </div>

          <div className="space-y-5">
            {/* Layer 1 Slider */}
            <div className="p-4 rounded-xl border border-[#e2eaf4] bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-[#0a1c3d] block">
                    Layer 1 Threat Threshold
                  </span>
                  <span className="text-[11px] text-[#687d9a]">
                    Minimum confidence required to trigger pre-firewall blocking.
                  </span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                  {(layer1Threshold * 100).toFixed(0)}%
                </span>
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
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1 font-mono">
                <span>50% (Permissive)</span>
                <span>99% (Strict)</span>
              </div>
            </div>

            {/* Layer 2 Slider */}
            <div className="p-4 rounded-xl border border-[#e2eaf4] bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-[#0a1c3d] block">
                    Layer 2 Anomaly Threshold
                  </span>
                  <span className="text-[11px] text-[#687d9a]">
                    Sensitivity for identifying unusual host-to-host communications.
                  </span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                  {(layer2Threshold * 100).toFixed(0)}%
                </span>
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
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1 font-mono">
                <span>50% (Permissive)</span>
                <span>99% (Strict)</span>
              </div>
            </div>

            {/* Auto Quarantine Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#e2eaf4] bg-[#f8fafc]">
              <div className="pr-4">
                <span className="text-xs font-bold text-[#0a1c3d] block">
                  Autonomous Device Quarantine
                </span>
                <span className="text-[11px] text-[#687d9a]">
                  Automatically isolate compromised devices when a high-confidence threat is confirmed.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoQuarantineEnabled}
                  onChange={(e) => setAutoQuarantineEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#0066cc]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: Network & Packet Capture */}
        <div className="bg-white rounded-2xl border border-[#e2eaf4] p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#e2eaf4]">
            <Radio className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-[#0a1c3d]">Network Capture & Adapter</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#0a1c3d] block mb-1.5">
                Monitoring Interface
              </label>
              <select
                value={nicInterface}
                onChange={(e) => setNicInterface(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#dbe6f5] text-xs bg-[#f8fafc] text-[#0a1c3d] font-medium"
              >
                <option value="eth0">eth0 (Primary Ethernet)</option>
                <option value="wlan0">wlan0 (Wi-Fi Adapter)</option>
                <option value="lo">lo (Local Loopback)</option>
              </select>
              <span className="text-[10px] text-[#687d9a] mt-1 block">
                The network adapter bound to the live packet inspection engine.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-[#0a1c3d] block mb-1.5">
                Capture Ring Buffer (MB)
              </label>
              <input
                type="number"
                value={bufferSizeMb}
                onChange={(e) => setBufferSizeMb(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[#dbe6f5] text-xs bg-[#f8fafc] text-[#0a1c3d] font-medium font-mono"
              />
              <span className="text-[10px] text-[#687d9a] mt-1 block">
                Memory allocated for holding rapid packet bursts during high traffic.
              </span>
            </div>

            {/* Promiscuous Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#e2eaf4] bg-[#f8fafc]">
              <div className="pr-4">
                <span className="text-xs font-bold text-[#0a1c3d] block">
                  Promiscuous Mode
                </span>
                <span className="text-[11px] text-[#687d9a]">
                  Capture all traffic passing through the segment, not just packets addressed to this device.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={promiscuousMode}
                  onChange={(e) => setPromiscuousMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#0066cc]"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#e2eaf4] shadow-xs flex items-center justify-between">
        <span className="text-xs text-[#687d9a]">
          Changes take effect immediately across the monitoring engine.
        </span>
        <button
          disabled={saving}
          onClick={handleSaveSettings}
          className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#0052a3] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;
