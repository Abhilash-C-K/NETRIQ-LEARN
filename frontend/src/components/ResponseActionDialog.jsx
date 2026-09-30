import React, { useState } from 'react';
import { Button } from './ui/button';
import { ShieldAlert, AlertTriangle, X, Check, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ResponseActionDialog = ({
  isOpen,
  onClose,
  onConfirm,
  actionType = 'reverse',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101820]/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#19242E] border border-[#2A3944] rounded-lg shadow-2xl text-[#E7ECEF] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A3944] bg-[#101820]/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border ${
                isReverse
                  ? 'bg-[#D3A35D]/15 border-[#D3A35D]/30 text-[#D3A35D]'
                  : 'bg-[#DF857C]/15 border-[#DF857C]/30 text-[#DF857C]'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#E7ECEF] font-sans">
                {isReverse ? 'Confirm Mitigation Reversal' : 'Confirm Manual Containment'}
              </h3>
              <p className="text-xs text-[#9AA8B2] font-sans">
                {isReverse
                  ? 'Release an active firewall block or host isolation'
                  : 'Enforce Layer 2 port quarantine on the target host'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-md text-[#9AA8B2] hover:text-[#E7ECEF] hover:bg-[#202D36] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!canPerform && (
            <div className="p-3 bg-[#DF857C]/15 border border-[#DF857C]/30 rounded-lg flex items-center gap-2 text-xs text-[#DF857C] font-sans">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Permission Denied: Missing capability ({requiredCapability}).</span>
            </div>
          )}

          {/* Target Info */}
          <div className="bg-[#101820] p-3.5 rounded-lg border border-[#2A3944] space-y-1.5 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#9AA8B2]">TARGET ASSET IP:</span>
              <span className="font-bold text-[#E7ECEF]">{targetIp || 'Unknown IP'}</span>
            </div>
            {targetMac && (
              <div className="flex justify-between items-center">
                <span className="text-[#9AA8B2]">TARGET MAC:</span>
                <span className="text-[#E7ECEF]">{targetMac}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[#9AA8B2]">ENFORCEMENT LAYER:</span>
              <span className="font-bold text-[#7895B2]">
                {initialAction.toLowerCase().includes('quarantine')
                  ? 'Layer 2 (SDN Host Quarantine)'
                  : 'Layer 1 (Perimeter Firewall Block)'}
              </span>
            </div>
          </div>

          {/* High-Stakes Warning Box */}
          <div className="p-3 bg-[#D3A35D]/10 border border-[#D3A35D]/30 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#D3A35D] shrink-0 mt-0.5" />
            <div className="text-xs text-[#E7ECEF]/90 leading-relaxed font-sans">
              <p className="font-semibold text-[#D3A35D] mb-0.5">Operational Impact</p>
              {isReverse ? (
                <span>
                  Releasing quarantine will re-admit this target host to normal network routing.
                </span>
              ) : (
                <span>
                  Enforcing quarantine cuts host network connectivity immediately.
                </span>
              )}
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-sans font-medium text-[#9AA8B2] mb-1">
              Audit Justification / Operator Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Operator rationale for audit ledger..."
              rows={2}
              className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] placeholder-[#687883] focus:outline-none focus:border-[#71A99D] font-sans transition-colors"
            />
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={confirmedRisk}
              onChange={(e) => setConfirmedRisk(e.target.checked)}
              className="rounded border-[#2A3944] bg-[#101820] text-[#71A99D] w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-[#9AA8B2] select-none font-sans">
              I have reviewed the target asset and confirm this action.
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3944]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs border-[#2A3944] bg-[#101820] hover:bg-[#202D36] text-[#E7ECEF]"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={!canPerform || !confirmedRisk || isLoading}
              className={`text-xs font-sans font-semibold h-9 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
                isReverse
                  ? 'bg-[#7895B2] hover:bg-[#67839e] text-[#101820]'
                  : 'bg-[#DF857C] hover:bg-[#cf746b] text-[#101820]'
              }`}
            >
              {isLoading ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isReverse ? 'Confirm Reversal' : 'Confirm Quarantine'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ResponseActionDialog;
