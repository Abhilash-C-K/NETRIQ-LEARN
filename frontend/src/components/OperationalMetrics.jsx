import React from 'react';
import { Card, CardContent } from './ui/card';
import { AlertOctagon, Filter, Cpu } from 'lucide-react';
import { NumberTicker } from './ui/NumberTicker';

export const OperationalMetrics = ({ metrics }) => {
  const queueDrops = metrics?.queue_drop_count ?? 0;
  const nonIpCount = metrics?.non_ip_count ?? 0;
  const malformedCount = metrics?.malformed_ip_count ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Queue Overflow Drops */}
      <Card className="bg-white border border-slate-700 text-[#0a1c3d] shadow-xs rounded-xl hover:shadow-sm transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-wider text-slate-700">Queue Drops</p>
            <p className="text-2xl font-mono font-extrabold mt-1">
              <NumberTicker
                value={queueDrops}
                className={queueDrops > 0 ? 'text-rose-600' : 'text-slate-900'}
              />
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-sans">Drops when consumer queue limit (10k) hit</p>
          </div>
          <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-xs">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* Non-IP Filtered (Case A) */}
      <Card className="bg-white border border-slate-700 text-[#0a1c3d] shadow-xs rounded-xl hover:shadow-sm transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-wider text-slate-700">Non-IP Filtered</p>
            <p className="text-2xl font-mono font-extrabold text-slate-900 mt-1">
              <NumberTicker
                value={nonIpCount}
                className="text-slate-900"
              />
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-sans">Frames filtered (ARP, LLDP, STP)</p>
          </div>
          <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 shadow-xs">
            <Filter className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* Malformed Traffic (Case B) */}
      <Card className="bg-white border border-slate-700 text-[#0a1c3d] shadow-xs rounded-xl hover:shadow-sm transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-wider text-slate-700">Malformed (Case B)</p>
            <p className="text-2xl font-mono font-extrabold mt-1">
              <NumberTicker
                value={malformedCount}
                className={malformedCount > 0 ? 'text-amber-600' : 'text-slate-900'}
              />
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-sans">Evaluated via Heuristic engine</p>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-600 shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalMetrics;
