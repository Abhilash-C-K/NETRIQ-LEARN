import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Cpu,
  Server,
  Terminal,
  Save,
  Undo2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const IncidentDetailDrawer = ({
  isOpen,
  onClose,
  incident,
  onUpdateStatus,
  onOpenResponseDialog,
  isUpdating = false,
}) => {
  const { hasCapability, role } = useAuth();
  const canModify = hasCapability('REVERSE_RESPONSE_ACTION') || role === 'admin' || role === 'analyst';

  const [selectedStatus, setSelectedStatus] = useState(incident?.status || 'active');
  const [notes, setNotes] = useState(incident?.notes || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (incident) {
      setSelectedStatus(incident.status || 'active');
      setNotes(incident.notes || '');
      setSaveSuccess(false);
    }
  }, [incident]);

  if (!isOpen || !incident) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canModify || isUpdating) return;
    await onUpdateStatus(incident.id, {
      status: selectedStatus,
      notes,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const ms = ts < 1e11 ? ts * 1000 : ts;
    return new Date(ms).toLocaleString();
  };

  const isQuarantined =
    incident.response_action && incident.response_action.toLowerCase().includes('quarantine');

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl text-slate-100 flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-200">
                  INCIDENT #{incident.id ? incident.id.slice(-8) : 'N/A'}
                </span>
                <StatusBadge status={incident.status} />
                <SeverityBadge severity={incident.severity} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Logged {formatTimestamp(incident.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Details */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Incident Context & Detection
            </h4>
            <p className="text-sm font-medium text-slate-200 leading-relaxed">
              {incident.description || 'No description available'}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-900 text-xs font-mono">
              <div>
                <span className="text-slate-500 block mb-0.5">AFFECTED ASSET</span>
                {incident.affected_assets && incident.affected_assets.length > 0 ? (
                  <span className="text-cyan-300 font-semibold">{incident.affected_assets.join(', ')}</span>
                ) : (
                  <span className="text-slate-400 italic flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" />
                    Restricted (Viewer Role)
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">ASSIGNMENT</span>
                <span className="text-purple-300">Autonomous Dispatch</span>
              </div>
            </div>
          </div>

          {/* Response Enforcement Status Card */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyan-400" />
                Response Engine Execution
              </h4>
              {incident.response_action && (
                <span className="text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {incident.response_action}
                </span>
              )}
            </div>

            {incident.response_action ? (
              <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-lg border border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      incident.response_success ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
                    }`}
                  />
                  <span className="text-xs text-slate-200">
                    {incident.response_success
                      ? 'Action Successfully Executed on Controller'
                      : 'Enforcement Action Reported Error'}
                  </span>
                </div>

                {canModify && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onOpenResponseDialog({
                        actionType: 'reverse',
                        targetIp: incident.affected_assets?.[0] || '',
                        initialAction: incident.response_action,
                      })
                    }
                    className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Reverse Action
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No automated response action recorded for this incident.
              </p>
            )}

            {/* Quick Quarantine action if not quarantined */}
            {canModify && incident.affected_assets?.[0] && !isQuarantined && (
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    onOpenResponseDialog({
                      actionType: 'quarantine',
                      targetIp: incident.affected_assets[0],
                      initialAction: 'quarantine',
                    })
                  }
                  className="w-full text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Trigger Layer 2 Quarantine on Asset
                </Button>
              </div>
            )}
          </div>

          {/* Incident State & Audit Notes Form */}
          <form onSubmit={handleSave} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Status Transition & Audit Notes
              </h4>
              {!canModify && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read Only
                </span>
              )}
            </div>

            {/* Status Transition Buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Lifecycle State Transition
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['active', 'investigating', 'resolved'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={!canModify}
                    onClick={() => setSelectedStatus(st)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-all ${
                      selectedStatus === st
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Textarea */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Investigation Findings / Remediation Notes
              </label>
              <textarea
                value={notes}
                disabled={!canModify}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  canModify
                    ? 'Enter findings, root cause analysis, or verification of host sanitization...'
                    : 'No analyst notes recorded.'
                }
                rows={4}
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-60 transition-colors"
              />
            </div>

            {canModify && (
              <div className="flex items-center justify-between pt-1">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Changes saved to audit log.
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Updated: {formatTimestamp(incident.updated_at)}
                  </span>
                )}

                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950/40"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isUpdating ? 'Saving...' : 'Save & Update Incident'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
