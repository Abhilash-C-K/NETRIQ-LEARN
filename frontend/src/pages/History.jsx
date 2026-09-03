import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { SeverityBadge } from '../components/SeverityBadge';
import { historyService } from '../services/history';
import { useAuth } from '../context/AuthContext';
import {
  History as HistoryIcon,
  RefreshCw,
  Download,
  Filter,
  Lock,
  Server,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const History = () => {
  const { hasCapability, role } = useAuth();
  const canViewLogs = hasCapability('VIEW_RAW_LOGS') || role === 'admin' || role === 'analyst';

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [severity, setSeverity] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    if (!canViewLogs) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await historyService.getRawLogs({
        severity,
        limit,
        offset,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load raw logs:', err);
      setError('Unable to retrieve raw traffic logs.');
    } finally {
      setIsLoading(false);
    }
  }, [canViewLogs, severity, offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Source IP', 'Source Port', 'Destination IP', 'Destination Port', 'Protocol', 'SNI', 'Severity', 'Action'];
    const rows = logs.map((log) => [
      new Date((log.timestamp || 0) * 1000).toISOString(),
      log.src_ip || '',
      log.src_port || '',
      log.dst_ip || '',
      log.dst_port || '',
      log.protocol || '',
      log.sni || '',
      log.severity || '',
      log.action || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `netriq_traffic_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (ts) => {
    if (!ts) return 'N/A';
    const ms = ts < 1e11 ? ts * 1000 : ts;
    return new Date(ms).toLocaleTimeString();
  };

  if (!canViewLogs) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
              <HistoryIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">Traffic History & Raw Logs</h1>
              <p className="text-xs text-slate-400">Historical database log of analyzed network flows and threat verdicts.</p>
            </div>
          </div>
        </div>

        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl space-y-4 max-w-xl mx-auto">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-rose-400">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-200">Raw Log Access Restricted</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current role (<span className="text-cyan-400 font-mono font-semibold uppercase">{role || 'Viewer'}</span>) does not have the <span className="font-mono text-purple-300">VIEW_RAW_LOGS</span> capability. Non-privileged sessions can review sanitized summaries in the Smart Summary and Threat Management views.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Traffic History & Raw Logs</h1>
            <p className="text-xs text-slate-400">Historical audit trail of all evaluated packet flows stored in MongoDB.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="text-xs border-slate-700 hover:bg-slate-800 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-950/40"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Severity Filter:</span>
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSeverity(s);
                    setOffset(0);
                  }}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    severity === s
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pagination Navigation */}
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>SHOWING {offset + 1} - {offset + logs.length}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || isLoading}
                onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                className="h-7 w-7 p-0 border-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={logs.length < limit || isLoading}
                onClick={() => setOffset((prev) => prev + limit)}
                className="h-7 w-7 p-0 border-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Querying historical flow records...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
          <p>{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-200">No Records Found</h4>
          <p className="text-xs text-slate-500">No flow logs match the active filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-md">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Destination / SNI</th>
                <th className="py-3 px-4">Protocol</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {logs.map((log, idx) => (
                <tr key={log.id || idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-400">{formatTime(log.timestamp)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {log.src_ip || 'N/A'}:{log.src_port || 0}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-cyan-400 font-semibold">{log.dst_ip || 'N/A'}</span>
                    {log.dst_port ? `:${log.dst_port}` : ''}
                    {log.sni && (
                      <span className="block text-[11px] text-purple-300 font-normal">
                        SNI: {log.sni}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 uppercase">{log.protocol || 'IP'}</td>
                  <td className="py-3 px-4">
                    <SeverityBadge severity={log.severity} />
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] uppercase">
                      {log.action || 'NOTIFY'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default History;
