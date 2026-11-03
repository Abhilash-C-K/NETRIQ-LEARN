import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SeverityBadge } from './SeverityBadge';
import { historyService } from '../services/history';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Laptop,
  Globe,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';

export const DeviceActivityDrawer = ({ isOpen, onClose, srcIp }) => {
  const { role } = useAuth();
  const [trail, setTrail] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [timeWindow, setTimeWindow] = useState('ALL'); // 24h, 7d, ALL
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const fetchTrail = useCallback(async () => {
    if (!srcIp) return;
    try {
      setIsLoading(true);
      setError(null);

      let startTime = null;
      const nowSec = Date.now() / 1000;
      if (timeWindow === '24h') {
        startTime = nowSec - 24 * 3600;
      } else if (timeWindow === '7d') {
        startTime = nowSec - 7 * 24 * 3600;
      }

      const data = await historyService.getDeviceActivity(srcIp, {
        limit: 100,
        severity: filterSeverity,
        startTime,
      });
      setTrail(data || []);
    } catch (err) {
      console.error('Failed to load device activity trail:', err);
      setError('Unable to fetch device historical trail.');
    } finally {
      setIsLoading(false);
    }
  }, [srcIp, timeWindow, filterSeverity]);

  useEffect(() => {
    if (isOpen && srcIp) {
      fetchTrail();
    } else {
      setTrail([]);
      setError(null);
    }
  }, [isOpen, srcIp, fetchTrail]);

  const handleCopyIp = () => {
    if (!srcIp) return;
    navigator.clipboard.writeText(srcIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group items by day (Newest First)
  const groupedByDay = useMemo(() => {
    const groups = {};
    const today = new Date().toDateString();
    const yesterdayDate = new Date(Date.now() - 86400000).toDateString();

    trail.forEach((item) => {
      const ts = item.timestamp ? (item.timestamp < 1e11 ? item.timestamp * 1000 : item.timestamp) : Date.now();
      const dateObj = new Date(ts);
      const dateStr = dateObj.toDateString();

      let displayLabel = dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      if (dateStr === today) {
        displayLabel = `Today • ${dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      } else if (dateStr === yesterdayDate) {
        displayLabel = `Yesterday • ${dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      }

      if (!groups[displayLabel]) {
        groups[displayLabel] = [];
      }
      groups[displayLabel].push(item);
    });

    return groups;
  }, [trail]);

  // Dynamic Metrics derived from trail
  const metrics = useMemo(() => {
    const totalEvents = trail.length;
    const destinations = new Set();
    let enforcementCount = 0;
    let highestSev = 'LOW';
    const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

    trail.forEach((item) => {
      if (item.dst_ip) destinations.add(item.dst_ip);
      if (item.sni) destinations.add(item.sni);

      const action = (item.action || item.action_taken || '').toUpperCase();
      if (action.includes('QUARANTINE') || action.includes('BLOCK')) {
        enforcementCount++;
      }

      const sev = (item.severity || 'LOW').toUpperCase();
      if ((severityRank[sev] || 0) > (severityRank[highestSev] || 0)) {
        highestSev = sev;
      }
    });

    return {
      totalEvents,
      distinctDestinations: destinations.size,
      enforcementCount,
      highestSev: totalEvents > 0 ? highestSev : 'NONE',
    };
  }, [trail]);

  const formatClockTime = (ts) => {
    if (!ts) return 'N/A';
    const ms = ts < 1e11 ? ts * 1000 : ts;
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl h-full bg-white border-l border-[#C1E8FF] shadow-2xl text-[#0a1c3d] flex flex-col overflow-hidden">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#C1E8FF] bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-[#C1E8FF] text-blue-600 shadow-xs">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-[#0a1c3d]">{srcIp || 'Unknown Device'}</span>
                <button
                  onClick={handleCopyIp}
                  title="Copy IP address"
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                </button>
                {role === 'viewer' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Viewer (Metadata-Only)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#687d9a] mt-0.5 font-sans">
                Historical Connection & Intrusion Activity Trail
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTrail}
              disabled={isLoading}
              title="Refresh trail"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Metric Header */}
        <div className="p-5 bg-[#f8fafc] border-b border-[#C1E8FF] space-y-4">
          <div className="grid grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-[#C1E8FF] shadow-xs">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#687d9a] block mb-1">TOTAL EVENTS</span>
              <span className="font-mono text-lg font-bold text-[#0a1c3d]">{metrics.totalEvents}</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#C1E8FF] shadow-xs">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#687d9a] block mb-1">DISTINCT TARGETS</span>
              <span className="font-mono text-lg font-bold text-blue-600">{metrics.distinctDestinations}</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#C1E8FF] shadow-xs">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#687d9a] block mb-1">ENFORCEMENTS</span>
              <span className={`font-mono text-lg font-bold ${metrics.enforcementCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {metrics.enforcementCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#C1E8FF] shadow-xs">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#687d9a] block mb-1">MAX SEVERITY</span>
              {metrics.highestSev !== 'NONE' ? (
                <div className="pt-0.5">
                  <SeverityBadge severity={metrics.highestSev} size="small" />
                </div>
              ) : (
                <span className="font-mono text-xs text-slate-400">N/A</span>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-sans">
            {/* Time Window Buttons */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#C1E8FF] shadow-xs">
              <span className="text-[#687d9a] px-1 text-[11px] font-semibold uppercase">WINDOW:</span>
              {[
                { id: '24h', label: '24h' },
                { id: '7d', label: '7 Days' },
                { id: 'ALL', label: 'All Retained' },
              ].map((w) => (
                <button
                  key={w.id}
                  onClick={() => setTimeWindow(w.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    timeWindow === w.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-300 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            {/* Severity Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#C1E8FF] shadow-xs">
              <span className="text-[#687d9a] px-1 text-[11px] font-semibold uppercase">SEV:</span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    filterSeverity === sev
                      ? 'bg-blue-50 text-blue-700 border border-blue-300 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Body — Chronological Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono">Loading activity trail for {srcIp}...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs space-y-2">
              <AlertTriangle className="w-6 h-6 mx-auto text-rose-600" />
              <p>{error}</p>
            </div>
          ) : trail.length === 0 ? (
            <div className="py-20 text-center bg-[#f8fafc] border border-[#C1E8FF] rounded-2xl space-y-3 p-8">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-[#0a1c3d]">No Historical Activity Recorded</h4>
              <p className="text-xs text-[#687d9a] max-w-sm mx-auto">
                No network flows or threat records matching <span className="text-slate-900 font-bold font-mono">{srcIp}</span> found in the retention window.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {trail.length === 1 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-sans flex items-center gap-2">
                  <Activity className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>Single isolated observation recorded in the active query window.</span>
                </div>
              )}

              {Object.entries(groupedByDay).map(([dayLabel, entries]) => (
                <div key={dayLabel} className="space-y-3">
                  {/* Day Divider Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-sans font-bold uppercase tracking-wider text-slate-700 bg-white px-2.5 py-1 rounded-full border border-[#C1E8FF] shadow-xs">
                      {dayLabel}
                    </span>
                    <div className="flex-1 h-px bg-[#C1E8FF]" />
                    <span className="text-[11px] font-sans text-slate-500">
                      {entries.length} {entries.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  {/* Events in Day */}
                  <div className="space-y-2 relative before:absolute before:top-2 before:bottom-2 before:left-[19px] before:w-[2px] before:bg-[#C1E8FF]">
                    {entries.map((item, idx) => {
                      const action = (item.action || item.action_taken || 'NOTIFY').toUpperCase();
                      const isQuarantined = action.includes('QUARANTINE');
                      const isBlock = action.includes('BLOCK');
                      const sni = item.sni;
                      const dst = `${item.dst_ip || 'N/A'}${item.dst_port ? `:${item.dst_port}` : ''}`;

                      return (
                        <div
                          key={item.id || idx}
                          className="relative pl-10 group"
                        >
                          {/* Timeline node icon */}
                          <div
                            className={`absolute left-2.5 top-3.5 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 flex items-center justify-center transition-all ${
                              isQuarantined
                                ? 'border-rose-500 bg-rose-500 text-white shadow-xs'
                                : isBlock
                                ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                                : 'border-blue-500 bg-white text-blue-600 shadow-xs'
                            }`}
                          />

                          {/* Event Card */}
                          <div className="p-3.5 rounded-xl bg-white border border-[#C1E8FF] hover:border-blue-400 shadow-xs transition-all space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 font-mono text-xs">
                                <span className="text-slate-500 font-semibold">{formatClockTime(item.timestamp)}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border border-[#C1E8FF] text-slate-700 font-semibold uppercase">
                                  {item.protocol || 'TCP'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <SeverityBadge severity={item.severity} size="small" />
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider ${
                                    isQuarantined
                                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                                      : isBlock
                                      ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                      : 'bg-slate-100 border border-slate-200 text-slate-700'
                                  }`}
                                >
                                  {action === 'NOTIFY' ? 'PASS / NOTIFY' : action}
                                </span>
                              </div>
                            </div>

                            {/* Destination & Target Details */}
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="text-slate-400 text-[11px]">TARGET:</span>
                              {sni ? (
                                <span className="flex items-center gap-1.5 text-blue-700 font-bold hover:underline">
                                  <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  {sni}
                                </span>
                              ) : (
                                <span className="text-slate-900 font-bold">{dst}</span>
                              )}

                              {sni && (
                                <span className="text-slate-400 text-[11px] ml-auto">
                                  ({dst})
                                </span>
                              )}
                            </div>

                            {/* Model / Verdict Attribution */}
                            {item.prediction && item.prediction !== 'BENIGN' && (
                              <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                <span>Verdict:</span>
                                <span className="text-rose-700 font-bold">{item.prediction}</span>
                                {item.confidence > 0 && (
                                  <span className="text-slate-400">
                                    ({(item.confidence * 100).toFixed(0)}% confidence)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#C1E8FF] bg-[#f8fafc] flex items-center justify-between text-xs font-sans text-[#687d9a]">
          <span>Showing up to 100 chronological records</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-[#C1E8FF] rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceActivityDrawer;
