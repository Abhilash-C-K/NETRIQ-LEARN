import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { settingsService } from '../services/settings';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Save,
  AlertTriangle,
} from 'lucide-react';

export const Settings = () => {
  const { role, hasCapability } = useAuth();
  const isAdmin = hasCapability('MANAGE_SETTINGS') || role === 'admin';

  // Active settings tab matching specification:
  // General | Security | Detection | Firewall | Notifications | Integrations | Audit
  const [activeTab, setActiveTab] = useState('Detection');

  const [settings, setSettings] = useState({
    instance_name: 'netriq-soc-node-01',
    timezone: 'UTC',
    threat_retention_days: 7,
    login_max_attempts: 5,
    login_lockout_minutes: 15,
    session_expiry_hours: 8,
    mfa_required: true,
    anomaly_detector_enabled: true,
    zero_day_weight: 0.8,
    high_anomaly_threshold: 70.0,
    quarantine_mode: 'sdn_vlan',
    vlan_id: 99,
    auto_quarantine_critical: true,
    ws_broadcast_enabled: true,
    webhook_url: 'https://soc.netriq.local/alerts/incoming',
    siem_forwarding: false,
    audit_level: 'standard',
    immutable_audit_logs: true,
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

  const navItems = [
    'General',
    'Security',
    'Detection',
    'Firewall',
    'Notifications',
    'Integrations',
    'Audit',
  ];

  if (!isAdmin) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between bg-[#19242E] border border-[#2A3944] p-5 rounded-lg">
          <div>
            <h1 className="text-lg font-semibold text-[#E7ECEF] font-sans">Settings</h1>
            <p className="text-xs text-[#9AA8B2] font-sans">Platform and detection parameters</p>
          </div>
        </div>

        <div className="p-12 text-center bg-[#19242E] border border-[#2A3944] rounded-lg space-y-3 max-w-xl mx-auto">
          <div className="p-3 bg-[#DF857C]/15 border border-[#DF857C]/30 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-[#DF857C]">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#E7ECEF] font-sans">Administrator Access Required</h3>
          <p className="text-xs text-[#9AA8B2] leading-relaxed font-sans">
            Configuration tuning requires the MANAGE_SETTINGS administrative capability.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="bg-[#19242E] border border-[#2A3944] p-5 rounded-lg">
        <h1 className="text-lg font-semibold text-[#E7ECEF] font-sans">Settings</h1>
        <p className="text-xs text-[#9AA8B2] font-sans mt-0.5">
          Platform configuration, detection engine parameters, and containment policies
        </p>
      </div>

      {/* Conventional Enterprise Settings Layout: Left Nav + Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Navigation */}
        <div className="md:col-span-3 bg-[#19242E] border border-[#2A3944] rounded-lg p-2 h-fit space-y-1">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveTab(item)}
              className={`w-full text-left px-3 py-2 text-xs font-sans rounded-md transition-colors cursor-pointer flex items-center justify-between ${
                activeTab === item
                  ? 'bg-[#202D36] text-[#E7ECEF] font-semibold border-l-2 border-l-[#71A99D]'
                  : 'text-[#9AA8B2] hover:text-[#E7ECEF] hover:bg-[#202D36]/50'
              }`}
            >
              <span>{item}</span>
            </button>
          ))}
        </div>

        {/* Right Settings Panel */}
        <div className="md:col-span-9 bg-[#19242E] border border-[#2A3944] rounded-lg p-5">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-[#DF857C]/15 border border-[#DF857C]/30 rounded-lg text-[#DF857C] text-xs flex items-center gap-2 font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB: General */}
            {activeTab === 'General' && (
              <div className="space-y-4">
                <div className="border-b border-[#2A3944] pb-2 mb-4">
                  <h2 className="text-sm font-semibold text-[#E7ECEF] font-sans">General Configuration</h2>
                  <p className="text-xs text-[#9AA8B2] font-sans">Global environment parameters and retention limits</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-sans font-medium text-[#9AA8B2] mb-1">
                      Instance Identifier
                    </label>
                    <input
                      type="text"
                      value={settings.instance_name}
                      onChange={(e) => setSettings({ ...settings, instance_name: e.target.value })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] focus:outline-none focus:border-[#71A99D] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-sans font-medium text-[#9AA8B2] mb-1">
                      Threat Record Retention (Days)
                    </label>
                    <input
                      type="number"
                      value={settings.threat_retention_days}
                      onChange={(e) => setSettings({ ...settings, threat_retention_days: parseInt(e.target.value) || 7 })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] focus:outline-none focus:border-[#71A99D] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-sans font-medium text-[#9AA8B2] mb-1">
                      System Timezone
                    </label>
                    <input
                      type="text"
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] focus:outline-none focus:border-[#71A99D] font-sans"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Security */}
            {activeTab === 'Security' && (
              <div className="space-y-4">
                <div className="border-b border-[#2A3944] pb-2 mb-4">
                  <h2 className="text-sm font-semibold text-[#E7ECEF] font-sans">Security & Authentication</h2>
                  <p className="text-xs text-[#9AA8B2] font-sans">Brute force lockout rules and session token expiration</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-sans font-medium text-[#9AA8B2] mb-1">
                      Failed Login Lockout Threshold (Attempts)
                    </label>
                    <input
                      type="number"
                      value={settings.login_max_attempts}
                      onChange={(e) => setSettings({ ...settings, login_max_attempts: parseInt(e.target.value) || 5 })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] focus:outline-none focus:border-[#71A99D] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-sans font-medium text-[#9AA8B2] mb-1">
                      Lockout Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.login_lockout_minutes}
                      onChange={(e) => setSettings({ ...settings, login_lockout_minutes: parseInt(e.target.value) || 15 })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] focus:outline-none focus:border-[#71A99D] font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs font-medium text-[#E7ECEF] block">Mandatory Multi-Factor Authentication</span>
                      <span className="text-[11px] text-[#9AA8B2] block">Enforce TOTP validation on all operator logins</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.mfa_required}
                      onChange={(e) => setSettings({ ...settings, mfa_required: e.target.checked })}
                      className="rounded border-[#2A3944] bg-[#101820] text-[#71A99D] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Detection */}
            {activeTab === 'Detection' && (
              <div className="space-y-4">
                <div className="border-b border-[#2A3944] pb-2 mb-4">
                  <h2 className="text-sm font-semibold text-[#E7ECEF] font-sans">Detection Engine & Anomaly Fusion</h2>
                  <p className="text-xs text-[#9AA8B2] font-sans">Dual-layer supervised ML and unsupervised Isolation Forest settings</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-medium text-[#E7ECEF] block">
                        Isolation Forest Outlier Detection
                      </label>
                      <span className="text-[11px] text-[#9AA8B2] block">
                        Unsupervised statistical anomaly defense for zero-day flows
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.anomaly_detector_enabled}
                      onChange={(e) => setSettings({ ...settings, anomaly_detector_enabled: e.target.checked })}
                      className="rounded border-[#2A3944] bg-[#101820] text-[#71A99D] w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#2A3944]">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-[#9AA8B2]">
                        Zero-Day Weight Influence
                      </label>
                      <span className="font-mono text-xs text-[#E7ECEF]">{settings.zero_day_weight}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={settings.zero_day_weight}
                      onChange={(e) => setSettings({ ...settings, zero_day_weight: parseFloat(e.target.value) })}
                      className="w-full accent-[#71A99D] cursor-pointer"
                    />
                    <span className="text-[11px] text-[#687883] block mt-1">
                      Balances unsupervised outlier score against supervised XGBoost model output.
                    </span>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-medium text-[#9AA8B2] mb-1">
                      High Anomaly Score Threshold
                    </label>
                    <input
                      type="number"
                      value={settings.high_anomaly_threshold}
                      onChange={(e) => setSettings({ ...settings, high_anomaly_threshold: parseFloat(e.target.value) })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] font-mono focus:outline-none focus:border-[#71A99D]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Firewall */}
            {activeTab === 'Firewall' && (
              <div className="space-y-4">
                <div className="border-b border-[#2A3944] pb-2 mb-4">
                  <h2 className="text-sm font-semibold text-[#E7ECEF] font-sans">Firewall & Containment Policies</h2>
                  <p className="text-xs text-[#9AA8B2] font-sans">Layer 1 packet dropping and Layer 2 SDN host isolation</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#9AA8B2] mb-1">
                      Containment Protocol Mode
                    </label>
                    <select
                      value={settings.quarantine_mode}
                      onChange={(e) => setSettings({ ...settings, quarantine_mode: e.target.value })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] focus:outline-none focus:border-[#71A99D] font-sans"
                    >
                      <option value="sdn_vlan">Layer 2 SDN Host Isolation (VLAN 99)</option>
                      <option value="firewall_drop">Layer 1 Perimeter Firewall Drop Only</option>
                      <option value="safe_sandbox">Safe Educational Sandbox (No-Op Mock)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#9AA8B2] mb-1">
                      SDN Isolation VLAN ID
                    </label>
                    <input
                      type="number"
                      value={settings.vlan_id}
                      onChange={(e) => setSettings({ ...settings, vlan_id: parseInt(e.target.value) || 99 })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] font-mono focus:outline-none focus:border-[#71A99D]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs font-medium text-[#E7ECEF] block">Automatic Quarantine on Critical Threat</span>
                      <span className="text-[11px] text-[#9AA8B2] block">Isolate host immediately without waiting for analyst triage</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.auto_quarantine_critical}
                      onChange={(e) => setSettings({ ...settings, auto_quarantine_critical: e.target.checked })}
                      className="rounded border-[#2A3944] bg-[#101820] text-[#71A99D] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Notifications */}
            {activeTab === 'Notifications' && (
              <div className="space-y-4">
                <div className="border-b border-[#2A3944] pb-2 mb-4">
                  <h2 className="text-sm font-semibold text-[#E7ECEF] font-sans">Alert Notifications</h2>
                  <p className="text-xs text-[#9AA8B2] font-sans">Dispatch critical threat events via Webhook and WebSocket broadcast</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-[#E7ECEF] block">Live WebSocket Broadcast</span>
                      <span className="text-[11px] text-[#9AA8B2] block">Send real-time alerts to connected browser sessions</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.ws_broadcast_enabled}
                      onChange={(e) => setSettings({ ...settings, ws_broadcast_enabled: e.target.checked })}
                      className="rounded border-[#2A3944] bg-[#101820] text-[#71A99D] w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#9AA8B2] mb-1">
                      Webhook Notification URL
                    </label>
                    <input
                      type="text"
                      value={settings.webhook_url}
                      onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] font-mono focus:outline-none focus:border-[#71A99D]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Integrations */}
            {activeTab === 'Integrations' && (
              <div className="space-y-4">
                <div className="border-b border-[#2A3944] pb-2 mb-4">
                  <h2 className="text-sm font-semibold text-[#E7ECEF] font-sans">Enterprise Integrations</h2>
                  <p className="text-xs text-[#9AA8B2] font-sans">SIEM telemetry forwarding and SOAR playbooks</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-[#E7ECEF] block">SIEM Syslog Forwarder (Splunk / Elastic)</span>
                      <span className="text-[11px] text-[#9AA8B2] block">Forward enriched CEF/JSON events to corporate SIEM</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.siem_forwarding}
                      onChange={(e) => setSettings({ ...settings, siem_forwarding: e.target.checked })}
                      className="rounded border-[#2A3944] bg-[#101820] text-[#71A99D] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Audit */}
            {activeTab === 'Audit' && (
              <div className="space-y-4">
                <div className="border-b border-[#2A3944] pb-2 mb-4">
                  <h2 className="text-sm font-semibold text-[#E7ECEF] font-sans">Audit & Compliance Logging</h2>
                  <p className="text-xs text-[#9AA8B2] font-sans">Immutable audit trail of operator and automated mitigation decisions</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#9AA8B2] mb-1">
                      Audit Log Verbosity
                    </label>
                    <select
                      value={settings.audit_level}
                      onChange={(e) => setSettings({ ...settings, audit_level: e.target.value })}
                      className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] focus:outline-none focus:border-[#71A99D] font-sans"
                    >
                      <option value="minimal">Minimal (Mitigations & Auth Failures Only)</option>
                      <option value="standard">Standard (All State Changes & Verdicts)</option>
                      <option value="verbose">Verbose (All API Operations & Hot Path Decisions)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs font-medium text-[#E7ECEF] block">SHA-256 Tamper-Evident Ledger</span>
                      <span className="text-[11px] text-[#9AA8B2] block">Cryptographically link sequential audit entries</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.immutable_audit_logs}
                      onChange={(e) => setSettings({ ...settings, immutable_audit_logs: e.target.checked })}
                      className="rounded border-[#2A3944] bg-[#101820] text-[#71A99D] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Save Button Row */}
            <div className="flex items-center justify-between pt-4 border-t border-[#2A3944]">
              {saveSuccess ? (
                <span className="text-xs text-[#71A99D] font-medium flex items-center gap-1.5 font-sans">
                  <ShieldCheck className="w-4 h-4" /> Configuration saved successfully.
                </span>
              ) : (
                <span className="text-xs text-[#9AA8B2] font-sans">
                  Changes take effect immediately on runtime engine.
                </span>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#71A99D] hover:bg-[#60958a] text-[#101820] font-sans text-xs font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default Settings;
