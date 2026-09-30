import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { WifiOff, Wifi, Loader2, CircleDot } from 'lucide-react';

/**
 * NetworkStatusBanner
 * Non-blocking floating status indicator for offline state and slow network requests.
 * Dismisses automatically the instant network or pending operations resolve.
 * Fully honors prefers-reduced-motion.
 */
export const NetworkStatusBanner = ({ isPending = false }) => {
  const { isOnline } = useNetworkStatus();
  const prefersReducedMotion = useReducedMotion();
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Briefly indicate restored connectivity when returning online
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // If online, not pending, and not showing the brief restored confirmation, render nothing
  if (isOnline && !isPending && !showRestored) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 pointer-events-none transition-all duration-200"
    >
      <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-lg border shadow-lg text-xs font-sans font-medium bg-[#1E2021] text-[#F1F0EA] border-[#303334]">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-[#C95F5F] shrink-0" aria-hidden="true" />
            <span>You're offline. Reconnecting...</span>
          </>
        ) : isPending ? (
          <>
            {prefersReducedMotion ? (
              <CircleDot className="w-4 h-4 text-[#8CA4B8] shrink-0" aria-hidden="true" />
            ) : (
              <Loader2 className="w-4 h-4 text-[#8CA4B8] shrink-0 animate-spin" aria-hidden="true" />
            )}
            <span>Network sync in progress...</span>
          </>
        ) : showRestored ? (
          <>
            <Wifi className="w-4 h-4 text-[#9AAA78] shrink-0" aria-hidden="true" />
            <span>Connection restored</span>
          </>
        ) : null}
      </div>
    </aside>
  );
};

export default NetworkStatusBanner;
