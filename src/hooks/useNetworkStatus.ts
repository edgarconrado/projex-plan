import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Estado inicial
    NetInfo.fetch().then((state) => {
      setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline((prev) => {
        if (!prev && online) setWasOffline(true); // acababa de reconectar
        return online;
      });
    });

    return () => unsubscribe();
  }, []);

  // Resetear wasOffline después de usarlo
  const clearWasOffline = () => setWasOffline(false);

  return { isOnline, wasOffline, clearWasOffline };
}
