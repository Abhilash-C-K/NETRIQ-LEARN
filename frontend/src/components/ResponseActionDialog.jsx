import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ShieldAlert, ShieldCheck, AlertTriangle, X, Check, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ResponseActionDialog = ({
  isOpen,
  onClose,
  onConfirm,
  actionType = 'reverse', // 'reverse' or 'quarantine'
  targetIp = '',
  targetMac = null,
  initialAction = 'quarantine',
  isLoading = false,
}) => {
  const { hasCapability, role } = useAuth();
  const [reason, setReason] = useState('');
  const [confirmedRisk, setConfirmedRisk] = useState(false);

  if (!isOpen) return null;

  const isReverse = actionType === 'reverse';
  const requiredCapability = isReverse ? 'REVERSE_RESPONSE_ACTION' : 'TRIGGER_QUARANTINE';
  const canPerform = hasCapability(requiredCapability) || role === 'admin' || role === 'analyst';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canPerform || isLoading) return;
    onConfirm({
      action: initialAction,
      target_ip: targetIp,
      target_mac: targetMac,
      reason: reason || (isReverse ? 'Operator initiated reversal' : 'Manual operator quarantine'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border ${
                isReverse
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {isReverse ? 'Confirm Enforcement Reversal' : 'Confirm Manual SDN Quarantine'}
              </h3>
              <p className="text-xs text-slate-400">
                {isReverse
                  ? 'Reverse an active firewall block or SDN host isolation'
                  : 'Enforce immediate Layer 2 port isolation on the network switch'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!canPerform && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-300">
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Permission Denied: Your role lacks the required capability ({requiredCapability}).</span>
            </div>
          )}

          {/* Target Info Matrix */}
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">TARGET ASSET IP:</span>
              <span className="font-bold text-cyan-400">{targetIp || 'Unknown IP'}</span>
            </div>
            {targetMac && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">TARGET MAC:</span>
                <span className="text-slate-300">{targetMac}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">ENFORCEMENT LAYER:</span>
              <span className="font-bold text-purple-300">
                {initialAction.toLowerCase().includes('quarantine')
                  ? 'Layer 2 (SDN Host Quarantine)'
                  : 'Layer 1 (Perimeter Firewall Block)'}
              </span>
            </div>
          </div>

          {/* High-Stakes Warning Box */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <p className="font-semibold text-amber-300 mb-0.5">Operational Consequence Warning</p>
              {isReverse ? (
                <span>
                  Releasing quarantine or unblocking will re-admit this target host to normal network routing.
                  Ensure the threat is fully mitigated and audited.
                </span>
              ) : (
                <span>
                  Enforcing quarantine will instruct the SDN controller to drop all host packets and cut network
                  connectivity immediately.
                </span>
              )}
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Audit Justification / Operator Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isReverse
                  ? 'e.g. Threat verified resolved; malware host remediated and clean.'
                  : 'e.g. Manual operator quarantine triggered following anomalous traffic burst.'
              }
              rows={2}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Explicit Confirmation Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={confirmedRisk}
              onChange={(e) => setConfirmedRisk(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-300 select-none">
              I have reviewed the target asset and confirm this enforcement action.
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canPerform || !confirmedRisk || isLoading}
              variant={isReverse ? 'default' : 'destructive'}
              className={`text-xs font-semibold flex items-center gap-1.5 ${
                isReverse ? 'bg-amber-600 hover:bg-amber-500 text-white' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-1" />
                  Dispatching Action...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isReverse ? 'Confirm & Reverse Action' : 'Confirm & Quarantine Host'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
