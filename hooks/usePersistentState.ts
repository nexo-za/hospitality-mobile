import { useState, useEffect, useCallback } from 'react';
import storage from '@/utils/storage';

/**
 * A hook that persists state across app restarts
 * Similar to useState but stores/retrieves value from AsyncStorage
 * 
 * @param key Storage key
 * @param initialValue Default value if nothing is stored
 * @param secure Whether to use secure storage (for sensitive data)
 */
export function usePersistentState<T>(
  key: string, 
  initialValue: T, 
  secure = false
): [T, (value: T | ((prevValue: T) => T)) => Promise<void>, boolean] {
  const [state, setState] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load the value from storage when the component mounts
  useEffect(() => {
    async function loadStoredValue() {
      try {
        setIsLoading(true);
        let storedValue;
        
        if (secure) {
          storedValue = await storage.getSecureItem(key);
        } else {
          storedValue = await storage.getItem(key);
        }
        
        // Only update state if there was a value stored
        if (storedValue !== null) {
          setState(typeof storedValue === 'string' && typeof initialValue !== 'string' 
            ? JSON.parse(storedValue) 
            : storedValue);
        }
      } catch (error) {
        console.error(`Error loading persisted state for key "${key}":`, error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredValue();
  }, [key, initialValue, secure]);

  // Function to update both state and persisted value
  const setPersistentState = useCallback(
    async (value: T | ((prevValue: T) => T)) => {
      try {
        // Handle functional updates
        const newValue = value instanceof Function ? value(state) : value;
        
        // Update local state first
        setState(newValue);
        
        // Then persist to storage
        if (secure) {
          const valueToStore = typeof newValue === 'string' 
            ? newValue
            : JSON.stringify(newValue);
          await storage.setSecureItem(key, valueToStore);
        } else {
          await storage.setItem(key, newValue);
        }
      } catch (error) {
        console.error(`Error persisting state for key "${key}":`, error);
      }
    },
    [key, state, secure]
  );

  return [state, setPersistentState, isLoading];
}

/**
 * A hook to use cached state with expiration
 * If cached data exists and isn't expired, returns that first 
 * while loading fresh data in the background
 */
export function useCachedState<T>(
  key: string,
  fetchFn: () => Promise<T>,
  initialValue: T,
  cacheDuration = 60 * 60 * 1000 // 1 hour in milliseconds
): [T, () => Promise<void>, boolean, boolean] {
  const [state, setState] = useState<T>(initialValue);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch data and update state
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const freshData = await fetchFn();
      setState(freshData);
      setIsStale(false);
      
      // Cache the data with expiration
      await storage.setCachedItem(key, freshData, cacheDuration);
    } catch (error) {
      console.error(`Error fetching data for key "${key}":`, error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, key, cacheDuration]);

  // Load cached data and possibly refresh
  useEffect(() => {
    async function loadCachedData() {
      try {
        // Check for cached data
        const cachedData = await storage.getCachedItem(key);
        
        if (cachedData) {
          // Use cached data while fetching fresh data
          setState(cachedData);
          setIsStale(true);
          setIsLoading(false);
          
          // Fetch fresh data in the background
          fetchData();
        } else {
          // No cache, fetch data directly
          await fetchData();
        }
      } catch (error) {
        console.error(`Error loading cached state for key "${key}":`, error);
        setIsLoading(false);
        
        // If there's an error loading cache, try to fetch fresh data
        fetchData();
      }
    }

    loadCachedData();
  }, [key, fetchData]);

  return [state, fetchData, isLoading, isStale];
}

export default usePersistentState; 