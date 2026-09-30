import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { SeverityBadge } from '../components/SeverityBadge';
import { DeviceActivityDrawer } from '../components/DeviceActivityDrawer';
import { historyService } from '../services/history';
import { useAuth } from '../context/AuthContext';
import {
  History as HistoryIcon,
  RefreshCw,
  Download,
  Filter,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowDown,
} from 'lucide-react';

export const History = () => {
  const { hasCapability, role } = useAuth();
  const canViewLogs = hasCapability('VIEW_RAW_LOGS') || role === 'admin' || role === 'analyst';

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDeviceIp, setSelectedDeviceIp] = useState(null);

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

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.map((h) => `"${h}"`).join(','),
        ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
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
      <div className="space-y-5">
        <div className="flex items-center justify-between bg-[#19242E] border border-[#2A3944] p-5 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2]">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#E7ECEF] font-sans">Traffic History</h1>
              <p className="text-xs text-[#9AA8B2] font-sans">Historical log of analyzed network flows and threat verdicts.</p>
            </div>
          </div>
        </div>

        <div className="p-12 text-center bg-[#19242E] border border-[#2A3944] rounded-lg space-y-3 max-w-xl mx-auto">
          <div className="p-3 bg-[#DF857C]/15 border border-[#DF857C]/30 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-[#DF857C]">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#E7ECEF] font-sans">Raw Log Access Restricted</h3>
          <p className="text-xs text-[#9AA8B2] leading-relaxed font-sans">
            Your current role (<span className="text-[#7895B2] font-mono uppercase">{role || 'Viewer'}</span>) does not have the VIEW_RAW_LOGS capability. Non-privileged sessions can review sanitized summaries in Smart Summary.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#19242E] border border-[#2A3944] p-5 rounded-lg shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2]">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#E7ECEF] font-sans">Traffic History</h1>
            <p className="text-xs text-[#9AA8B2] font-sans">Historical audit trail of evaluated packet flows stored in MongoDB</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="text-xs border-[#2A3944] bg-[#101820] hover:bg-[#202D36] text-[#E7ECEF] flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="text-xs bg-[#71A99D] hover:bg-[#60958a] text-[#101820] font-sans font-semibold h-8 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter & Pagination Bar */}
      <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
        <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Filter className="w-4 h-4 text-[#9AA8B2]" />
            <span className="text-xs text-[#9AA8B2] font-sans font-medium">Severity:</span>
            <div className="flex items-center gap-1 bg-[#101820] p-1 rounded-lg border border-[#2A3944] text-xs font-sans">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSeverity(s);
                    setOffset(0);
                  }}
                  className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    severity === s
                      ? 'bg-[#202D36] text-[#E7ECEF] border border-[#2A3944]'
                      : 'text-[#9AA8B2] hover:text-[#E7ECEF]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pagination Navigation */}
          <div className="flex items-center gap-3 text-xs text-[#9AA8B2] font-mono">
            <span>SHOWING {offset + 1} - {offset + logs.length}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || isLoading}
                onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                className="h-7 w-7 p-0 border-[#2A3944] bg-[#101820]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={logs.length < limit || isLoading}
                onClick={() => setOffset((prev) => prev + limit)}
                className="h-7 w-7 p-0 border-[#2A3944] bg-[#101820]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clean Table Content: Only severity badge gets color */}
      {isLoading ? (
        <div className="p-12 text-center text-[#9AA8B2] space-y-3">
          <div className="w-7 h-7 border-2 border-[#2A3944] border-t-[#71A99D] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-sans">Querying historical flow records...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-[#19242E] border border-[#DF857C]/40 rounded-lg text-[#DF857C] text-xs font-sans">
          <p>{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center bg-[#19242E] border border-[#2A3944] rounded-lg space-y-2">
          <ShieldCheck className="w-7 h-7 text-[#71A99D] mx-auto" />
          <h4 className="text-sm font-semibold text-[#E7ECEF] font-sans">No Records Found</h4>
          <p className="text-xs text-[#9AA8B2] font-sans">No flow logs match the active filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#2A3944] bg-[#19242E]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#131D25] border-b border-[#2A3944] text-[#9AA8B2] uppercase tracking-wider text-[11px] font-sans font-medium">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Source</th>
                <th className="py-2.5 px-4">Destination</th>
                <th className="py-2.5 px-4">Protocol</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3944]/50">
              {logs.map((log, idx) => (
                <tr key={log.id || idx} className="hover:bg-[#202D36] transition-colors">
                  {/* Timestamp: muted gray */}
                  <td className="py-3 px-4 text-[#9AA8B2] font-mono text-[11px] whitespace-nowrap">
                    {formatTime(log.timestamp)}
                  </td>

                  {/* Source: white */}
                  <td className="py-3 px-4 font-mono font-medium text-[#E7ECEF] whitespace-nowrap">
                    {log.src_ip ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDeviceIp(log.src_ip)}
                        className="text-left font-mono hover:text-[#71A99D] hover:underline transition-colors focus:outline-none cursor-pointer"
                        title={`View device activity trail for ${log.src_ip}`}
                      >
                        <span>{log.src_ip}</span>
                        <span className="text-[#687883] text-[11px] font-normal">:{log.src_port || 0}</span>
                      </button>
                    ) : (
                      <span>N/A</span>
                    )}
                  </td>

                  {/* Destination: sage/steel (#7895B2 / #71A99D) */}
                  <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                    <span className="text-[#7895B2] font-medium">{log.dst_ip || 'N/A'}</span>
                    <span className="text-[#687883]">{log.dst_port ? `:${log.dst_port}` : ''}</span>
                    {log.sni && (
                      <span className="block text-[10px] text-[#71A99D] font-sans">
                        {log.sni}
                      </span>
                    )}
                  </td>

                  {/* Protocol: muted gray */}
                  <td className="py-3 px-4 uppercase text-[#9AA8B2] font-mono text-[11px]">
                    {log.protocol || 'TCP'}
                  </td>

                  {/* Severity: status color badge */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <SeverityBadge severity={log.severity} size="small" />
                  </td>

                  {/* Action: muted text */}
                  <td className="py-3 px-4 text-right text-[#9AA8B2] font-sans text-xs uppercase">
                    {log.action || 'NOTIFY'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Device Activity Trail Drawer */}
      <DeviceActivityDrawer
        isOpen={!!selectedDeviceIp}
        onClose={() => setSelectedDeviceIp(null)}
        srcIp={selectedDeviceIp}
      />
    </div>
  );
};
export default History;
