import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { ShieldAlert, Server, ArrowRight, Clock, Undo2, Activity } from 'lucide-react';
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

  const normSeverity = String(incident.severity || 'LOW').toUpperCase();

  // Left severity indicator lines: High (#D27C62), Critical (#C95F5F), Medium (#D0A05C), Low (#8CA4B8)
  const severityIndicatorStyles = {
    CRITICAL: 'border-l-[3px] border-l-[#C95F5F]',
    HIGH: 'border-l-[3px] border-l-[#D27C62]',
    MEDIUM: 'border-l-[3px] border-l-[#D0A05C]',
    LOW: 'border-l-[3px] border-l-[#8CA4B8]',
  };

  return (
    <Card
      onClick={() => onSelect && onSelect(incident)}
      className={`bg-[#1E2021] hover:bg-[#252728] border border-[#303334] ${
        severityIndicatorStyles[normSeverity] || severityIndicatorStyles.LOW
      } text-[#F1F0EA] shadow-none rounded-lg cursor-pointer transition-colors duration-150`}
    >
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-[#141516] border border-[#303334] text-[#A4A5A0] mt-0.5 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>

          <div className="space-y-1.5">
            {/* Header Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#F1F0EA] bg-[#141516] px-2 py-0.5 rounded border border-[#303334]">
                {incident.incident_code || (incident.id ? `INC-${incident.id.slice(-4).toUpperCase()}` : 'INC-101')}
              </span>
              <StatusBadge status={incident.status} />
              <SeverityBadge severity={incident.severity} size="small" />

              {/* Quarantine: dark red outline #C95F5F */}
              {incident.response_action && (
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-[#C95F5F]/10 text-[#C95F5F] border border-[#C95F5F]/60">
                  {incident.response_action}
                </span>
              )}
            </div>

            {/* Main incident text: Warm White #F1F0EA */}
            <p className="text-sm font-medium text-[#F1F0EA] font-sans line-clamp-1 max-w-xl">
              {incident.description || incident.title || 'Security incident flagged by detection engine'}
            </p>

            {/* Real Network Flow: Source IP:Port -> Destination IP:Port */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#A4A5A0] font-mono pt-1">
              {/* Origin IP */}
              <div className="flex items-center gap-1.5 bg-[#141516] px-2 py-0.5 rounded border border-[#303334]">
                <Server className="w-3 h-3 text-[#8CA4B8]" />
                {incident.src_ip || incident.affected_assets?.[0] ? (
                  onSelectDevice ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDevice(incident.src_ip || incident.affected_assets[0]);
                      }}
                      className="text-[#F1F0EA] hover:text-[#9AAA78] hover:underline font-mono font-semibold cursor-pointer"
                      title="View host activity trail"
                    >
                      {incident.src_ip || incident.affected_assets[0]}
                      {incident.src_port ? <span className="text-[#70736F] font-normal">:{incident.src_port}</span> : ''}
                    </button>
                  ) : (
                    <span className="text-[#F1F0EA] font-semibold">
                      {incident.src_ip || incident.affected_assets[0]}
                      {incident.src_port ? `:${incident.src_port}` : ''}
                    </span>
                  )
                ) : (
                  <span className="text-[#70736F]">Protected Host</span>
                )}
              </div>

              {/* Direction Indicator */}
              <div className="flex items-center gap-1 text-[#70736F]">
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase bg-[#141516] px-1 rounded text-[#8CA4B8]">
                  {incident.protocol || 'TCP'}
                </span>
              </div>

              {/* Destination Target IP */}
              {incident.dst_ip && (
                <div className="flex items-center gap-1 bg-[#141516] px-2 py-0.5 rounded border border-[#303334] text-[#A4A5A0]">
                  <span className="text-[#8CA4B8] font-mono font-medium">
                    {incident.dst_ip}
                    {incident.dst_port ? `:${incident.dst_port}` : ''}
                  </span>
                </div>
              )}

              {/* Created Timestamp */}
              <span className="flex items-center gap-1 text-[#70736F]">
                <Clock className="w-3 h-3 text-[#70736F]" />
                {formatTimestamp(incident.created_at)}
              </span>
            </div>

          </div>
        </div>

        {/* Right Actions: Reverse (neutral #303334) + Details */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
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
              className="text-xs border-[#303334] bg-[#141516] hover:bg-[#252728] text-[#A4A5A0] hover:text-[#F1F0EA] flex items-center gap-1.5 h-8 font-sans font-medium"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Reverse
            </Button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(incident);
            }}
            className="text-xs font-sans font-medium bg-[#141516] hover:bg-[#252728] border border-[#303334] text-[#A4A5A0] hover:text-[#F1F0EA] flex items-center gap-1.5 h-8 px-3 rounded-lg transition-colors cursor-pointer"
            title="Inspect Incident Details"
          >
            <Activity className="w-3.5 h-3.5 text-[#8CA4B8]" />
            <span>Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
export default IncidentCard;
