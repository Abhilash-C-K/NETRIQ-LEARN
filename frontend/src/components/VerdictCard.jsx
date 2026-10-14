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
    sni,
    reason,
  } = threat || {};

  const src_ip = threat.src_ip || (threat.affected_assets && threat.affected_assets[0]) || 'Unknown Source';
  const dst_ip = threat.dst_ip || (threat.affected_assets && threat.affected_assets[1]) || 'Gateway';
  const src_port = threat.src_port || '—';
  const dst_port = threat.dst_port || '—';
  const protocol = (threat.protocol || 'TCP').toUpperCase();
  const severity = (threat.severity || 'LOW').toUpperCase();
  const action = threat.action || threat.response_action || 'NOTIFY';

  const rawConfidence = threat.confidence;
  const confidencePercent = typeof rawConfidence === 'number'
    ? (rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence))
    : 92;

  // Format timestamp whether epoch seconds, ms, or ISO string
  const formattedTime = (() => {
    if (!threat.timestamp && !threat.created_at) return 'Just now';
    const ts = threat.timestamp || threat.created_at;
    const date = typeof ts === 'number' ? new Date(ts < 10000000000 ? ts * 1000 : ts) : new Date(ts);
    return isNaN(date.getTime()) ? 'Recent' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  })();

  const effectivePredictionId = prediction_id || id;
  const normAction = String(action).toUpperCase();

  // Determine plain-language summary line based on verdict and action
  const getSummarySentence = () => {
    if (reason) return reason;
    if (threat.description) return threat.description;
    if (normAction === 'QUARANTINE') {
      return `Internal host ${src_ip} isolated due to anomalous behavior.`;
    }
    if (normAction === 'RECOMMEND_BLOCK') {
      return `External source ${src_ip} flagged for External firewall block targeting ${sni || `${dst_ip}:${dst_port}`}.`;
    }
    return `Traffic flow ${src_ip} → ${sni || `${dst_ip}:${dst_port}`} evaluated as verified benign payload.`;
  };

  const actionBadgeStyles = {
    QUARANTINE: 'bg-[#b83a2e]/15 text-[#b83a2e] border-[#b83a2e]/40', // Muted crimson
    RECOMMEND_BLOCK: 'bg-[#cc5500]/15 text-[#cc5500] border-[#cc5500]/40', // High risk rust
    NOTIFY: 'bg-[#5c3d38] text-[#d4bfb0] border-[#6b4c45]',
    PASS: 'bg-[#cc5500]/15 text-[#cc5500] border-[#cc5500]/30',
  };

  return (
    <Card className="relative overflow-hidden transition-colors bg-[#4a3330] hover:bg-[#5c3d38] border border-[#6b4c45] rounded-lg shadow-none">
      {/* Primary Card Summary Row */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Connection & Target Identifier */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <div className="w-9 h-9 rounded-lg bg-[#3b2a27] border border-[#6b4c45] flex items-center justify-center text-[#c4956a] shrink-0">
            {sni ? <Globe className="w-4 h-4 text-[#c4956a]" /> : <Terminal className="w-4 h-4 text-[#d4bfb0]" />}
          </div>
          <div>
            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-[#f8f4e7]">
              {onSelectDevice ? (
                <button
                  type="button"
                  onClick={() => onSelectDevice(src_ip)}
                  className="hover:text-[#cc5500] hover:underline cursor-pointer focus:outline-none"
                  title={`View device activity trail for ${src_ip}`}
                >
                  {src_ip}
                </button>
              ) : (
                <span>{src_ip}</span>
              )}
              <ArrowRight className="w-3.5 h-3.5 text-[#a08070]" />
              <span className="text-[#d4bfb0]">{sni || `${dst_ip}:${dst_port}`}</span>
            </div>
            <div className="text-xs text-[#a08070] font-mono flex items-center gap-2 mt-0.5">
              <span className="text-[#cc5500] font-semibold bg-[#3b2a27] px-1.5 py-0.2 rounded border border-[#6b4c45]">
                {effectivePredictionId ? `#ALERT-${String(effectivePredictionId).slice(-4).toUpperCase()}` : '#ALERT-101'}
              </span>
              <span>•</span>
              <span>{protocol}</span>
              <span>•</span>
              <span>Port {src_port}</span>
              <span>•</span>
              <span>{formattedTime}</span>
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
          <div className="hidden sm:flex flex-col items-end pl-2 border-l border-[#6b4c45]">
            <span className="text-[10px] uppercase font-mono text-[#a08070]">Confidence</span>
            <span className="text-xs font-mono font-bold text-[#f8f4e7]">
              {confidencePercent}%
            </span>
          </div>

          {/* Explanation Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-1 text-xs border-[#6b4c45] bg-[#3b2a27] hover:bg-[#5c3d38] text-[#d4bfb0] hover:text-[#f8f4e7] flex items-center gap-1.5 h-8 px-2.5 font-sans"
          >
            <span>{isExpanded ? 'Hide' : 'Explain'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Human-Readable Sentence Translation */}
      <div className="px-4 pb-3 pt-0">
        <p className="text-xs text-[#d4bfb0] font-sans flex items-center gap-2 bg-[#3b2a27]/60 px-3 py-2 rounded border border-[#6b4c45]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#cc5500] shrink-0" />
          <span className="line-clamp-1">{getSummarySentence()}</span>
        </p>
      </div>

      {/* Expandable Technical Explanations Panel */}
      {isExpanded && (
        <div className="border-t border-[#6b4c45] bg-[#3b2a27] p-4">
          <ExplanationPanel
            predictionId={effectivePredictionId}
            viewMode={viewMode}
            hasRawAccess={hasRawAccess}
            threat={threat}
          />
        </div>
      )}
    </Card>
  );
};
export default VerdictCard;
