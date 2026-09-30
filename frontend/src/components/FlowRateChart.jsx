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
    <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#2A3944]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#7895B2]" />
          <CardTitle className="text-sm font-semibold text-[#E7ECEF] font-sans">
            Real-Time Flow Throughput (60s Window)
          </CardTitle>
        </div>

        {/* Legend matching NetrIQ specification */}
        <div className="flex items-center gap-4 text-xs font-sans">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-[#DF857C] inline-block" />
            <span className="text-[#9AA8B2]">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-[#D3A35D] inline-block" />
            <span className="text-[#9AA8B2]">Suspicious</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-[#7895B2] inline-block" />
            <span className="text-[#9AA8B2]">Normal</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* SVG Bar Chart Container */}
        <div className="h-36 w-full flex items-end justify-between gap-2 pt-4 px-3 bg-[#101820] rounded-lg border border-[#2A3944]">
          {chartData.buckets.map((b) => {
            const heightPct = Math.min((b.count / chartData.maxCount) * 100, 100);

            return (
              <div key={b.index} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on Hover */}
                <div className="absolute -top-9 hidden group-hover:flex flex-col items-center bg-[#19242E] border border-[#2A3944] text-[11px] px-2 py-0.5 rounded shadow-none whitespace-nowrap z-20">
                  <span className="font-semibold text-[#E7ECEF]">{b.count} flows</span>
                  <span className="text-[#9AA8B2] font-mono text-[10px]">{b.label}</span>
                </div>

                {/* Stacked Bar */}
                <div
                  className="w-full max-w-[24px] bg-[#202D36] rounded-t overflow-hidden flex flex-col justify-end transition-all duration-200"
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                >
                  {/* Critical: #DF857C */}
                  {b.critical > 0 && (
                    <div
                      style={{ height: `${(b.critical / (b.count || 1)) * 100}%` }}
                      className="bg-[#DF857C]"
                    />
                  )}
                  {/* Suspicious / High / Medium: #D3A35D */}
                  {b.high + b.medium > 0 && (
                    <div
                      style={{ height: `${((b.high + b.medium) / (b.count || 1)) * 100}%` }}
                      className="bg-[#D3A35D]"
                    />
                  )}
                  {/* Normal: #7895B2 */}
                  {b.low > 0 && (
                    <div
                      style={{ height: `${(b.low / (b.count || 1)) * 100}%` }}
                      className="bg-[#7895B2]"
                    />
                  )}
                </div>

                {/* X Axis Label */}
                <span className="text-[10px] text-[#687883] font-mono mt-2 truncate w-full text-center">
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
