import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function useSessionTimeout(onTimeout: () => void) {
  const [isLocked, setIsLocked] = useState(false);
  const lastActiveRef = useRef(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
    lastActiveRef.current = Date.now();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const previous = appStateRef.current;
        appStateRef.current = nextState;

        if (previous.match(/inactive|background/) && nextState === 'active') {
          const elapsed = Date.now() - lastActiveRef.current;
          if (elapsed >= TIMEOUT_MS) {
            setIsLocked(true);
            onTimeoutRef.current();
          }
        }

        if (nextState.match(/inactive|background/)) {
          lastActiveRef.current = Date.now();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return { isLocked, resetTimer, unlock };
}
