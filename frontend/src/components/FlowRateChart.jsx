import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Activity, ShieldAlert, BarChart3 } from 'lucide-react';

export const FlowRateChart = ({ entries = [], feed = [] }) => {
  const chartData = useMemo(() => {
    const dataList = Array.isArray(entries) && entries.length > 0 ? entries : (Array.isArray(feed) ? feed : []);

    // Generate 12 5-second interval buckets over the last 60 seconds
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      label: `${(11 - i) * 5}s ago`,
      count: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }));

    const now = Date.now() / 1000;

    dataList.forEach((item) => {
      const itemTime = item.timestamp ? new Date(item.timestamp).getTime() / 1000 : now;
      const diffSec = now - itemTime;
      if (diffSec >= 0 && diffSec < 60) {
        const bucketIndex = 11 - Math.floor(diffSec / 5);
        if (bucketIndex >= 0 && bucketIndex < 12) {
          buckets[bucketIndex].count += 1;
          const sev = (item.severity || item.risk_category || item.verdict?.risk_category || 'low').toLowerCase();
          if (sev === 'critical') buckets[bucketIndex].critical += 1;
          else if (sev === 'high') buckets[bucketIndex].high += 1;
          else if (sev === 'medium') buckets[bucketIndex].medium += 1;
          else buckets[bucketIndex].low += 1;
        }
      }
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 5);
    return { buckets, maxCount };
  }, [entries, feed]);

  return (
    <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <CardTitle className="text-base font-bold text-slate-100">
            Real-Time Flow Throughput (60s Sliding Window)
          </CardTitle>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="text-slate-400">Critical/High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-slate-400">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-400">Low/Pass</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* SVG Bar Chart Container */}
        <div className="h-40 w-full flex items-end justify-between gap-2 pt-4 px-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
          {chartData.buckets.map((b) => {
            const heightPct = Math.min((b.count / chartData.maxCount) * 100, 100);

            return (
              <div key={b.index} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on Hover */}
                <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-slate-900 border border-slate-700 text-[11px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-20">
                  <span className="font-bold text-slate-200">{b.count} flows</span>
                  <span className="text-slate-400 font-mono">{b.label}</span>
                </div>

                {/* Stacked Bar */}
                <div className="w-full max-w-[28px] bg-slate-800/50 rounded-t overflow-hidden flex flex-col justify-end transition-all duration-300" style={{ height: `${Math.max(heightPct, 4)}%` }}>
                  {b.critical + b.high > 0 && (
                    <div
                      style={{ height: `${((b.critical + b.high) / (b.count || 1)) * 100}%` }}
                      className="bg-gradient-to-t from-rose-600 to-rose-500"
                    />
                  )}
                  {b.medium > 0 && (
                    <div
                      style={{ height: `${(b.medium / (b.count || 1)) * 100}%` }}
                      className="bg-gradient-to-t from-amber-600 to-amber-500"
                    />
                  )}
                  {b.low > 0 && (
                    <div
                      style={{ height: `${(b.low / (b.count || 1)) * 100}%` }}
                      className="bg-gradient-to-t from-emerald-600 to-emerald-500"
                    />
                  )}
                </div>

                {/* X Axis Label */}
                <span className="text-[10px] text-slate-500 font-mono mt-2 truncate w-full text-center">
                  {b.index % 3 === 0 ? b.label : ''}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
