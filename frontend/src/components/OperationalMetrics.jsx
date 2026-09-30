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
      <Card className="bg-[#1E2021] border border-[#303334] text-[#F1F0EA] shadow-none rounded-lg">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans font-medium uppercase tracking-wide text-[#A4A5A0]">Queue Drops</p>
            <p className={`text-xl font-mono font-bold mt-1 ${queueDrops > 0 ? 'text-[#C95F5F]' : 'text-[#F1F0EA]'}`}>
              <NumberTicker value={queueDrops} />
            </p>
            <p className="text-[11px] text-[#70736F] mt-0.5 font-sans">Drops when consumer queue limit (10k) hit</p>
          </div>
          <div className="p-2.5 rounded-lg border border-[#303334] bg-[#141516] text-[#A4A5A0]">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* Non-IP Filtered (Case A) */}
      <Card className="bg-[#1E2021] border border-[#303334] text-[#F1F0EA] shadow-none rounded-lg">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans font-medium uppercase tracking-wide text-[#A4A5A0]">Non-IP Filtered</p>
            <p className="text-xl font-mono font-bold text-[#F1F0EA] mt-1">
              <NumberTicker value={nonIpCount} />
            </p>
            <p className="text-[11px] text-[#70736F] mt-0.5 font-sans">Frames filtered (ARP, LLDP, STP)</p>
          </div>
          <div className="p-2.5 rounded-lg border border-[#303334] bg-[#141516] text-[#8CA4B8]">
            <Filter className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* Malformed Traffic (Case B) */}
      <Card className="bg-[#1E2021] border border-[#303334] text-[#F1F0EA] shadow-none rounded-lg">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans font-medium uppercase tracking-wide text-[#A4A5A0]">Malformed (Case B)</p>
            <p className="text-xl font-mono font-bold text-[#D0A05C] mt-1">
              <NumberTicker value={malformedCount} />
            </p>
            <p className="text-[11px] text-[#70736F] mt-0.5 font-sans">Evaluated via Heuristic engine</p>
          </div>
          <div className="p-2.5 rounded-lg border border-[#303334] bg-[#141516] text-[#D0A05C]">
            <Cpu className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default OperationalMetrics;
