import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { SeverityBadge } from './SeverityBadge';
import { Network, Globe, Laptop, Router } from 'lucide-react';
import {
  getFriendlyDomainInfo,
  getDeviceInfo,
  getCachedDomain,
  setCachedDomain,
  requestIpReverseDns,
  isLocalPrivateIp,
} from '../utils/domain';
import { monitoringService } from '../services/monitoring';

export const ConnectionTable = ({
  entries,
  devices = [],
  selectedDevice = 'ALL',
  onSelectDevice,
  onFilterDevice,
}) => {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [localDeviceFilter, setLocalDeviceFilter] = useState('ALL');
  const [resolvedDns, setResolvedDns] = useState({});

  const activeDeviceFilter = onFilterDevice ? selectedDevice : localDeviceFilter;
  const setDeviceFilter = onFilterDevice || setLocalDeviceFilter;

  // Dynamically resolve real names for any Source or Destination IPs without DNS
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    const unresolvedIps = new Set();

    entries.forEach((item) => {
      const srcRaw = item.src_ip || item.flow_data?.src_ip || '';
      const dstRaw = item.dst_ip || item.flow_data?.dst_ip || '';
      const src = srcRaw.split(':')[0].trim();
      const dst = dstRaw.split(':')[0].trim();

      const srcDev = devices.find((d) => d.ip === src);
      if (src && !srcDev && !item.src_domain && !resolvedDns[src]) {
        unresolvedIps.add(src);
      }

      const dstDev = devices.find((d) => d.ip === dst);
      if (dst && !dstDev && !item.sni && !resolvedDns[dst]) {
        unresolvedIps.add(dst);
      }
    });

    if (unresolvedIps.size > 0) {
      const ipList = Array.from(unresolvedIps).slice(0, 40);
      monitoringService.resolveIpDnsBatch(ipList)
        .then((res) => {
          if (res && Object.keys(res).length > 0) {
            Object.entries(res).forEach(([ip, dom]) => {
              if (dom) setCachedDomain(ip, dom);
            });
            setResolvedDns((prev) => ({ ...prev, ...res }));
          }
        })
        .catch(() => {});
    }
  }, [entries, devices, resolvedDns]);

  const filteredEntries = entries.filter((item) => {
    const srcIp = item.src_ip || item.flow_data?.src_ip || '';
    const dstIp = item.dst_ip || item.flow_data?.dst_ip || '';

    // Filter by System / Device
    if (activeDeviceFilter !== 'ALL') {
      const match = srcIp.includes(activeDeviceFilter) || dstIp.includes(activeDeviceFilter);
      if (!match) return false;
    }

    if (filterSeverity === 'ALL') return true;
    const itemSeverity = (item.severity || item.risk_category || item.verdict?.risk_category || 'LOW').toUpperCase();
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
      <CardHeader className="flex flex-col gap-2.5 pb-3 border-b border-[#2A3944]">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
        </div>

        {/* Group by Connected System Filter Bar */}
        {devices && devices.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#2A3944]/40">
            <span className="text-[11px] font-semibold text-[#9AA8B2] mr-1">System Group:</span>
            <button
              type="button"
              onClick={() => setDeviceFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeDeviceFilter === 'ALL'
                  ? 'bg-[#202D36] text-[#E7ECEF] border border-[#3b4c5a]'
                  : 'bg-[#101820] text-[#9AA8B2] hover:text-[#E7ECEF] border border-[#2A3944]'
              }`}
            >
              All Systems ({entries.length})
            </button>
            {devices.map((dev) => {
              const count = entries.filter((e) => {
                const s = e.src_ip || e.flow_data?.src_ip || '';
                const d = e.dst_ip || e.flow_data?.dst_ip || '';
                return s.includes(dev.ip) || d.includes(dev.ip);
              }).length;

              const isSelected = activeDeviceFilter === dev.ip;

              return (
                <button
                  key={dev.ip}
                  type="button"
                  onClick={() => setDeviceFilter(isSelected ? 'ALL' : dev.ip)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-900/40 text-blue-300 border border-blue-500'
                      : 'bg-[#101820] text-[#9AA8B2] hover:text-[#E7ECEF] border border-[#2A3944]'
                  }`}
                  title={`${dev.label || dev.hostname} (${dev.ip})`}
                >
                  {dev.is_host ? (
                    <Laptop className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <Router className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span>{dev.hostname || dev.label}</span>
                  <span className="text-[10px] font-mono opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-[#9AA8B2] text-xs font-sans">
            No active connections matching current system or severity filters.
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
                  const riskCategory = (item.severity || item.risk_category || item.verdict?.risk_category || 'low').toLowerCase();
                  const action = item.action || item.decision?.action || 'NOTIFY';

                  const isHeuristic = modelUsed.toLowerCase().includes('heuristic');
                  const cleanSrcIp = srcIp.split(':')[0].trim();
                  const cleanDstIp = dstIp.split(':')[0].trim();
                  const srcDevice = devices.find((d) => srcIp.includes(d.ip) || cleanSrcIp === d.ip);
                  const dstDevice = devices.find((d) => dstIp.includes(d.ip) || cleanDstIp === d.ip);
                  const srcDomain = item.src_domain || resolvedDns[cleanSrcIp] || getCachedDomain(cleanSrcIp);
                  const dstDomain = sni || resolvedDns[cleanDstIp] || getCachedDomain(cleanDstIp);

                  return (
                    <tr key={item.id || idx} className="hover:bg-[#202D36] transition-colors">
                      <td className="py-2.5 px-4 text-[#9AA8B2] font-mono text-[11px]">{timestamp}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#E7ECEF] font-mono">
                        {srcDevice ? (
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              srcDevice.is_host 
                                ? 'bg-blue-950/60 text-blue-300 border-blue-500/40' 
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {srcDevice.is_host ? <Laptop className="w-2.5 h-2.5 text-blue-400" /> : <Router className="w-2.5 h-2.5 text-emerald-400" />}
                              <span>{srcDevice.hostname || srcDevice.label}</span>
                            </span>
                          </div>
                        ) : srcDomain ? (() => {
                          const info = getFriendlyDomainInfo(srcDomain);
                          return (
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-indigo-950/60 text-indigo-300 border-indigo-500/40">
                                <Globe className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                                <span className="truncate max-w-[150px]" title={info.raw}>{info.display}</span>
                                {info.alias && (
                                  <span className="text-[9px] font-normal px-1 rounded bg-[#202D36] text-[#cc5500] border border-[#3b4c5a]">
                                    {info.alias}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })() : (() => {
                          const isLocal = isLocalPrivateIp(cleanSrcIp);
                          return (
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-slate-800/80 text-slate-300 border-slate-600/40">
                                {isLocal ? <Laptop className="w-2.5 h-2.5 text-blue-400" /> : <Globe className="w-2.5 h-2.5 text-[#7895B2]" />}
                                <span>{isLocal ? 'Local LAN Node' : 'External Host'}</span>
                              </span>
                            </div>
                          );
                        })()}
                        {onSelectDevice ? (
                          <button
                            type="button"
                            onClick={() => onSelectDevice(srcIp)}
                            className="text-left font-mono hover:text-[#cc5500] hover:underline transition-colors focus:outline-none flex items-center gap-1 group cursor-pointer"
                            title={`View activity trail for ${srcIp}`}
                          >
                            <span className="group-hover:text-[#cc5500] font-semibold">{srcIp}</span>
                            <span className="text-[#687883] text-[11px] font-normal">:{srcPort}</span>
                          </button>
                        ) : (
                          <span>
                            {srcIp}:{srcPort}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        {dstDevice ? (
                          <div>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                dstDevice.is_host 
                                ? 'bg-blue-950/60 text-blue-300 border-blue-500/40' 
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              }`}>
                                {dstDevice.is_host ? <Laptop className="w-2.5 h-2.5 text-blue-400" /> : <Router className="w-2.5 h-2.5 text-emerald-400" />}
                                <span>{dstDevice.hostname || dstDevice.label}</span>
                              </span>
                            </div>
                            <span className="text-[10px] text-[#687883] block font-mono">
                              {dstIp}:{dstPort}
                            </span>
                          </div>
                        ) : dstDomain ? (() => {
                          const info = getFriendlyDomainInfo(dstDomain);
                          return (
                            <div>
                              <span className="flex items-center gap-1 text-[#7895B2] font-semibold">
                                <Globe className="w-3 h-3 text-[#7895B2] shrink-0" />
                                <span className="truncate max-w-[170px]" title={`${info.raw} (${dstIp})`}>{info.display}</span>
                                {info.alias && (
                                  <span className="text-[9px] font-normal px-1 rounded bg-[#202D36] text-[#cc5500] border border-[#3b4c5a] shrink-0">
                                    {info.alias}
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-[#687883] block">
                                {dstIp}:{dstPort}
                              </span>
                            </div>
                          );
                        })() : (() => {
                          const isLocalDst = isLocalPrivateIp(cleanDstIp);
                          return (
                            <div>
                              <span className="flex items-center gap-1 text-[#9AA8B2] font-semibold">
                                {isLocalDst ? <Router className="w-3 h-3 text-emerald-400 shrink-0" /> : <Globe className="w-3 h-3 text-[#7895B2] shrink-0" />}
                                <span>{isLocalDst ? 'Local Gateway / Node' : 'External Host'}</span>
                              </span>
                              <span className="text-[10px] text-[#687883] block">
                                {dstIp}:{dstPort}
                              </span>
                            </div>
                          );
                        })()}
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
