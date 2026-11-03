import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Play, Square, ShieldAlert, Cpu, Clock, Layers, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SnifferControlPanel = ({ status, onStart, onStop, isLoading }) => {
  const { role, hasCapability } = useAuth();
  const isAdmin = role === 'admin' || hasCapability('MANAGE_SETTINGS');
  const isRunning = status?.is_running ?? false;

  const [localUptime, setLocalUptime] = useState(status?.uptime_seconds || 0);

  // Sync with incoming status prop
  useEffect(() => {
    setLocalUptime(status?.uptime_seconds || 0);
  }, [status?.uptime_seconds]);

  // Client-side 1-second interval ticker for smooth uptime counter rendering
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setLocalUptime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatUptime = (seconds) => {
    if (!seconds || seconds <= 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-white border border-slate-700 text-[#0a1c3d] shadow-xs rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-300">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base font-bold text-[#0a1c3d] font-sans">
                NIDS Packet Capture Engine
              </CardTitle>
              {isRunning ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  SNIFFING ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  STOPPED
                </span>
              )}
            </div>
            <p className="text-xs text-[#687d9a] mt-0.5 font-sans">
              Live Scapy wire capture, bidirectional flow aggregation, and ML inference
            </p>
          </div>
        </div>

        {/* Control Button */}
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg font-sans">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Role Required to Start/Stop</span>
            </div>
          )}

          {isRunning ? (
            <button
              onClick={onStop}
              disabled={!isAdmin || isLoading}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold h-8 px-3.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Capture
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={!isAdmin || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-semibold h-8 px-3.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Capture
            </button>
          )}
        </div>
      </CardHeader>

      {/* Statistics Row: Clean light typography with dark borders */}
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4">
        <div className="bg-[#f8fafc] p-3.5 rounded-xl border border-slate-700 hover:border-slate-900 transition-colors">
          <div className="text-[11px] text-[#687d9a] font-sans font-semibold uppercase tracking-wider mb-1">
            CAPTURE INTERFACE
          </div>
          <div className="font-mono text-sm font-bold text-[#0a1c3d] truncate">
            {status?.interface || 'Default (Auto-select)'}
          </div>
        </div>

        <div className="bg-[#f8fafc] p-3.5 rounded-xl border border-slate-700 hover:border-slate-900 transition-colors">
          <div className="text-[11px] text-[#687d9a] font-sans font-semibold uppercase tracking-wider mb-1">
            ENGINE UPTIME
          </div>
          <div className="font-mono text-sm font-bold text-[#0a1c3d]">
            {formatUptime(localUptime)}
          </div>
        </div>

        <div className="bg-[#f8fafc] p-3.5 rounded-xl border border-slate-700 hover:border-slate-900 transition-colors">
          <div className="text-[11px] text-[#687d9a] font-sans font-semibold uppercase tracking-wider mb-1">
            PACKETS CAPTURED
          </div>
          <div className="font-mono text-sm font-bold text-[#0a1c3d]">
            {(status?.packets_captured || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-[#f8fafc] p-3.5 rounded-xl border border-slate-700 hover:border-slate-900 transition-colors">
          <div className="text-[11px] text-[#687d9a] font-sans font-semibold uppercase tracking-wider mb-1">
            EVALUATED FLOWS
          </div>
          <div className="font-mono text-sm font-bold text-[#0a1c3d]">
            {(status?.flows_processed || 0).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
