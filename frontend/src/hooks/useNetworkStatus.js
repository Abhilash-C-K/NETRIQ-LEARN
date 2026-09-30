import { useState, useEffect } from 'react';

/**
 * useNetworkStatus
 * Lightweight, zero-dependency client-side hook for network connectivity monitoring.
 * Uses navigator.onLine and window 'online'/'offline' events with cleanup.
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};

export default useNetworkStatus;
