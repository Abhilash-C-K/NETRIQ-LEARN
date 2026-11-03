import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { SeverityBadge } from './SeverityBadge';
import { Network, Globe, Laptop, Router, Smartphone, Server } from 'lucide-react';
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
    <Card className="bg-white border border-slate-700 text-[#0a1c3d] shadow-xs rounded-xl overflow-hidden">
      <CardHeader className="flex flex-col gap-3 pb-3 border-b border-slate-300 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-[#0a1c3d] font-sans">
              Active Connection Feed
            </CardTitle>
            <span className="text-xs text-[#687d9a] font-medium font-sans">({filteredEntries.length} entries)</span>
          </div>

          {/* Severity Filter Pills */}
          <div className="flex items-center gap-1 text-xs bg-[#f1f5f9] p-1 rounded-lg border border-slate-400">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-0.5 rounded-md font-sans text-xs transition-colors cursor-pointer ${
                  filterSeverity === sev
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-400 font-semibold'
                    : 'text-[#687d9a] hover:text-[#0a1c3d] font-medium'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Group by Connected System Filter Bar */}
        {devices && devices.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-300">
            <span className="text-[11px] font-bold text-[#687d9a] uppercase tracking-wider mr-1">System Group:</span>
            <button
              type="button"
              onClick={() => setDeviceFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                activeDeviceFilter === 'ALL'
                  ? 'bg-blue-50 text-blue-700 border border-blue-400 font-semibold shadow-xs'
                  : 'bg-[#f8fafc] text-slate-700 hover:bg-slate-100 border border-slate-400 font-medium'
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
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 border border-blue-400 font-semibold shadow-xs'
                      : 'bg-[#f8fafc] text-slate-700 hover:bg-slate-100 border border-slate-400 font-medium'
                  }`}
                  title={`${dev.label || dev.hostname} (${dev.ip})`}
                >
                  {dev.is_gateway || dev.type === 'router' ? (
                    <Router className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                  ) : dev.type === 'mobile' || dev.type === 'smartphone' ? (
                    <Smartphone className="w-3.5 h-3.5 text-[#034466] shrink-0" />
                  ) : dev.type === 'server' || dev.type === 'iot' ? (
                    <Server className="w-3.5 h-3.5 text-[#0747a1] shrink-0" />
                  ) : (
                    <Laptop className="w-3.5 h-3.5 text-[#065A72] shrink-0" />
                  )}
                  <span>{dev.hostname || dev.label}</span>
                  <span className="text-[10px] font-mono text-[#687d9a]">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-[#687d9a] text-xs font-sans">
            No active connections matching current system or severity filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f8fafc] text-[#687d9a] uppercase tracking-wider text-[11px] border-b border-slate-300 font-sans font-semibold">
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
              <tbody className="divide-y divide-slate-200 bg-white">
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
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 text-[#687d9a] font-mono text-[11px]">{timestamp}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#0a1c3d] font-mono">
                        {srcDevice ? (
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              srcDevice.is_gateway || srcDevice.type === 'router'
                                ? 'bg-zinc-950 text-white border-zinc-700'
                                : srcDevice.type === 'mobile' || srcDevice.type === 'smartphone'
                                ? 'bg-[#C1E8FF] text-[#034466] border-[#7EC5F2]'
                                : srcDevice.type === 'server' || srcDevice.type === 'iot'
                                ? 'bg-[#0747a1] text-white border-[#0747a1]'
                                : 'bg-[#065A72] text-white border-[#065A72]'
                            }`}>
                              {srcDevice.is_gateway || srcDevice.type === 'router' ? (
                                <Router className="w-2.5 h-2.5 text-white" />
                              ) : srcDevice.type === 'mobile' || srcDevice.type === 'smartphone' ? (
                                <Smartphone className="w-2.5 h-2.5 text-[#034466]" />
                              ) : srcDevice.type === 'server' || srcDevice.type === 'iot' ? (
                                <Server className="w-2.5 h-2.5 text-white" />
                              ) : (
                                <Laptop className="w-2.5 h-2.5 text-white" />
                              )}
                              <span>{srcDevice.hostname || srcDevice.label}</span>
                            </span>
                          </div>
                        ) : srcDomain ? (() => {
                          const info = getFriendlyDomainInfo(srcDomain);
                          return (
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-300">
                                <Globe className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                <span className="truncate max-w-[150px]" title={info.raw}>{info.display}</span>
                                {info.alias && (
                                  <span className="text-[9px] font-normal px-1 rounded bg-indigo-100 text-indigo-800">
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
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-slate-100 text-slate-700 border-slate-300">
                                {isLocal ? <Laptop className="w-2.5 h-2.5 text-[#065A72]" /> : <Globe className="w-2.5 h-2.5 text-slate-500" />}
                                <span>{isLocal ? 'Local LAN Node' : 'External Host'}</span>
                              </span>
                            </div>
                          );
                        })()}
                        {onSelectDevice ? (
                          <button
                            type="button"
                            onClick={() => onSelectDevice(srcIp)}
                            className="text-left font-mono hover:text-blue-600 hover:underline transition-colors focus:outline-none flex items-center gap-1 group cursor-pointer"
                            title={`View activity trail for ${srcIp}`}
                          >
                            <span className="group-hover:text-blue-600 font-bold text-slate-900">{srcIp}</span>
                            <span className="text-slate-400 text-[11px] font-normal">:{srcPort}</span>
                          </button>
                        ) : (
                          <span>
                            <span className="text-slate-900 font-bold">{srcIp}</span>
                            <span className="text-slate-400 text-[11px] font-normal">:{srcPort}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        {dstDevice ? (
                          <div>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                dstDevice.is_gateway || dstDevice.type === 'router'
                                  ? 'bg-zinc-950 text-white border-zinc-700'
                                  : dstDevice.type === 'mobile' || dstDevice.type === 'smartphone'
                                  ? 'bg-[#C1E8FF] text-[#034466] border-[#7EC5F2]'
                                  : dstDevice.type === 'server' || dstDevice.type === 'iot'
                                  ? 'bg-[#0747a1] text-white border-[#0747a1]'
                                  : 'bg-[#065A72] text-white border-[#065A72]'
                              }`}>
                                {dstDevice.is_gateway || dstDevice.type === 'router' ? (
                                  <Router className="w-2.5 h-2.5 text-white" />
                                ) : dstDevice.type === 'mobile' || dstDevice.type === 'smartphone' ? (
                                  <Smartphone className="w-2.5 h-2.5 text-[#034466]" />
                                ) : dstDevice.type === 'server' || dstDevice.type === 'iot' ? (
                                  <Server className="w-2.5 h-2.5 text-white" />
                                ) : (
                                  <Laptop className="w-2.5 h-2.5 text-white" />
                                )}
                                <span>{dstDevice.hostname || dstDevice.label}</span>
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              {dstIp}:{dstPort}
                            </span>
                          </div>
                        ) : dstDomain ? (() => {
                          const info = getFriendlyDomainInfo(dstDomain);
                          return (
                            <div>
                              <span className="flex items-center gap-1 text-slate-800 font-semibold">
                                <Globe className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span className="truncate max-w-[170px]" title={`${info.raw} (${dstIp})`}>{info.display}</span>
                                {info.alias && (
                                  <span className="text-[9px] font-normal px-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-300 shrink-0">
                                    {info.alias}
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {dstIp}:{dstPort}
                              </span>
                            </div>
                          );
                        })() : (() => {
                          const isLocalDst = isLocalPrivateIp(cleanDstIp);
                          return (
                            <div>
                              <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                {isLocalDst ? <Router className="w-3 h-3 text-emerald-600 shrink-0" /> : <Globe className="w-3 h-3 text-slate-500 shrink-0" />}
                                <span>{isLocalDst ? 'Local Gateway / Node' : 'External Host'}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {dstIp}:{dstPort}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-mono text-[11px] font-semibold">{protocol}</td>
                      <td className="py-2.5 px-4 font-sans text-xs">
                        {isHeuristic ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                            Heuristic
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">{modelUsed}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <SeverityBadge severity={riskCategory} size="small" />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center font-sans text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            action.toLowerCase().includes('quarantine') || action.toLowerCase().includes('block')
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
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

export default ConnectionTable;
