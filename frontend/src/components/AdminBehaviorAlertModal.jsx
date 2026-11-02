import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { responseService } from '../services/response';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  X,
  Lock,
  ArrowRight,
  Clock,
  Radio,
  Laptop,
} from 'lucide-react';

export const AdminBehaviorAlertModal = () => {
  const { subscribe } = useWebSocket();
  const [activeAlert, setActiveAlert] = useState(null);
  const [quarantining, setQuarantining] = useState(false);
  const [quarantinedSuccess, setQuarantinedSuccess] = useState(false);

  useEffect(() => {
    // Subscribe to real-time Layer 2 behavioral deviation events
    const unsubscribe = subscribe('behavior_alert', (event) => {
      if (event && event.payload) {
        setActiveAlert(event.payload);
        setQuarantinedSuccess(false);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe]);

  if (!activeAlert) return null;

  const handleQuarantine = async () => {
    setQuarantining(true);
    try {
      await responseService.triggerQuarantine({
        target_ip: activeAlert.device_ip,
        target_mac: activeAlert.device_mac,
        reason: `SOC Admin quarantine: ${activeAlert.violations?.[0] || 'Behavioral anomaly detected'}`,
      });
      setQuarantinedSuccess(true);
      setTimeout(() => {
        setActiveAlert(null);
        setQuarantinedSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to enforce quarantine:', err);
      alert(`Could not enforce quarantine for ${activeAlert.device_ip}`);
    } finally {
      setQuarantining(false);
    }
  };

  const handleDismiss = () => {
    setActiveAlert(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#071324] border-2 border-red-500/80 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.35)] text-slate-100 relative overflow-hidden">
        {/* Ambient Red Alert Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#183660]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-xs">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-mono uppercase tracking-wider font-bold">
                <Radio className="w-3 h-3 animate-ping" />
                <span>Layer 2 Behavioral Threat Alert</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Abnormal Host Behavior Detected
              </h2>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device & Violation Info */}
        <div className="my-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#030b17] border border-[#1d3d6b] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Laptop className="w-4 h-4 text-[#00e5ff] shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {activeAlert.hostname || 'Unknown Host'}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  IP: <span className="text-slate-200">{activeAlert.device_ip}</span> • MAC:{' '}
                  <span className="text-slate-200">{activeAlert.device_mac || 'Auto'}</span>
                </div>
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-red-600/30 border border-red-500/50 text-red-300 font-mono text-[10px] font-bold uppercase">
              {activeAlert.severity || 'CRITICAL'}
            </span>
          </div>

          {/* Violations List */}
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2">
            <div className="text-xs font-bold text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Baseline Policy Deviations:</span>
            </div>
            <ul className="text-xs text-red-200/90 space-y-1.5 list-disc list-inside leading-relaxed font-sans">
              {(activeAlert.violations || [activeAlert.message]).map((v, idx) => (
                <li key={idx} className="break-words">
                  {v}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            <strong>Containment Protocol:</strong> Quarantining will instantly isolate this host on the
            internal switch segment, preventing lateral movement and ransomware spread to other devices.
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-[#183660] flex items-center justify-between gap-3">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-xl border border-[#1d3d6b] bg-[#091830] hover:bg-[#0e2447] text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Ignore / Acknowledge
          </button>

          {quarantinedSuccess ? (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Device Quarantined!</span>
            </div>
          ) : (
            <button
              onClick={handleQuarantine}
              disabled={quarantining}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{quarantining ? 'Isolating Host...' : 'Quarantine Device Now'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
