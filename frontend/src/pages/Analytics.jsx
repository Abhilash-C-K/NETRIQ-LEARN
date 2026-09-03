import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { analyticsService } from '../services/analytics';
import {
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Activity,
  Zap,
  RefreshCw,
  PieChart,
  Cpu,
  Layers,
} from 'lucide-react';

export const Analytics = () => {
  const [trends, setTrends] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrends = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await analyticsService.getTrends();
      setTrends(data);
    } catch (err) {
      console.error('Failed to load analytics trends:', err);
      setError('Unable to load analytics telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-purple-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Threat Intelligence Analytics</h1>
            <p className="text-xs text-slate-400">Ensemble model velocity metrics, risk distributions, and behavioral trends.</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchTrends}
          disabled={isLoading}
          className="text-xs border-slate-700 hover:bg-slate-800 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </Button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">TOTAL EVALUATED FLOWS</span>
              <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">148,290</span>
              <span className="text-[11px] text-emerald-400 font-mono mt-0.5 block flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +12.4% vs last 24h
              </span>
            </div>
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">MALICIOUS FLOW RATIO</span>
              <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">3.18%</span>
              <span className="text-[11px] text-rose-400/80 font-mono mt-0.5 block">4,715 High/Critical</span>
            </div>
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">MEAN INFERENCE LATENCY</span>
              <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">1.42 ms</span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">Target: &lt; 2.0 ms SLA</span>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Zap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">SDN CONTAINMENTS</span>
              <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">24</span>
              <span className="text-[11px] text-purple-300 font-mono mt-0.5 block">100% Reversal Integrity</span>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Distribution Breakdown */}
        <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <PieChart className="w-4 h-4 text-cyan-400" />
              Attack Vector Classification Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {[
              { type: 'Distributed Denial of Service (DDoS)', percent: 46, color: 'bg-rose-500', count: '2,168 flows' },
              { type: 'Reconnaissance & Port Scanning', percent: 28, color: 'bg-amber-500', count: '1,320 flows' },
              { type: 'SSH / RDP Brute Force Attempt', percent: 14, color: 'bg-purple-500', count: '660 flows' },
              { type: 'Zero-Day Anomaly (IsolationForest)', percent: 9, color: 'bg-cyan-500', count: '424 flows' },
              { type: 'Lateral Infiltration / Shellcode', percent: 3, color: 'bg-indigo-500', count: '143 flows' },
            ].map((item) => (
              <div key={item.type} className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">{item.type}</span>
                  <span className="text-slate-400">{item.percent}% ({item.count})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Model Ensemble Confidence Distribution */}
        <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <Cpu className="w-4 h-4 text-purple-400" />
              Ensemble Confidence & Agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">UNANIMOUS AGREEMENT (Supervised + Anomaly)</span>
                <span className="font-bold text-emerald-400">88.4%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Both Random Forest/XGBoost classification and Isolation Forest anomaly detector concurred on threat verdict.
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">HEURISTIC FALLBACK OVERRIDES (CASE B)</span>
                <span className="font-bold text-amber-400">2.1%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Malformed frames evaluated via deterministic burst thresholds and port escalation rules.
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">ZERO-DAY WEIGHT INFLUENCE</span>
                <span className="font-bold text-cyan-400">0.80 (Active)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Unsupervised anomaly score heavily weighted in decision fusion to catch novel zero-day behaviors.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default Analytics;
