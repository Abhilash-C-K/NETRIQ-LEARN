import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export const Settings = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-4">
      <SettingsIcon className="w-5 h-5 text-slate-400" /> System Settings
    </h1>
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm font-mono">
      Configure firewall API keys, SDN controller endpoints, and retention thresholds (Admin only).
    </div>
  </div>
);
