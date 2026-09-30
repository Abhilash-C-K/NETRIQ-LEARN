import React, { useState } from 'react';
import { SeverityBadge } from './SeverityBadge';
import { ExplanationPanel } from './ExplanationPanel';
import { ChevronDown, ChevronUp, Globe, Terminal, ArrowRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export const VerdictCard = ({ threat, viewMode = 'smart', hasRawAccess = true, onSelectDevice }) => {
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
      return `Internal host ${src_ip} isolated due to anomalous activity.`;
    }
    if (normAction === 'RECOMMEND_BLOCK') {
      return `External source ${src_ip} flagged for Layer 1 firewall block targeting ${sni || `${dst_ip}:${dst_port}`}.`;
    }
    return `Flow from ${src_ip} to ${sni || `${dst_ip}:${dst_port}`} evaluated as benign traffic.`;
  };

  const actionBadgeStyles = {
    QUARANTINE: 'bg-[#C95F5F]/15 text-[#C95F5F] border-[#C95F5F]/40', // Muted crimson
    RECOMMEND_BLOCK: 'bg-[#D27C62]/15 text-[#D27C62] border-[#D27C62]/40', // High risk rust
    NOTIFY: 'bg-[#252728] text-[#A4A5A0] border-[#303334]',
    PASS: 'bg-[#252728] text-[#A4A5A0] border-[#303334]',
  };

  return (
    <Card className="relative overflow-hidden transition-colors bg-[#1E2021] hover:bg-[#252728] border border-[#303334] rounded-lg shadow-none">
      {/* Primary Card Summary Row */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Connection & Target Identifier */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <div className="w-9 h-9 rounded-lg bg-[#141516] border border-[#303334] flex items-center justify-center text-[#8CA4B8] shrink-0">
            {sni ? <Globe className="w-4 h-4 text-[#8CA4B8]" /> : <Terminal className="w-4 h-4 text-[#A4A5A0]" />}
          </div>
          <div>
            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-[#F1F0EA]">
              {onSelectDevice ? (
                <button
                  type="button"
                  onClick={() => onSelectDevice(src_ip)}
                  className="hover:text-[#9AAA78] hover:underline cursor-pointer focus:outline-none"
                  title={`View device activity trail for ${src_ip}`}
                >
                  {src_ip}
                </button>
              ) : (
                <span>{src_ip}</span>
              )}
              <ArrowRight className="w-3.5 h-3.5 text-[#70736F]" />
              <span className="text-[#A4A5A0]">{sni || `${dst_ip}:${dst_port}`}</span>
            </div>
            <div className="text-xs text-[#70736F] font-mono flex items-center gap-2 mt-0.5">
              <span>{protocol}</span>
              <span>•</span>
              <span>Port {src_port}</span>
              {timestamp && (
                <>
                  <span>•</span>
                  <span>{new Date(timestamp).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action & Verdict Badges */}
        <div className="flex items-center gap-3">
          <SeverityBadge severity={severity} size="medium" />

          {/* Action Signal Pill */}
          <span
            className={`text-xs px-2.5 py-0.5 rounded-md border font-mono font-semibold uppercase tracking-wider ${
              actionBadgeStyles[normAction] || actionBadgeStyles.NOTIFY
            }`}
          >
            {normAction}
          </span>

          {/* Confidence Score Pill */}
          <div className="hidden sm:flex flex-col items-end pl-2 border-l border-[#303334]">
            <span className="text-[10px] uppercase font-mono text-[#70736F]">Confidence</span>
            <span className="text-xs font-mono font-bold text-[#F1F0EA]">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Explanation Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-1 text-xs border-[#303334] bg-[#141516] hover:bg-[#252728] text-[#A4A5A0] hover:text-[#F1F0EA] flex items-center gap-1.5 h-8 px-2.5 font-sans"
          >
            <span>{isExpanded ? 'Hide' : 'Explain'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Human-Readable Sentence Translation */}
      <div className="px-4 pb-3 pt-0">
        <p className="text-xs text-[#A4A5A0] font-sans flex items-center gap-2 bg-[#141516]/60 px-3 py-2 rounded border border-[#303334]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9AAA78] shrink-0" />
          <span className="line-clamp-1">{getSummarySentence()}</span>
        </p>
      </div>

      {/* Expandable Technical Explanations Panel */}
      {isExpanded && (
        <div className="border-t border-[#303334] bg-[#141516] p-4">
          <ExplanationPanel threat={threat} hasRawAccess={hasRawAccess} />
        </div>
      )}
    </Card>
  );
};
export default VerdictCard;
