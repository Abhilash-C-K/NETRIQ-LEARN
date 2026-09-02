import React, { useState } from 'react';
import { SeverityBadge } from './SeverityBadge';
import { ExplanationPanel } from './ExplanationPanel';
import { ChevronDown, ChevronUp, Globe, Terminal, ArrowRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export const VerdictCard = ({ threat, viewMode = 'smart', hasRawAccess = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    id,
    prediction_id,
    src_ip,
    dst_ip,
    src_port,
    dst_port,
    protocol = 'TCP',
    sni,
    severity = 'LOW',
    action = 'NOTIFY',
    confidence = 0,
    timestamp,
    reason,
  } = threat;

  const effectivePredictionId = prediction_id || id;
  const normAction = String(action).toUpperCase();

  // Determine plain-language summary line based on verdict and action
  const getSummarySentence = () => {
    if (reason) return reason;
    if (normAction === 'QUARANTINE') {
      return `Internal host ${src_ip} isolated via Layer 2 SDN quarantine due to anomalous packet activity.`;
    }
    if (normAction === 'RECOMMEND_BLOCK') {
      return `External source ${src_ip} flagged for Layer 1 firewall block targeting ${sni || `${dst_ip}:${dst_port}`}.`;
    }
    return `Flow from ${src_ip} to ${sni || `${dst_ip}:${dst_port}`} evaluated as benign traffic.`;
  };

  const actionVariants = {
    QUARANTINE: 'rose',
    RECOMMEND_BLOCK: 'amber',
    NOTIFY: 'cyan',
    PASS: 'default',
  };

  return (
    <Card className="overflow-hidden transition-all hover:border-slate-700">
      {/* Primary Card Summary Row */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Connection & Target Identifier */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
            {sni ? <Globe className="w-5 h-5 text-cyan-400" /> : <Terminal className="w-5 h-5 text-slate-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-slate-100">
              <span>{src_ip}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-cyan-300">{sni ? sni : `${dst_ip}:${dst_port}`}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span>{protocol}</span>
              <span>•</span>
              <span>
                {src_ip}:{src_port} $\rightarrow$ {dst_ip}:{dst_port}
              </span>
              {timestamp && (
                <>
                  <span>•</span>
                  <span>{new Date(timestamp).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Severity & Action Verdict Badges */}
        <div className="flex items-center gap-3">
          <SeverityBadge severity={severity} size="medium" />

          <Badge variant={actionVariants[normAction] || 'default'}>
            {normAction === 'NOTIFY' ? 'PASS / NOTIFY' : normAction}
          </Badge>

          <span className="text-xs font-mono text-slate-400 font-medium">
            {(confidence * 100).toFixed(0)}% Conf
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse AI explanation' : 'Expand AI explanation'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* One-Line Summary Bar */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-300 font-sans">
        <p className="truncate">{getSummarySentence()}</p>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] shrink-0 ml-4 underline decoration-cyan-500/40"
        >
          {isExpanded ? 'Hide Explainability' : 'Explain Verdict'}
        </button>
      </div>

      {/* Expandable Explanation Drawer */}
      {isExpanded && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 animate-in fade-in slide-in-from-top-1">
          <ExplanationPanel
            predictionId={effectivePredictionId}
            viewMode={viewMode}
            hasRawAccess={hasRawAccess}
          />
        </div>
      )}
    </Card>
  );
};
