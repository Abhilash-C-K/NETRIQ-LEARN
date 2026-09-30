import React, { useState, useEffect } from 'react';
import { predictionService } from '../services/prediction';
import { getFeatureMeta } from '../utils/featureLabels';
import { ArrowUpRight, ArrowDownRight, Lock, AlertCircle, Cpu } from 'lucide-react';

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

  if (viewMode === 'raw' && !hasRawAccess) {
    return (
      <div className="p-4 bg-[#101820] border border-[#DF857C]/30 rounded-lg text-xs text-[#E7ECEF] flex items-center gap-3 font-sans">
        <Lock className="w-5 h-5 text-[#DF857C] shrink-0" />
        <div>
          <div className="font-semibold text-[#DF857C] uppercase tracking-wide">Access Restricted</div>
          <div className="text-[11px] text-[#9AA8B2] mt-0.5">
            Raw model feature metrics require Analyst or Admin capability.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-[#101820] border border-[#2A3944] rounded-lg space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#19242E] rounded" />
          <div className="h-4 bg-[#19242E] rounded w-1/3" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3 bg-[#19242E] rounded w-5/6" />
          <div className="h-3 bg-[#19242E] rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !explanation) {
    return (
      <div className="p-4 bg-[#101820] border border-[#2A3944] rounded-lg text-xs text-[#9AA8B2] flex items-center gap-2 font-sans">
        <AlertCircle className="w-4 h-4 text-[#D3A35D] shrink-0" />
        <span>{error || 'No feature explanation record available.'}</span>
      </div>
    );
  }

  const topFeatures = explanation.top_features || [];
  const top3Features = topFeatures.slice(0, 3);
  const maxContribution = Math.max(...topFeatures.map((f) => Math.abs(f.contribution || 0)), 0.001);

  if (viewMode === 'raw') {
    return (
      <div className="p-4 bg-[#101820] border border-[#2A3944] rounded-lg space-y-4 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A3944] pb-2 text-[11px] text-[#9AA8B2]">
          <div className="flex items-center gap-2">
            <span className="text-[#7895B2] uppercase font-semibold">
              Source: {explanation.explanation_source || 'SHAP'}
            </span>
            <span>•</span>
            <span>Base Value: {explanation.base_value?.toFixed(4) ?? 'N/A'}</span>
          </div>
          <div>ID: {predictionId}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2A3944] text-[#9AA8B2] text-[10px] uppercase font-sans">
                <th className="py-2 px-2">Raw Feature Name</th>
                <th className="py-2 px-2 text-right">Value</th>
                <th className="py-2 px-2 text-right">Contribution</th>
                <th className="py-2 px-2 text-center">Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3944]/50">
              {topFeatures.map((feat, idx) => {
                const isRiskInc = feat.direction === 'INCREASES_RISK';
                return (
                  <tr key={idx} className="hover:bg-[#19242E]">
                    <td className="py-2 px-2 text-[#E7ECEF]">{feat.name || feat.label}</td>
                    <td className="py-2 px-2 text-right text-[#9AA8B2]">
                      {typeof feat.value === 'number' ? feat.value.toLocaleString() : feat.value ?? 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-right text-[#E7ECEF] font-semibold">
                      {feat.contribution > 0 ? `+${feat.contribution.toFixed(4)}` : feat.contribution?.toFixed(4)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {isRiskInc ? (
                        <span className="text-[#DF857C] inline-flex items-center gap-1 font-semibold">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Risk+
                        </span>
                      ) : (
                        <span className="text-[#71A99D] inline-flex items-center gap-1 font-semibold">
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
    <div className="p-4 bg-[#101820] border border-[#2A3944] rounded-lg space-y-3">
      <div className="flex items-center justify-between border-b border-[#2A3944] pb-2">
        <div className="flex items-center gap-2 text-xs font-sans font-semibold text-[#71A99D] uppercase tracking-wide">
          <Cpu className="w-4 h-4 text-[#71A99D]" />
          <span>Top AI Decision Factors</span>
        </div>
        <span className="text-[10px] text-[#9AA8B2] font-mono">
          Method: {explanation.explanation_source?.toUpperCase() || 'SHAP'}
        </span>
      </div>

      <div className="space-y-2.5">
        {top3Features.map((feat, idx) => {
          const meta = hasRawAccess ? getFeatureMeta(feat.name) : feat;
          const labelStr = feat.label || meta.label || feat.name;
          const isRiskInc = feat.direction === 'INCREASES_RISK';
          const pct = Math.min(Math.round((Math.abs(feat.contribution || 0) / maxContribution) * 100), 100);

          return (
            <div key={idx} className="space-y-1.5 bg-[#19242E] p-3 rounded-lg border border-[#2A3944]">
              <div className="flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-2 font-medium text-[#E7ECEF]">
                  <span>{labelStr}</span>
                  {hasRawAccess && feat.value !== undefined && (
                    <span className="text-[10px] text-[#9AA8B2] font-mono bg-[#101820] px-1.5 py-0.2 rounded border border-[#2A3944]">
                      {typeof feat.value === 'number' ? feat.value.toLocaleString() : feat.value} {meta.unit}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  {isRiskInc ? (
                    <span className="text-[#DF857C] flex items-center font-semibold">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Risk Indicator
                    </span>
                  ) : (
                    <span className="text-[#71A99D] flex items-center font-semibold">
                      <ArrowDownRight className="w-3.5 h-3.5" /> Normalizing
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#101820] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isRiskInc ? 'bg-[#DF857C]' : 'bg-[#71A99D]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-[11px] text-[#9AA8B2] font-sans leading-snug">{meta.description || feat.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
