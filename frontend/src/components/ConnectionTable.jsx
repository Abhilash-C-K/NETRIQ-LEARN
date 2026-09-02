import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { SeverityBadge } from './SeverityBadge';
import { Network, Globe, ArrowRight, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

export const ConnectionTable = ({ entries }) => {
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filteredEntries = entries.filter((item) => {
    if (filterSeverity === 'ALL') return true;
    const itemSeverity = (item.risk_category || item.verdict?.risk_category || 'LOW').toUpperCase();
    return itemSeverity === filterSeverity;
  });

  return (
    <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" />
          <CardTitle className="text-base font-bold text-slate-100">
            Active Connection Feed
          </CardTitle>
          <span className="text-xs text-slate-400 font-mono">({filteredEntries.length} entries)</span>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filterSeverity === sev
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No active connections matching severity filter <span className="font-mono text-slate-400">{filterSeverity}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 font-mono border-collapse">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Source</th>
                  <th className="py-2.5 px-4 font-semibold">Destination / SNI</th>
                  <th className="py-2.5 px-4 font-semibold">Protocol</th>
                  <th className="py-2.5 px-4 font-semibold">Model Engine</th>
                  <th className="py-2.5 px-4 font-semibold">Severity</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.map((item, idx) => {
                  const timestamp = item.timestamp
                    ? new Date(item.timestamp * 1000).toLocaleTimeString()
                    : new Date().toLocaleTimeString();

                  const srcIp = item.src_ip || item.flow_data?.src_ip || '192.168.1.100';
                  const srcPort = item.src_port || item.flow_data?.src_port || '49152';
                  const dstIp = item.dst_ip || item.flow_data?.dst_ip || '198.51.100.1';
                  const dstPort = item.dst_port || item.flow_data?.dst_port || '443';
                  const sni = item.sni || item.flow_data?.sni;
                  const protocol = (item.protocol || item.flow_data?.protocol || 'TCP').toUpperCase();
                  const modelUsed = item.model_used || item.verdict?.model_used || 'HybridEnsemble';
                  const riskCategory = item.risk_category || item.verdict?.risk_category || 'low';
                  const action = item.action || item.decision?.action || 'NOTIFY';

                  const isHeuristic = modelUsed.toLowerCase().includes('heuristic');

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400">{timestamp}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-200">
                        {srcIp}:{srcPort}
                      </td>
                      <td className="py-2.5 px-4">
                        {sni ? (
                          <span className="flex items-center gap-1 text-cyan-300 font-sans font-medium">
                            <Globe className="w-3.5 h-3.5 text-cyan-400" />
                            {sni}
                          </span>
                        ) : (
                          <span className="text-slate-300">
                            {dstIp}:{dstPort}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{protocol}</td>
                      <td className="py-2.5 px-4">
                        {isHeuristic ? (
                          <span className="flex items-center gap-1 text-amber-400 font-sans text-[11px] font-semibold">
                            <Cpu className="w-3.5 h-3.5" />
                            Case B Heuristic
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans text-[11px]">{modelUsed}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <SeverityBadge severity={riskCategory} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-sans text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${
                            action.toLowerCase().includes('block')
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : action.toLowerCase().includes('quarantine')
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {action}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
