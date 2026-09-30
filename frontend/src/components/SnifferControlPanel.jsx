import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Play, Square, ShieldAlert, Cpu, Clock, Layers } from 'lucide-react';
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
    <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#2A3944]">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-base font-semibold text-[#E7ECEF] font-sans">
                NIDS Packet Capture Engine
              </CardTitle>
              {/* Small top status indicator with #71A99D */}
              {isRunning ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-[#71A99D] bg-[#71A99D]/15 px-2 py-0.5 rounded border border-[#71A99D]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#71A99D]" />
                  SNIFFING ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-[#9AA8B2] bg-[#202D36] px-2 py-0.5 rounded border border-[#2A3944]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#687883]" />
                  STOPPED
                </span>
              )}
            </div>
            <p className="text-xs text-[#9AA8B2] mt-0.5 font-sans">
              Live Scapy wire capture, bidirectional flow aggregation, and ML inference
            </p>
          </div>
        </div>

        {/* Control Button */}
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <div className="flex items-center gap-1.5 text-xs text-[#D3A35D] bg-[#D3A35D]/10 border border-[#D3A35D]/20 px-2.5 py-1 rounded-md font-sans">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Role Required to Start/Stop</span>
            </div>
          )}

          {isRunning ? (
            <Button
              onClick={onStop}
              disabled={!isAdmin || isLoading}
              variant="destructive"
              className="text-xs h-8 px-3 font-sans font-medium flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Capture
            </Button>
          ) : (
            <button
              onClick={onStart}
              disabled={!isAdmin || isLoading}
              className="bg-[#71A99D] hover:bg-[#60958a] text-[#101820] font-sans text-xs font-semibold h-8 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Capture
            </button>
          )}
        </div>
      </CardHeader>

      {/* Statistics Row: Clean white/gray typography */}
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4">
        <div className="bg-[#101820] p-3.5 rounded-lg border border-[#2A3944]">
          <div className="text-[11px] text-[#9AA8B2] font-sans font-medium uppercase mb-1">
            CAPTURE INTERFACE
          </div>
          <div className="font-mono text-sm font-semibold text-[#E7ECEF] truncate">
            {status?.interface || 'Default (Auto-select)'}
          </div>
        </div>

        <div className="bg-[#101820] p-3.5 rounded-lg border border-[#2A3944]">
          <div className="text-[11px] text-[#9AA8B2] font-sans font-medium uppercase mb-1">
            ENGINE UPTIME
          </div>
          <div className="font-mono text-sm font-semibold text-[#E7ECEF]">
            {formatUptime(localUptime)}
          </div>
        </div>

        <div className="bg-[#101820] p-3.5 rounded-lg border border-[#2A3944]">
          <div className="text-[11px] text-[#9AA8B2] font-sans font-medium uppercase mb-1">
            PACKETS CAPTURED
          </div>
          <div className="font-mono text-sm font-semibold text-[#E7ECEF]">
            {(status?.packets_captured || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-[#101820] p-3.5 rounded-lg border border-[#2A3944]">
          <div className="text-[11px] text-[#9AA8B2] font-sans font-medium uppercase mb-1">
            EVALUATED FLOWS
          </div>
          <div className="font-mono text-sm font-semibold text-[#E7ECEF]">
            {(status?.flows_processed || 0).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
