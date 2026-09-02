import React from 'react';
import { Activity } from 'lucide-react';

export const Monitoring = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-4">
      <Activity className="w-5 h-5 text-emerald-400" /> Live Packet Capture & Stream
    </h1>
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm font-mono">
      Live capture telemetry stream (Phase 3).
    </div>
  </div>
);
