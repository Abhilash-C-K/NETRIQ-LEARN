import React, { useState } from 'react';
import { SeverityBadge } from './SeverityBadge';
import { ExplanationPanel } from './ExplanationPanel';
import { ChevronDown, ChevronUp, Globe, Terminal, ArrowRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getCachedDomain } from '../utils/domain';

export const VerdictCard = ({ threat, viewMode = 'smart', hasRawAccess = true, onSelectDevice }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    id,
    prediction_id,
    sni,
    src_domain,
    reason,
  } = threat || {};

  const src_ip = threat.src_ip || (threat.affected_assets && threat.affected_assets[0]) || 'Unknown Source';
  const dst_ip = threat.dst_ip || (threat.affected_assets && threat.affected_assets[1]) || 'Gateway';
  const src_port = threat.src_port || '—';
  const dst_port = threat.dst_port || '—';

  const cleanSrc = String(src_ip).split(':')[0].trim();
  const cleanDst = String(dst_ip).split(':')[0].trim();
  const effectiveSrcDomain = src_domain || getCachedDomain(cleanSrc);
  const effectiveDstDomain = sni || getCachedDomain(cleanDst);
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
      return `External source ${src_domain || src_ip} flagged for external firewall block targeting ${sni || `${dst_ip}:${dst_port}`}.`;
    }
    return `Traffic flow ${src_domain ? `${src_domain} (${src_ip})` : src_ip} → ${sni || `${dst_ip}:${dst_port}`} evaluated as verified benign payload.`;
  };

  const actionBadgeStyles = {
    QUARANTINE: 'bg-rose-50 text-rose-700 border-rose-300',
    RECOMMEND_BLOCK: 'bg-amber-50 text-amber-700 border-amber-300',
    NOTIFY: 'bg-slate-100 text-slate-700 border-slate-300',
    PASS: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  };

  return (
    <Card className="relative overflow-hidden transition-colors bg-white hover:bg-slate-50/80 border border-slate-700 rounded-xl shadow-xs">
      {/* Primary Card Summary Row */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Connection & Target Identifier */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-400 flex items-center justify-center text-slate-700 shrink-0">
            {effectiveDstDomain || effectiveSrcDomain ? <Globe className="w-4 h-4 text-blue-600" /> : <Terminal className="w-4 h-4 text-slate-500" />}
          </div>
          <div>
            <div className="flex items-center gap-2 font-mono text-sm font-bold text-[#0a1c3d]">
              {onSelectDevice ? (
                <button
                  type="button"
                  onClick={() => onSelectDevice(cleanSrc)}
                  className="hover:text-blue-600 hover:underline cursor-pointer"
                  title={`View device activity trail for ${cleanSrc}`}
                >
                  {effectiveSrcDomain || src_ip}
                </button>
              ) : (
                <span>{effectiveSrcDomain || src_ip}</span>
              )}
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span>{effectiveDstDomain || dst_ip}</span>
            </div>
            <p className="text-xs text-[#687d9a] mt-0.5 line-clamp-1 max-w-xl">
              {getSummarySentence()}
            </p>
          </div>
        </div>

        {/* Action, Confidence & Expand Controls */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono font-bold text-[#0a1c3d]">
              {confidencePercent}% AI Conf
            </div>
            <div className="text-[10px] text-[#687d9a] font-mono">
              {formattedTime} • {protocol}
            </div>
          </div>

          <SeverityBadge severity={severity} size="small" />

          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${actionBadgeStyles[normAction] || actionBadgeStyles.NOTIFY}`}>
            {normAction}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-[#687d9a] hover:text-[#0a1c3d] hover:bg-slate-100 p-1.5 h-8 w-8 rounded-lg cursor-pointer"
            aria-label="Toggle AI feature explanation"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expandable Explanation Panel */}
      {isExpanded && (
        <div className="border-t border-slate-300 bg-[#f8fafc] p-4">
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
