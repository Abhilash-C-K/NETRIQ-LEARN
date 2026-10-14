import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Bot,
  UserCheck,
} from 'lucide-react';
import { incidentService } from '../services/incidents';

export const SOCCountermeasurePlaybook = ({
  incidentId,
  threatType = 'Threat Anomaly',
  confidence = 0.92,
  isInternal = false,
  responseAction = null,
  topFeatures = [],
}) => {
  const [playbook, setPlaybook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState('ALL');
  const [completedSteps, setCompletedSteps] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchPlaybook = async () => {
      setLoading(true);
      try {
        const idToQuery = incidentId || 'INC-L1-CRIT';
        const data = await incidentService.getCountermeasures(idToQuery);
        if (isMounted) {
          setPlaybook(data);
          // Pre-populate completed steps for AUTOMATED actions
          const initCompleted = {};
          (data.steps || []).forEach((step) => {
            if (step.status === 'AUTOMATED' || step.completed) {
              initCompleted[step.id] = true;
            }
          });
          setCompletedSteps(initCompleted);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Failed to fetch countermeasures from backend, generating local baseline:', err);
          // Fallback baseline playbook
          const fallbackData = {
            threat_type: threatType,
            category: 'Automated Response & Containment',
            mitre_id: 'NIST SP 800-61 Playbook',
            confidence,
            automated_count: 1,
            manual_count: 3,
            steps: [
              {
                id: 'FB-1',
                phase: 'Containment',
                title: 'Enforce Packet Filter / Quarantine',
                status: 'AUTOMATED',
                executor: 'NETRIQ Autonomous Engine',
                instructions: 'Offending traffic filtered at network ingress before state table exhaustion.',
                completed: true,
              },
              {
                id: 'FB-2',
                phase: 'Containment',
                title: 'Verify Boundary Ingress Filtering',
                status: 'MANUAL',
                executor: 'Human SOC Analyst',
                instructions: 'Confirm rate-limiting thresholds and inspect active state tables on upstream gateway.',
                completed: false,
              },
              {
                id: 'FB-3',
                phase: 'Eradication',
                title: 'Inspect Target Host Authentication Logs',
                status: 'MANUAL',
                executor: 'Human SOC Analyst',
                instructions: 'Review destination host logs to verify no secondary lateral movement or compromise occurred.',
                completed: false,
              },
              {
                id: 'FB-4',
                phase: 'Recovery',
                title: 'Audit Listening Sockets & Restore Access',
                status: 'MANUAL',
                executor: 'Human SOC Analyst',
                instructions: 'Validate endpoint cleanliness and restore normal connectivity once threat vector is verified benign.',
                completed: false,
              },
            ],
          };
          setPlaybook(fallbackData);
          setCompletedSteps({ 'FB-1': true });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPlaybook();
    return () => {
      isMounted = false;
    };
  }, [incidentId, threatType]);

  const toggleStep = (stepId) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  if (loading) {
    return (
      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
        <span>Loading tailored SOC countermeasures...</span>
      </div>
    );
  }

  if (!playbook || !playbook.steps) {
    return null;
  }

  const filteredSteps =
    activePhase === 'ALL'
      ? playbook.steps
      : playbook.steps.filter((s) => s.phase.toUpperCase() === activePhase.toUpperCase());

  return (
    <div className="space-y-3.5 bg-white rounded-2xl border border-[#e2eaf4] p-5 shadow-xs">
      {/* Header with Title and Counts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#e2eaf4] gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0a1c3d] uppercase tracking-wider">
              Recommended SOC Countermeasures & Playbook
            </h3>
            <span className="text-[10px] text-[#687d9a] font-mono">
              Aligned with NIST SP 800-61 • {playbook.mitre_id}
            </span>
          </div>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {playbook.automated_count} Automated by NETRIQ
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {playbook.manual_count} Action Required by SOC
          </span>
        </div>
      </div>

      {/* NIST Phase Filter Tabs */}
      <div className="flex items-center gap-1 bg-[#f0f5fc] p-1 rounded-xl border border-[#dbe6f5] text-xs font-medium w-fit">
        {['ALL', 'CONTAINMENT', 'ERADICATION', 'RECOVERY'].map((phase) => (
          <button
            key={phase}
            onClick={() => setActivePhase(phase)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
              activePhase === phase
                ? 'bg-white text-[#0a1c3d] shadow-xs'
                : 'text-[#687d9a] hover:text-[#0a1c3d]'
            }`}
          >
            {phase === 'ALL' ? 'All Phases' : phase.charAt(0) + phase.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Countermeasure Steps List */}
      <div className="space-y-2.5">
        {filteredSteps.map((step, idx) => {
          const isDone = completedSteps[step.id];
          const isAutomated = step.status === 'AUTOMATED';

          return (
            <div
              key={step.id || idx}
              onClick={() => !isAutomated && toggleStep(step.id)}
              className={`p-3.5 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                isAutomated
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : isDone
                  ? 'bg-slate-50 border-slate-200 opacity-70'
                  : 'bg-[#fcfdfd] border-[#e2eaf4] hover:border-blue-300 cursor-pointer shadow-2xs'
              }`}
            >
              {/* Checkbox / Indicator */}
              <div className="mt-0.5 shrink-0">
                {isAutomated ? (
                  <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStep(step.id);
                    }}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                      isDone
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 bg-white hover:border-blue-500'
                    }`}
                  >
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Step Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      step.phase === 'Containment'
                        ? 'bg-blue-100 text-blue-800'
                        : step.phase === 'Eradication'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {step.phase}
                  </span>

                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${
                      isAutomated
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono'
                        : 'bg-slate-100 text-slate-700 font-mono'
                    }`}
                  >
                    {isAutomated ? (
                      <>
                        <Bot className="w-3 h-3 text-emerald-700" />
                        Automated by NETRIQ
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3 text-slate-600" />
                        Action Required by Analyst
                      </>
                    )}
                  </span>

                  {isDone && !isAutomated && (
                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">
                      Marked Done
                    </span>
                  )}
                </div>

                <div
                  className={`font-bold text-xs ${
                    isDone && !isAutomated ? 'line-through text-slate-500' : 'text-[#0a1c3d]'
                  }`}
                >
                  {step.title}
                </div>

                <p className="text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  {step.instructions}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SOCCountermeasurePlaybook;
