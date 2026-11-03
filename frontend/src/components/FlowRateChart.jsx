import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { BarChart3 } from 'lucide-react';

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
    <Card className="bg-white border border-slate-700 text-[#0a1c3d] shadow-xs rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-300">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <CardTitle className="text-sm font-bold text-[#0a1c3d] font-sans">
            Real-Time Flow Throughput (60s Window)
          </CardTitle>
        </div>

        {/* Legend matching NetrIQ specification */}
        <div className="flex items-center gap-4 text-xs font-sans">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
            <span className="text-[#687d9a] font-medium">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <span className="text-[#687d9a] font-medium">Suspicious</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
            <span className="text-[#687d9a] font-medium">Normal</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* SVG Bar Chart Container with dark border */}
        <div className="h-36 w-full flex items-end justify-between gap-2 pt-4 px-3 bg-[#f8fafc] rounded-xl border border-slate-700">
          {chartData.buckets.map((b) => {
            const heightPct = Math.min((b.count / chartData.maxCount) * 100, 100);

            return (
              <div key={b.index} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on Hover */}
                <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-white border border-slate-700 text-[11px] px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap z-20">
                  <span className="font-bold text-[#0a1c3d]">{b.count} flows</span>
                  <span className="text-[#687d9a] font-mono text-[10px]">{b.label}</span>
                </div>

                {/* Stacked Bar */}
                <div
                  className="w-full max-w-[24px] bg-slate-200/80 rounded-t overflow-hidden flex flex-col justify-end transition-all duration-200"
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                >
                  {/* Critical: Rose-500 */}
                  {b.critical > 0 && (
                    <div
                      style={{ height: `${(b.critical / (b.count || 1)) * 100}%` }}
                      className="bg-rose-500"
                    />
                  )}
                  {/* Suspicious / High / Medium: Amber-500 */}
                  {b.high + b.medium > 0 && (
                    <div
                      style={{ height: `${((b.high + b.medium) / (b.count || 1)) * 100}%` }}
                      className="bg-amber-500"
                    />
                  )}
                  {/* Low / Benign: Blue-600 */}
                  {b.low > 0 && (
                    <div
                      style={{ height: `${(b.low / (b.count || 1)) * 100}%` }}
                      className="bg-blue-600"
                    />
                  )}
                </div>

                {/* X-axis Label indicator */}
                <span className="text-[9px] text-[#687d9a] font-mono mt-1.5 opacity-70">
                  {b.index % 3 === 0 ? b.label.replace(' ago', '') : ''}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FlowRateChart;
