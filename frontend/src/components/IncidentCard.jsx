import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { ShieldAlert, Server, ArrowRight, Lock, Clock, Undo2, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const IncidentCard = ({ incident, onSelect, onOpenResponseDialog, onSelectDevice }) => {
  const { hasCapability, role } = useAuth();
  const canModify = hasCapability('REVERSE_RESPONSE_ACTION') || role === 'admin' || role === 'analyst';

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const ms = ts < 1e11 ? ts * 1000 : ts;
    return new Date(ms).toLocaleTimeString();
  };

  const assetDisplay =
    incident.affected_assets && incident.affected_assets.length > 0
      ? incident.affected_assets.join(', ')
      : null;

  return (
    <Card
      onClick={() => onSelect && onSelect(incident)}
      className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md hover:border-[#00d1b2]/40 hover:shadow-cyan-950/20 cursor-pointer transition-all duration-200"
    >
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[#00d1b2] mt-0.5 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-300">
                #{incident.id ? incident.id.slice(-8) : 'N/A'}
              </span>
              <StatusBadge status={incident.status} />
              <SeverityBadge severity={incident.severity} />

              {incident.response_action && (
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {incident.response_action}
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-slate-200 line-clamp-1 max-w-xl">
              {incident.description || 'No description provided'}
            </p>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {formatTimestamp(incident.created_at)}
              </span>

              <span className="flex items-center gap-1">
                <Server className="w-3 h-3 text-cyan-400" />
                {assetDisplay ? (
                  onSelectDevice ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const firstIp = incident.affected_assets?.[0] || assetDisplay;
                        onSelectDevice(firstIp);
                      }}
                      className="text-cyan-300 hover:text-cyan-100 hover:underline font-semibold cursor-pointer focus:outline-none"
                      title={`View device activity trail for ${incident.affected_assets?.[0] || assetDisplay}`}
                    >
                      {assetDisplay}
                    </button>
                  ) : (
                    <span className="text-cyan-300 font-semibold">{assetDisplay}</span>
                  )
                ) : (
                  <span className="text-slate-400 italic flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Restricted (Viewer)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
          {canModify && incident.response_action && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onOpenResponseDialog({
                  actionType: 'reverse',
                  targetIp: incident.affected_assets?.[0] || '',
                  initialAction: incident.response_action,
                });
              }}
              className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10 flex items-center gap-1 h-8"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Reverse
            </Button>
          )}

          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(incident);
            }}
            className="text-xs font-mono font-bold uppercase bg-teal-950/80 hover:bg-teal-900 border border-[#00d1b2]/40 text-[#00d1b2] hover:text-white flex items-center gap-1.5 h-8 shadow-sm transition-all"
            title="Inspect in Network Monitor"
          >
            <Activity className="w-3.5 h-3.5 nm-pulse" />
            <span>Network Traffic</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
