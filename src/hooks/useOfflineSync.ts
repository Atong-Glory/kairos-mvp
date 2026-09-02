import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn?: number; // milliseconds
}

interface OfflineSyncOptions {
  cacheKey: string;
  ttl?: number; // time to live in milliseconds, default 1 hour
}

interface UseOfflineSyncReturn<T> {
  data: T | null;
  isLoading: boolean;
  isOnline: boolean;
  isFromCache: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  clearCache: () => Promise<void>;
}

/**
 * Hook for managing offline-first data sync
 * Automatically caches data and retrieves from cache when offline
 * 
 * Usage:
 * ```
 * const { data, isOnline, isFromCache, refresh } = useOfflineSync({
 *   cacheKey: 'my-data',
 *   ttl: 3600000 // 1 hour
 * }, async () => {
 *   // fetch data from server
 *   const res = await supabase.from('table').select('*');
 *   return res;
 * });
 * ```
 */
export function useOfflineSync<T>(
  options: OfflineSyncOptions,
  fetchFn: () => Promise<T>,
): UseOfflineSyncReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const ttl = options.ttl || 3600000; // default 1 hour
  const cacheKey = `offline_cache_${options.cacheKey}`;

  // Get cached data
  const getFromCache = useCallback(async (): Promise<T | null> => {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (entry.expiresIn && entry.timestamp + entry.expiresIn < now) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return entry.data;
    } catch (err) {
      console.error('Error retrieving cache:', err);
      return null;
    }
  }, [cacheKey]);

  // Save to cache
  const saveToCache = useCallback(async (data: T) => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresIn: ttl,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  }, [cacheKey, ttl]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(cacheKey);
      setData(null);
      setIsFromCache(false);
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }, [cacheKey]);

  // Fetch data
  const fetchData = useCallback(async (fromCache = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const freshData = await fetchFn();
      setData(freshData);
      setIsFromCache(false);
      await saveToCache(freshData);
    } catch (err) {
      console.error('Error fetching data:', err);

      // Try to get from cache if fetch fails
      if (!fromCache) {
        const cachedData = await getFromCache();
        if (cachedData) {
          setData(cachedData);
          setIsFromCache(true);
        } else {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } else {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, saveToCache, getFromCache]);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? true;
      setIsOnline(online);

      // If back online, refresh data
      if (online && data === null) {
        fetchData(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [data, fetchData]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      // Check network status first
      const netState = await NetInfo.fetch();
      const online = netState.isConnected ?? true;
      setIsOnline(online);

      if (online) {
        // If online, try to fetch fresh data
        await fetchData(false);
      } else {
        // If offline, try to get from cache
        const cachedData = await getFromCache();
        if (cachedData) {
          setData(cachedData);
          setIsFromCache(true);
          setIsLoading(false);
        } else {
          // No cache available, try fetching anyway (might work with stored session)
          await fetchData(false);
        }
      }
    };

    init();
  }, []);

  const refresh = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isOnline,
    isFromCache,
    error,
    refresh,
    clearCache,
  };
}

/**
 * Hook for managing offline-first list data with incremental sync
 * Caches list items and syncs new ones when back online
 */
export function useOfflineList<T extends { id: string }>(
  options: OfflineSyncOptions,
  fetchFn: () => Promise<T[]>,
) {
  const [syncQueue, setSyncQueue] = useState<T[]>([]);
  const result = useOfflineSync(options, fetchFn);

  // Add item to sync queue (for items created offline)
  const addToSyncQueue = useCallback((item: T) => {
    setSyncQueue(prev => {
      const exists = prev.some(i => i.id === item.id);
      return exists ? prev : [...prev, item];
    });
  }, []);

  // Process sync queue (send queued items to server)
  const processSyncQueue = useCallback(async (syncFn: (items: T[]) => Promise<void>) => {
    if (syncQueue.length === 0) return;

    try {
      await syncFn(syncQueue);
      setSyncQueue([]); // Clear queue on success
      await result.refresh(); // Refresh data
    } catch (err) {
      console.error('Error processing sync queue:', err);
    }
  }, [syncQueue, result]);

  return {
    ...result,
    syncQueue,
    addToSyncQueue,
    processSyncQueue,
  };
}
