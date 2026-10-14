import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Compass,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Bot,
  UserCheck,
} from 'lucide-react';
import { incidentService } from '../services/incidents';

const getCuratedFallback = (threatType = '') => {
  const t = (threatType || '').toLowerCase();

  if (t.includes('ddos') || t.includes('flood') || t.includes('syn')) {
    return {
      category: 'Volumetric Denial-of-Service',
      automatedStep: {
        title: 'Drop Malicious Ingress Flow',
        instructions: 'Offending packet stream automatically filtered at Layer 1 boundary to prevent state table exhaustion.',
      },
      suggestions: [
        {
          phase: 'Edge Defense',
          title: 'Confirm Upstream Rate-Limiting & SYN Cookies',
          instructions: 'Verify border router thresholds and ensure TCP SYN cookie validation is absorbing secondary packet bursts.',
        },
        {
          phase: 'Verification',
          title: 'Check Connection Pool & Sockets',
          instructions: 'Inspect server connection tables to confirm SYN_RECV sockets have normalized back to baseline.',
        },
        {
          phase: 'Threat Intel',
          title: 'Cross-Reference Attacker Subnet',
          instructions: 'Cross-reference source subnet in threat intelligence databases before removing temporary firewall block.',
        },
      ],
    };
  }

  if (t.includes('scan') || t.includes('recon') || t.includes('probe')) {
    return {
      category: 'Network Reconnaissance',
      automatedStep: {
        title: 'Blacklist Scanner IP at Edge Filter',
        instructions: 'Probing IP added to boundary drop table to halt ongoing port and service enumeration.',
      },
      suggestions: [
        {
          phase: 'ACL Audit',
          title: 'Verify Ingress Filtering on Target Ports',
          instructions: 'Review edge firewall rules on probed ports (e.g. 22, 445, 3389, 8080) to ensure closed services reject incoming probes.',
        },
        {
          phase: 'Log Inspection',
          title: 'Inspect Target Host Authentication Logs',
          instructions: 'Verify no probed systems recorded successful logins or secondary authentication attempts during the scan window.',
        },
        {
          phase: 'Hardening',
          title: 'Audit Listening Sockets on Scanned Subnet',
          instructions: 'Review open listening ports across the destination subnet and bind internal services to local interfaces only.',
        },
      ],
    };
  }

  if (t.includes('lateral') || t.includes('internal') || t.includes('quarantine') || t.includes('smb')) {
    return {
      category: 'Internal Zero-Trust Anomaly',
      automatedStep: {
        title: 'Isolate Host via Layer 2 Quarantine',
        instructions: 'Compromised device isolated on Quarantine VLAN 99, cutting host-to-host lateral movement.',
      },
      suggestions: [
        {
          phase: 'Isolation Check',
          title: 'Verify Switch Port ACLs',
          instructions: 'Confirm switch port policies prevent any packet leakage between the quarantined device and core domain servers.',
        },
        {
          phase: 'Credential Revocation',
          title: 'Invalidate Active Host Sessions & Tokens',
          instructions: 'Force password reset and revoke active Kerberos/NTLM tokens for user accounts active on the host.',
        },
        {
          phase: 'Remediation',
          title: 'Scan Endpoint for Persistence Tools',
          instructions: 'Perform forensic scan on quarantined machine to search for credential dumpers or remote administration tools before release.',
        },
      ],
    };
  }

  if (t.includes('c2') || t.includes('exfiltration') || t.includes('beacon')) {
    return {
      category: 'Command & Control / Exfiltration',
      automatedStep: {
        title: 'Terminate Outbound C2 Socket',
        instructions: 'Active TCP connection terminated and remote destination IP blacklisted at egress filter.',
      },
      suggestions: [
        {
          phase: 'DNS Inspection',
          title: 'Inspect DNS Query History & Sinkhole Fallbacks',
          instructions: 'Check local DNS resolver logs from the source host for domain generation algorithms or secondary callback addresses.',
        },
        {
          phase: 'Process Hunt',
          title: 'Terminate Beaconing Process on Endpoint',
          instructions: 'Locate anomalous process tree binding outbound sockets, kill the task, and quarantine the binary.',
        },
        {
          phase: 'Impact Analysis',
          title: 'Quantify Historical Outbound Flow Bytes',
          instructions: 'Review NetrIQ flow records for the host to estimate total payload size transmitted prior to socket termination.',
        },
      ],
    };
  }

  if (t.includes('brute') || t.includes('auth') || t.includes('credential')) {
    return {
      category: 'Credential Abuse / Brute Force',
      automatedStep: {
        title: 'Throttle Repeated Authentication Attempts',
        instructions: 'Source IP throttled and repeated authentication requests rejected to prevent account compromise.',
      },
      suggestions: [
        {
          phase: 'Session Reset',
          title: 'Invalidate Active Sessions for Target User',
          instructions: 'Purge active session tokens on authentication servers to eliminate risk if credentials were partially guessed.',
        },
        {
          phase: 'MFA Enforcement',
          title: 'Enforce Multi-Factor Authentication',
          instructions: 'Verify target account requires hardware or authenticator app MFA for all subsequent logon attempts.',
        },
        {
          phase: 'Log Audit',
          title: 'Review Targeted Accounts for Password Spraying',
          instructions: 'Check auth gateway logs to see if attacker probed multiple usernames across the organization.',
        },
      ],
    };
  }

  // Default fallback
  return {
    category: 'Behavioral Threat Anomaly',
    automatedStep: {
      title: 'Automated Threat Mitigation Applied',
      instructions: 'Offending traffic flow filtered or contained per NETRIQ autonomous policy.',
    },
    suggestions: [
      {
        phase: 'Inspection',
        title: 'Inspect Flow Behavioral Characteristics',
        instructions: 'Compare packet size, inter-arrival time, and protocol flags against the established normal network baseline.',
      },
      {
        phase: 'Host Audit',
        title: 'Verify Target Host Integrity',
        instructions: 'Review system event logs on target host to confirm no unauthorized modifications or lateral connections occurred.',
      },
      {
        phase: 'Resolution',
        title: 'Review Threat Feed & Close Incident',
        instructions: 'Cross-reference source entity with threat intelligence feeds before marking the incident resolved or releasing filters.',
      },
    ],
  };
};

