import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Play, Square, ShieldAlert, Cpu, Activity, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SnifferControlPanel = ({ status, onStart, onStop, isLoading }) => {
  const { role, hasCapability } = useAuth();
  const isAdmin = role === 'admin' || hasCapability('MANAGE_SETTINGS');
  const isRunning = status?.is_running ?? false;

  const formatUptime = (seconds) => {
    if (!seconds) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${isRunning ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            <Activity className={`w-5 h-5 ${isRunning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              NIDS Packet Capture Engine
              <Badge variant={isRunning ? 'success' : 'destructive'} className="font-mono text-xs uppercase tracking-wider">
                {isRunning ? 'SNIFFING ACTIVE' : 'STOPPED'}
              </Badge>
            </CardTitle>
            <p className="text-xs text-slate-400">Live Scapy packet capture, flow extraction, and threat classification</p>
          </div>
        </div>

        {/* Control Button */}
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-md">
              <ShieldAlert className="w-4 h-4" />
              <span>Admin Role Required to Start/Stop</span>
            </div>
          )}

          {isRunning ? (
            <Button
              onClick={onStop}
              disabled={!isAdmin || isLoading}
              variant="destructive"
              className="font-medium flex items-center gap-2 shadow-lg shadow-rose-950/40"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Capture
            </Button>
          ) : (
            <Button
              onClick={onStart}
              disabled={!isAdmin || isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Capture
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            CAPTURE INTERFACE
          </div>
          <div className="font-mono font-semibold text-sm text-slate-200 truncate">
            {status?.interface || 'Default (Auto-select)'}
          </div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            ENGINE UPTIME
          </div>
          <div className="font-mono font-semibold text-sm text-amber-300">
            {formatUptime(status?.uptime_seconds)}
          </div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            PACKETS CAPTURED
          </div>
          <div className="font-mono font-semibold text-sm text-slate-200">
            {(status?.packets_captured || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            EVALUATED FLOWS
          </div>
          <div className="font-mono font-semibold text-sm text-purple-300">
            {(status?.flows_processed || 0).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
