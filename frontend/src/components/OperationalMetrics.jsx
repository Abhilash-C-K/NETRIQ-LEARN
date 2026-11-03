import React from 'react';
import { Card, CardContent } from './ui/card';
import { AlertOctagon, Filter, Cpu } from 'lucide-react';
import { NumberTicker } from './ui/NumberTicker';

export const OperationalMetrics = ({ metrics }) => {
  const queueDrops = metrics?.queue_drop_count || 0;
  const nonIpCount = metrics?.non_ip_count || 0;
  const malformedCount = metrics?.malformed_ip_count || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Queue Overflow Drops */}
      <Card className="bg-white border border-[#e2eaf4] text-[#0a1c3d] shadow-xs rounded-xl hover:shadow-sm transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans font-semibold uppercase tracking-wider text-[#687d9a]">Queue Drops</p>
            <p className={`text-2xl font-mono font-bold mt-1 ${queueDrops > 0 ? 'text-rose-600' : 'text-[#0a1c3d]'}`}>
              <NumberTicker value={queueDrops} />
            </p>
            <p className="text-[11px] text-[#687d9a] mt-0.5 font-sans">Drops when consumer queue limit (10k) hit</p>
          </div>
          <div className="p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 shadow-xs">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* Non-IP Filtered (Case A) */}
      <Card className="bg-white border border-[#e2eaf4] text-[#0a1c3d] shadow-xs rounded-xl hover:shadow-sm transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans font-semibold uppercase tracking-wider text-[#687d9a]">Non-IP Filtered</p>
            <p className="text-2xl font-mono font-bold text-[#0a1c3d] mt-1">
              <NumberTicker value={nonIpCount} />
            </p>
            <p className="text-[11px] text-[#687d9a] mt-0.5 font-sans">Frames filtered (ARP, LLDP, STP)</p>
          </div>
          <div className="p-2.5 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-xs">
            <Filter className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* Malformed Traffic (Case B) */}
      <Card className="bg-white border border-[#e2eaf4] text-[#0a1c3d] shadow-xs rounded-xl hover:shadow-sm transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans font-semibold uppercase tracking-wider text-[#687d9a]">Malformed (Case B)</p>
            <p className={`text-2xl font-mono font-bold mt-1 ${malformedCount > 0 ? 'text-amber-600' : 'text-[#0a1c3d]'}`}>
              <NumberTicker value={malformedCount} />
            </p>
            <p className="text-[11px] text-[#687d9a] mt-0.5 font-sans">Evaluated via Heuristic engine</p>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-100 bg-amber-50 text-amber-600 shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalMetrics;
