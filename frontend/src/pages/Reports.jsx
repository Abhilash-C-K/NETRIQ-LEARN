import React from 'react';
import { FileText } from 'lucide-react';

export const Reports = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-4">
      <FileText className="w-5 h-5 text-purple-400" /> Executive Threat Reports
    </h1>
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm font-mono">
      Downloadable executive PDF & JSON threat intelligence summaries.
    </div>
  </div>
);
