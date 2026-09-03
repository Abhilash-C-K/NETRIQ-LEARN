import React from 'react';
import { BlobCard } from '../components/ui/BlobCard';
import { RetroGrid } from '../components/ui/RetroGrid';
import { Cpu, Zap, Sparkles } from 'lucide-react';
import { Badge } from '../components/ui/badge';

export const AIPerformance = () => {
  return (
    <div className="space-y-6">
      {/* Top Banner with Magic UI Retro Grid */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
        <RetroGrid className="opacity-40" angle={60} />
        
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" /> AI Engine Performance & Explainability
            </h1>
            <p className="text-xs text-slate-400 font-sans mt-1">
              Real-time supervised ensemble metrics, SHAP TreeExplainer attribution, and Isolation Forest zero-day anomaly weights.
            </p>
          </div>
          <Badge variant="cyan" className="font-mono text-xs uppercase flex items-center gap-1.5 px-3 py-1">
            <Sparkles className="w-3.5 h-3.5" />
            XGBoost + TreeExplainer
          </Badge>
        </div>
      </div>

      {/* Featured Fluid Blob Card - Pure Ocean Cyan & Electric Blue Gradient */}
      <BlobCard
        headerHeight={180}
        glowColors={["#06b6d4", "#3b82f6", "#0284c7", "#38bdf8", "#06b6d4"]}
        darkColors={["#0891b2", "#1d4ed8", "#0284c7", "#0369a1"]}
        lightColors={["#38bdf8", "#0284c7", "#0369a1", "#7dd3fc"]}
        header={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Zap className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-mono font-bold tracking-wide text-slate-100">
                  Dual-Layer Fusion Engine Metrics
                </h2>
              </div>
              <p className="text-xs text-slate-300 font-sans max-w-lg">
                Combines 71 flow statistics with SHAP TreeExplainer feature attribution for sub-15ms inference latency.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase text-cyan-300">Average Hot Path Latency</p>
                <p className="text-xl font-mono font-bold text-slate-100">11.4 ms</p>
              </div>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 transition-colors shadow-sm">
            <span className="text-xs font-mono uppercase text-slate-400">Supervised Model</span>
            <p className="text-base font-bold font-mono text-cyan-400">XGBoost Classifier</p>
            <p className="text-[11px] text-slate-400">Trained on 71 CICIDS-2017 features</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 transition-colors shadow-sm">
            <span className="text-xs font-mono uppercase text-slate-400">Zero-Day Anomaly Detector</span>
            <p className="text-base font-bold font-mono text-cyan-500">Isolation Forest</p>
            <p className="text-[11px] text-slate-400">Unsupervised outlier score threshold (0.65)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 transition-colors shadow-sm">
            <span className="text-xs font-mono uppercase text-slate-400">Model Accuracy</span>
            <p className="text-base font-bold font-mono text-emerald-400">99.42%</p>
            <p className="text-[11px] text-slate-400">Evaluated against test validation dataset</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 transition-colors shadow-sm">
            <span className="text-xs font-mono uppercase text-slate-400">Attribution Engine</span>
            <p className="text-base font-bold font-mono text-sky-400">SHAP TreeExplainer</p>
            <p className="text-[11px] text-slate-400">Sub-millisecond Shapley contribution values</p>
          </div>
        </div>
      </BlobCard>
    </div>
  );
};
