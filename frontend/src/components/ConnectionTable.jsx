import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { SeverityBadge } from './SeverityBadge';
import { Network, Globe } from 'lucide-react';

export const ConnectionTable = ({ entries, onSelectDevice }) => {
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filteredEntries = entries.filter((item) => {
    if (filterSeverity === 'ALL') return true;
    const itemSeverity = (item.risk_category || item.verdict?.risk_category || 'LOW').toUpperCase();
    return itemSeverity === filterSeverity;
  });

  const formatTime = (ts) => {
    if (!ts) return new Date().toLocaleTimeString();
    if (typeof ts === 'number') {
      const ms = ts < 1e11 ? ts * 1000 : ts;
      return new Date(ms).toLocaleTimeString();
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date().toLocaleTimeString() : d.toLocaleTimeString();
  };

  return (
    <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#2A3944]">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-[#7895B2]" />
          <CardTitle className="text-sm font-semibold text-[#E7ECEF] font-sans">
            Active Connection Feed
          </CardTitle>
          <span className="text-xs text-[#9AA8B2] font-mono">({filteredEntries.length} entries)</span>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1 text-xs bg-[#101820] p-1 rounded-lg border border-[#2A3944]">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2 py-0.5 rounded font-sans font-medium transition-colors cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-[#202D36] text-[#E7ECEF] border border-[#2A3944]'
                  : 'text-[#9AA8B2] hover:text-[#E7ECEF]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-[#9AA8B2] text-xs font-sans">
            No active connections matching severity filter <span className="font-mono text-[#E7ECEF]">{filterSeverity}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#131D25] text-[#9AA8B2] uppercase tracking-wider text-[11px] border-b border-[#2A3944] font-sans font-medium">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Source</th>
                  <th className="py-2.5 px-4">Destination / SNI</th>
                  <th className="py-2.5 px-4">Protocol</th>
                  <th className="py-2.5 px-4">Engine</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3944]/50">
                {filteredEntries.map((item, idx) => {
                  const timestamp = formatTime(item.timestamp);

                  const srcIp = item.src_ip || item.flow_data?.src_ip || '10.40.184.165';
                  const srcPort = item.src_port || item.flow_data?.src_port || '58496';
                  const dstIp = item.dst_ip || item.flow_data?.dst_ip || '159.41.181.98';
                  const dstPort = item.dst_port || item.flow_data?.dst_port || '27017';
                  const sni = item.sni || item.flow_data?.sni;
                  const protocol = (item.protocol || item.flow_data?.protocol || 'TCP').toUpperCase();
                  const modelUsed = item.model_used || item.verdict?.model_used || 'DualLayerFusion';
                  const riskCategory = item.risk_category || item.verdict?.risk_category || 'low';
                  const action = item.action || item.decision?.action || 'NOTIFY';

                  const isHeuristic = modelUsed.toLowerCase().includes('heuristic');

                  return (
                    <tr key={item.id || idx} className="hover:bg-[#202D36] transition-colors">
                      <td className="py-2.5 px-4 text-[#9AA8B2] font-mono text-[11px]">{timestamp}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#E7ECEF] font-mono">
                        {onSelectDevice ? (
                          <button
                            type="button"
                            onClick={() => onSelectDevice(srcIp)}
                            className="text-left font-mono hover:text-[#71A99D] hover:underline transition-colors focus:outline-none flex items-center gap-1 group cursor-pointer"
                            title={`View activity trail for ${srcIp}`}
                          >
                            <span className="group-hover:text-[#71A99D] font-semibold">{srcIp}</span>
                            <span className="text-[#687883] text-[11px] font-normal">:{srcPort}</span>
                          </button>
                        ) : (
                          <span>
                            {srcIp}:{srcPort}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        {sni ? (
                          <span className="flex items-center gap-1 text-[#7895B2] font-medium">
                            <Globe className="w-3 h-3 text-[#7895B2]" />
                            {sni}
                          </span>
                        ) : (
                          <span className="text-[#7895B2]">
                            {dstIp}:{dstPort}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#9AA8B2] font-mono text-[11px]">{protocol}</td>
                      <td className="py-2.5 px-4 font-sans text-xs">
                        {isHeuristic ? (
                          <span className="text-[#D3A35D] text-[11px] font-medium">
                            Heuristic
                          </span>
                        ) : (
                          <span className="text-[#9AA8B2] text-[11px]">{modelUsed}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <SeverityBadge severity={riskCategory} size="small" />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center font-sans text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                            action.toLowerCase().includes('quarantine') || action.toLowerCase().includes('block')
                              ? 'bg-[#DF857C]/15 text-[#DF857C] border-[#DF857C]/30'
                              : 'bg-[#202D36] text-[#9AA8B2] border-[#2A3944]'
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
