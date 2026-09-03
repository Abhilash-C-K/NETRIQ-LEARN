import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { settingsService } from '../services/settings';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Save,
  ShieldCheck,
  Lock,
  Cpu,
  Sliders,
  Flame,
  Clock,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

export const Settings = () => {
  const { role, hasCapability } = useAuth();
  const isAdmin = hasCapability('MANAGE_SETTINGS') || role === 'admin';

  const [settings, setSettings] = useState({
    anomaly_detector_enabled: true,
    zero_day_weight: 0.8,
    high_anomaly_threshold: 70.0,
    heuristic_min_rules_for_quarantine: 2,
    quarantine_mode: 'sdn_vlan',
    threat_retention_days: 7,
    login_max_attempts: 5,
    login_lockout_minutes: 15,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const data = await settingsService.getSettings();
        if (data && typeof data === 'object') {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.warn('Could not load remote settings, using local defaults:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      await settingsService.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError('Failed to apply configuration updates.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">System Configuration</h1>
              <p className="text-xs text-slate-400">Core intrusion detection and SDN sensitivity tuning.</p>
            </div>
          </div>
        </div>

        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl space-y-4 max-w-xl mx-auto">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-rose-400">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-200">Administrator Access Required</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            System configuration tuning is restricted to accounts with the <span className="font-mono text-cyan-400">MANAGE_SETTINGS</span> capability. Your account (<span className="font-mono uppercase text-purple-300">{role || 'Viewer'}</span>) is not permitted to modify operational thresholds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">System Configuration</h1>
            <p className="text-xs text-slate-400">Fine-tune machine learning anomaly fusion, SDN enforcement mode, and security policies.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* AI & Anomaly Fusion Settings */}
        <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <Cpu className="w-4 h-4 text-purple-400" />
              Machine Learning & Anomaly Fusion Tuning
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-200 block">
                  Isolation Forest Anomaly Detector
                </label>
                <span className="text-[11px] text-slate-400 block">
                  Enable unsupervised statistical outlier detection for zero-day burst defense.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.anomaly_detector_enabled}
                onChange={(e) => setSettings({ ...settings, anomaly_detector_enabled: e.target.checked })}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-800/80">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Zero-Day Weight Influence ({settings.zero_day_weight})
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={settings.zero_day_weight}
                  onChange={(e) => setSettings({ ...settings, zero_day_weight: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Relative weight of unsupervised anomaly score versus supervised classifier.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  High Anomaly Score Floor ({settings.high_anomaly_threshold})
                </label>
                <input
                  type="number"
                  value={settings.high_anomaly_threshold}
                  onChange={(e) => setSettings({ ...settings, high_anomaly_threshold: parseFloat(e.target.value) })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Minimum IsolationForest outlier score (0-100) to classify as actionable high risk.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SDN Containment & Security Policies */}
        <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Containment Protocols & Access Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Containment Mode Protocol
              </label>
              <select
                value={settings.quarantine_mode}
                onChange={(e) => setSettings({ ...settings, quarantine_mode: e.target.value })}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="sdn_vlan">Layer 2 SDN Host Isolation (VLAN 99)</option>
                <option value="firewall_drop">Layer 1 Perimeter Firewall Drop Only</option>
                <option value="safe_sandbox">Safe Educational Sandbox (No-Op Mock)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Threat Record Retention (Days)
              </label>
              <input
                type="number"
                value={settings.threat_retention_days}
                onChange={(e) => setSettings({ ...settings, threat_retention_days: parseInt(e.target.value) })}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Failed Login Lockout Threshold
              </label>
              <input
                type="number"
                value={settings.login_max_attempts}
                onChange={(e) => setSettings({ ...settings, login_max_attempts: parseInt(e.target.value) })}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Lockout Duration (Minutes)
              </label>
              <input
                type="number"
                value={settings.login_lockout_minutes}
                onChange={(e) => setSettings({ ...settings, login_lockout_minutes: parseInt(e.target.value) })}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          {saveSuccess ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Configuration saved and applied to runtime engine.
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-mono">
              Requires MANAGE_SETTINGS administrative capability.
            </span>
          )}

          <Button
            type="submit"
            disabled={isSaving}
            className="text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/40 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Applying Settings...' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
};
export default Settings;