export const SOCCountermeasurePlaybook = ({
  incidentId,
  threatType = 'Threat Anomaly',
  confidence = 0.92,
  isInternal = false,
  responseAction = null,
  topFeatures = [],
  theme = 'light',
}) => {
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchGuidance = async () => {
      setLoading(true);
      try {
        const idToQuery = incidentId || 'INC-L1-CRIT';
        const data = await incidentService.getCountermeasures(idToQuery);

        if (isMounted && data && Array.isArray(data.steps)) {
          // Extract automated step and manual suggestions
          const auto = data.steps.find((s) => s.status === 'AUTOMATED' || s.automatable);
          const manual = data.steps
            .filter((s) => s.status !== 'AUTOMATED' && !s.automatable)
            .map((s) => ({
              phase: s.phase || 'Recommended Action',
              title: s.title,
              instructions: s.instructions,
            }));

          setGuidance({
            category: data.category || threatType,
            mitreId: data.mitre_id,
            automatedStep: auto
              ? { title: auto.title, instructions: auto.instructions }
              : null,
            suggestions: manual.length > 0 ? manual.slice(0, 3) : getCuratedFallback(threatType).suggestions,
          });
        }
      } catch (err) {
        if (isMounted) {
          const fallback = getCuratedFallback(threatType);
          setGuidance(fallback);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGuidance();
    return () => {
      isMounted = false;
    };
  }, [incidentId, threatType]);

  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div
        className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
          isDark
            ? 'bg-[#3b2a27] border-[#6b4c45] text-[#d4bfb0]'
            : 'bg-slate-50/80 border-slate-200 text-slate-500'
        }`}
      >
        <div
          className={`w-4 h-4 border-2 rounded-full animate-spin ${
            isDark
              ? 'border-[#6b4c45] border-t-[#cc5500]'
              : 'border-slate-300 border-t-blue-600'
          }`}
        />
        <span>Loading handling recommendations...</span>
      </div>
    );
  }

  if (!guidance) return null;

  return (
    <div
      className={
        isDark
          ? 'bg-[#4a3330] border border-[#6b4c45] rounded-lg p-4 space-y-3.5'
          : 'bg-[#fcfdfd] border border-[#e2eaf4] rounded-2xl p-4.5 space-y-3.5 shadow-2xs'
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-[#3b2a27] text-[#cc5500] border border-[#6b4c45]'
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}
          >
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4
              className={`text-xs font-bold uppercase tracking-wider font-sans ${
                isDark ? 'text-[#f8f4e7]' : 'text-[#0a1c3d]'
              }`}
            >
              Suggested Handling Guidance
            </h4>
            <p
              className={`text-[11px] ${
                isDark ? 'text-[#d4bfb0]' : 'text-[#687d9a]'
              }`}
            >
              Tailored next steps for {guidance.category || threatType}
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
            isDark
              ? 'bg-[#3b2a27] text-[#d4bfb0] border border-[#6b4c45]'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          Optional • Analyst Discretion
        </span>
      </div>

      {/* Autonomous Action Taken by NETRIQ */}
      {guidance.automatedStep && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
            isDark
              ? 'bg-[#253e34]/60 border-[#2f664a] text-[#a7f3d0]'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            <ShieldCheck
              className={`w-4 h-4 ${
                isDark ? 'text-[#34d399]' : 'text-emerald-600'
              }`}
            />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="uppercase text-[10px] tracking-wide opacity-80">
                Automated by NETRIQ:
              </span>
              <span>{guidance.automatedStep.title}</span>
            </div>
            <p
              className={`text-[11px] leading-relaxed ${
                isDark ? 'text-[#d1fae5]' : 'text-emerald-800'
              }`}
            >
              {guidance.automatedStep.instructions}
            </p>
          </div>
        </div>
      )}

      {/* Suggested Follow-up Actions (Advisory) */}
      {guidance.suggestions && guidance.suggestions.length > 0 && (
        <div className="space-y-2">
          <div
            className={`text-[10px] uppercase font-bold tracking-wider ${
              isDark ? 'text-[#a08070]' : 'text-slate-400'
            }`}
          >
            Suggested Follow-up Steps
          </div>

          <div className="space-y-2">
            {guidance.suggestions.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex items-start gap-2.5 transition-colors ${
                  isDark
                    ? 'bg-[#3b2a27] border-[#6b4c45]'
                    : 'bg-white border-[#e2eaf4] hover:border-blue-200 shadow-2xs'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5 ${
                    isDark
                      ? 'bg-[#4a3330] text-[#cc5500] border border-[#6b4c45]'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span
                      className={`font-semibold text-xs ${
                        isDark ? 'text-[#f8f4e7]' : 'text-[#0a1c3d]'
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.phase && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                          isDark
                            ? 'bg-[#4a3330] text-[#a08070] border border-[#6b4c45]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.phase}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      isDark ? 'text-[#d4bfb0]' : 'text-[#475569]'
                    }`}
                  >
                    {item.instructions}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SOCCountermeasurePlaybook;
