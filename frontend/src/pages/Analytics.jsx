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
    <div className="space-y-5 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#19242E] border border-[#2A3944] p-5 rounded-lg shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#E7ECEF] font-sans">Threat Intelligence</h1>
            <p className="text-xs text-[#9AA8B2] font-sans">Detection velocity, risk distribution, and ensemble decision metrics</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchTrends}
          disabled={isLoading}
          className="text-xs border-[#2A3944] bg-[#101820] hover:bg-[#202D36] text-[#E7ECEF] flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </Button>
      </div>

      {/* KPI Row (Almost everything white, only 3.18% gets critical color per spec) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TOTAL FLOWS: 148,290 */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#9AA8B2] block font-sans font-medium uppercase tracking-wide">TOTAL FLOWS</span>
              <span className="text-2xl font-mono font-bold text-[#E7ECEF] mt-1 block">148,290</span>
              <span className="text-[11px] text-[#9AA8B2] font-sans mt-0.5 block flex items-center gap-1">
                +12.4% vs last 24h
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101820] border border-[#2A3944] text-[#9AA8B2]">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* MALICIOUS FLOW RATE: 3.18% (Critical #DF857C) */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#9AA8B2] block font-sans font-medium uppercase tracking-wide">MALICIOUS FLOW RATE</span>
              <span className="text-2xl font-mono font-bold text-[#DF857C] mt-1 block">3.18%</span>
              <span className="text-[11px] text-[#9AA8B2] font-sans mt-0.5 block">4,715 flagged events</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101820] border border-[#2A3944] text-[#DF857C]">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* MEAN INFERENCE LATENCY: 1.42 ms */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#9AA8B2] block font-sans font-medium uppercase tracking-wide">MEAN INFERENCE LATENCY</span>
              <span className="text-2xl font-mono font-bold text-[#E7ECEF] mt-1 block">1.42 ms</span>
              <span className="text-[11px] text-[#9AA8B2] font-sans mt-0.5 block">Target &lt; 2.0 ms SLA</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101820] border border-[#2A3944] text-[#9AA8B2]">
              <Zap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* BLOCKED CONNECTIONS: 284 */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#9AA8B2] block font-sans font-medium uppercase tracking-wide">BLOCKED CONNECTIONS</span>
              <span className="text-2xl font-mono font-bold text-[#E7ECEF] mt-1 block">284</span>
              <span className="text-[11px] text-[#9AA8B2] font-sans mt-0.5 block">Layer 1 & 2 containment</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101820] border border-[#2A3944] text-[#9AA8B2]">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attack Vector Chart: Dominant #7895B2, higher risk #D3A35D / #DF857C */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardHeader className="border-b border-[#2A3944] pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#E7ECEF] font-sans">
              <PieChart className="w-4 h-4 text-[#7895B2]" />
              Attack Vector Classification Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {[
              { type: 'Distributed Denial of Service (DDoS)', percent: 46, color: 'bg-[#DF857C]', count: '2,168 flows' },
              { type: 'Reconnaissance & Port Scanning', percent: 28, color: 'bg-[#D3A35D]', count: '1,320 flows' },
              { type: 'SSH / RDP Brute Force Attempt', percent: 14, color: 'bg-[#7895B2]', count: '660 flows' },
              { type: 'Zero-Day Outlier (IsolationForest)', percent: 9, color: 'bg-[#7895B2]', count: '424 flows' },
              { type: 'Lateral Infiltration Attempt', percent: 3, color: 'bg-[#7895B2]', count: '143 flows' },
            ].map((item) => (
              <div key={item.type} className="space-y-1.5">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-[#E7ECEF]">{item.type}</span>
                  <span className="text-[#9AA8B2] font-mono">{item.percent}% ({item.count})</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#101820] overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Model Ensemble Confidence Distribution */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardHeader className="border-b border-[#2A3944] pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#E7ECEF] font-sans">
              <Cpu className="w-4 h-4 text-[#7895B2]" />
              Ensemble Confidence & Agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            <div className="bg-[#101820] p-3.5 rounded-lg border border-[#2A3944] space-y-1">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-[#9AA8B2] font-medium uppercase tracking-wide">UNANIMOUS AGREEMENT</span>
                <span className="font-bold text-[#E7ECEF] font-mono">88.4%</span>
              </div>
              <p className="text-[11px] text-[#9AA8B2] font-sans leading-relaxed">
                Supervised classification and Isolation Forest anomaly detector concurred on threat verdict.
              </p>
            </div>

            <div className="bg-[#101820] p-3.5 rounded-lg border border-[#2A3944] space-y-1">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-[#9AA8B2] font-medium uppercase tracking-wide">HEURISTIC OVERRIDES</span>
                <span className="font-bold text-[#D3A35D] font-mono">2.1%</span>
              </div>
              <p className="text-[11px] text-[#9AA8B2] font-sans leading-relaxed">
                Malformed frames evaluated via deterministic burst thresholds and port escalation rules.
              </p>
            </div>

            <div className="bg-[#101820] p-3.5 rounded-lg border border-[#2A3944] space-y-1">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-[#9AA8B2] font-medium uppercase tracking-wide">ZERO-DAY WEIGHT</span>
                <span className="font-bold text-[#7895B2] font-mono">0.80</span>
              </div>
              <p className="text-[11px] text-[#9AA8B2] font-sans leading-relaxed">
                Unsupervised anomaly score weighted in decision fusion to catch novel zero-day behaviors.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default Analytics;
