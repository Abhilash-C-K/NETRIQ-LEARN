import React from 'react';
import { Card, CardContent } from './ui/card';
import { AlertOctagon, Filter, Cpu } from 'lucide-react';
import { NumberTicker } from './ui/NumberTicker';
import { GlowHover } from './ui/GlowHover';

export const OperationalMetrics = ({ metrics }) => {
  const queueDrops = metrics?.queue_drop_count || 0;
  const nonIpCount = metrics?.non_ip_count || 0;
  const malformedCount = metrics?.malformed_ip_count || 0;

  const items = [
    {
      id: 'queue-drops',
      element: (
        <Card className={`border backdrop-blur-md shadow-md transition-all flex-1 min-w-[240px] ${queueDrops > 0 ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-slate-900/90 border-slate-800 text-slate-200'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Queue Overflow Drops</p>
              <p className={`text-2xl font-mono font-bold mt-1 ${queueDrops > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
                <NumberTicker value={queueDrops} />
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Packets dropped when consumer queue limit (10k) was hit</p>
            </div>
            <div className={`p-3 rounded-xl border ${queueDrops > 0 ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-slate-800/80 border-slate-700/80 text-slate-400'}`}>
              <AlertOctagon className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'non-ip',
      element: (
        <Card className="bg-slate-900/90 border-slate-800 text-slate-200 backdrop-blur-md shadow-md flex-1 min-w-[240px]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Non-IP Filtered (Case A)</p>
              <p className="text-2xl font-mono font-bold text-sky-400 mt-1">
                <NumberTicker value={nonIpCount} />
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Non-IPv4/v6 frames filtered out (ARP, LLDP, STP)</p>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Filter className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'malformed',
      element: (
        <Card className="bg-slate-900/90 border-slate-800 text-slate-200 backdrop-blur-md shadow-md flex-1 min-w-[240px]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Malformed Traffic (Case B)</p>
              <p className="text-2xl font-mono font-bold text-amber-400 mt-1">
                <NumberTicker value={malformedCount} />
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Corrupted packets evaluated via HeuristicFallback engine</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cpu className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <GlowHover items={items} className="flex flex-wrap gap-4" glowIntensity={0.2} maskSize={350} />
  );
};
