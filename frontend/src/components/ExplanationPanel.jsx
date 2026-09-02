import React, { useState, useEffect } from 'react';
import { predictionService } from '../services/prediction';
import { getFeatureMeta } from '../utils/featureLabels';
import { Sparkles, ArrowUpRight, ArrowDownRight, Lock, AlertCircle } from 'lucide-react';

export const ExplanationPanel = ({ predictionId, viewMode = 'smart', hasRawAccess = true }) => {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!predictionId) {
      setLoading(false);
      return;
    }

    // RBAC GUARD: If user lacks VIEW_RAW_LOGS and is attempting raw mode, NEVER fire API call
    if (viewMode === 'raw' && !hasRawAccess) {
      setLoading(false);
      return;
    }

    const fetchExplanation = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await predictionService.getExplanation(predictionId);
        if (isMounted) {
          if (!hasRawAccess) {
            // Sanitize payload in memory for non-raw sessions: sanitize exact values and raw keys
            const sanitizedFeatures = (data.top_features || []).map((f) => {
              const meta = getFeatureMeta(f.name);
              return {
                label: meta.label,
                description: meta.description,
                unit: meta.unit,
                contribution: f.contribution,
                direction: f.direction,
              };
            });
            setExplanation({
              explanation_source: data.explanation_source,
              top_features: sanitizedFeatures,
            });
          } else {
            setExplanation(data);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn(`Explanation fetch error for prediction ${predictionId}:`, err);
          setError(
            err.response?.data?.detail ||
              'Explainability metrics are not available for this verdict.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchExplanation();
    return () => {
      isMounted = false;
    };
  }, [predictionId, viewMode, hasRawAccess]);

  // Strict RBAC Guard View for Raw mode without capability
  if (viewMode === 'raw' && !hasRawAccess) {
    return (
      <div className="p-4 bg-slate-950/80 border border-rose-500/30 rounded-lg text-xs text-slate-300 flex items-center gap-3 font-mono">
        <Lock className="w-5 h-5 text-rose-400 shrink-0" />
        <div>
          <div className="font-semibold text-rose-300 uppercase tracking-wide">Access Restricted</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Raw model feature metrics require Analyst or Admin role permissions. Network requests blocked.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-800 rounded" />
          <div className="h-4 bg-slate-800 rounded w-1/3" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3 bg-slate-800 rounded w-5/6" />
          <div className="h-3 bg-slate-800 rounded w-2/3" />
          <div className="h-3 bg-slate-800 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !explanation) {
    return (
      <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs text-slate-400 flex items-center gap-2 font-mono">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>{error || 'No feature explanation record available.'}</span>
      </div>
    );
  }

  const topFeatures = explanation.top_features || [];
  const top3Features = topFeatures.slice(0, 3);
  const maxContribution = Math.max(...topFeatures.map((f) => Math.abs(f.contribution || 0)), 0.001);

  if (viewMode === 'raw') {
    return (
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-4 font-mono text-xs">
        {/* Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 uppercase font-semibold">
              Source: {explanation.explanation_source || 'SHAP'}
            </span>
            <span>•</span>
            <span>Base Value: {explanation.base_value?.toFixed(4) ?? 'N/A'}</span>
          </div>
          <div>ID: {predictionId}</div>
        </div>

        {/* Full Feature Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                <th className="py-2 px-2">Raw Feature Name</th>
                <th className="py-2 px-2 text-right">Value</th>
                <th className="py-2 px-2 text-right">Contribution</th>
                <th className="py-2 px-2 text-center">Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {topFeatures.map((feat, idx) => {
                const isRiskInc = feat.direction === 'INCREASES_RISK';
                return (
                  <tr key={idx} className="hover:bg-slate-900/60">
                    <td className="py-2 px-2 text-slate-200">{feat.name || feat.label}</td>
                    <td className="py-2 px-2 text-right text-slate-300">
                      {typeof feat.value === 'number' ? feat.value.toLocaleString() : feat.value ?? 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300 font-semibold">
                      {feat.contribution > 0 ? `+${feat.contribution.toFixed(4)}` : feat.contribution?.toFixed(4)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {isRiskInc ? (
                        <span className="text-rose-400 inline-flex items-center gap-1 font-semibold">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Risk+
                        </span>
                      ) : (
                        <span className="text-emerald-400 inline-flex items-center gap-1 font-semibold">
                          <ArrowDownRight className="w-3.5 h-3.5" /> Risk-
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Smart Summary View Mode
  return (
    <div className="p-4 bg-slate-950/90 border border-cyan-500/20 rounded-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wide">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Top AI Decision Factors</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Method: {explanation.explanation_source?.toUpperCase() || 'SHAP'}
        </span>
      </div>

      {/* Top 3 Humanized Factors */}
      <div className="space-y-3">
        {top3Features.map((feat, idx) => {
          const meta = hasRawAccess ? getFeatureMeta(feat.name) : feat;
          const labelStr = feat.label || meta.label || feat.name;
          const isRiskInc = feat.direction === 'INCREASES_RISK';
          const pct = Math.min(Math.round((Math.abs(feat.contribution || 0) / maxContribution) * 100), 100);

          return (
            <div key={idx} className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-200">
                  <span>{labelStr}</span>
                  {hasRawAccess && feat.value !== undefined && (
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                      {typeof feat.value === 'number' ? feat.value.toLocaleString() : feat.value} {meta.unit}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  {isRiskInc ? (
                    <span className="text-rose-400 flex items-center font-semibold">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Risk Indicator
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center font-semibold">
                      <ArrowDownRight className="w-3.5 h-3.5" /> Normalizing
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isRiskInc ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">{meta.description || feat.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
