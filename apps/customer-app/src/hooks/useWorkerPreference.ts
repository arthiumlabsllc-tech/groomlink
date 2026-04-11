import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const LAST_WORKER_KEY_PREFIX = 'lastWorker:';

export function useWorkerPreference(salonId: string) {
  const [lastWorkerId, setLastWorkerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load last worker on mount
  useEffect(() => {
    const loadLastWorker = async () => {
      try {
        const key = `${LAST_WORKER_KEY_PREFIX}${salonId}`;
        const savedWorkerId = await SecureStore.getItemAsync(key);
        setLastWorkerId(savedWorkerId);
      } catch (error) {
        console.error('Failed to load last worker preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (salonId) {
      loadLastWorker();
    }
  }, [salonId]);

  // Save worker preference
  const saveWorkerPreference = useCallback(async (workerId: string | null) => {
    try {
      const key = `${LAST_WORKER_KEY_PREFIX}${salonId}`;
      if (workerId) {
        await SecureStore.setItemAsync(key, workerId);
        setLastWorkerId(workerId);
      } else {
        await SecureStore.deleteItemAsync(key);
        setLastWorkerId(null);
      }
    } catch (error) {
      console.error('Failed to save worker preference:', error);
    }
  }, [salonId]);

  return {
    lastWorkerId,
    isLoading,
    saveWorkerPreference,
  };
}

export default useWorkerPreference;
