import React from 'react';
import { BarChart3 } from 'lucide-react';

export const Analytics = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-4">
      <BarChart3 className="w-5 h-5 text-blue-400" /> Security Analytics & Metrics
    </h1>
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm font-mono">
      Traffic trends, top target assets, and attack distribution analytics.
    </div>
  </div>
);
