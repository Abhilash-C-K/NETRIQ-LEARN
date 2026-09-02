import React from 'react';
import { Cpu } from 'lucide-react';

export const AIPerformance = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-4">
      <Cpu className="w-5 h-5 text-cyan-400" /> AI Model Performance & Explainability
    </h1>
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm font-mono">
      SHAP feature importance metrics, model confidence distributions, and accuracy statistics.
    </div>
  </div>
);
