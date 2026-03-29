import { useState, useCallback, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ordersService from '@/api/services/ordersService';
import tablesService from '@/api/services/tablesService';

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  createdAt: number;
  retries: number;
}

const QUEUE_KEY = '@nexo_offline_queue';
const MAX_RETRIES = 5;

async function persistQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function loadQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedAction[];
  } catch {
    return [];
  }
}

async function dispatchAction(action: QueuedAction): Promise<void> {
  const { type, payload } = action;

  switch (type) {
    case 'CREATE_CHECK':
      await ordersService.createCheck(payload);
      break;
    case 'ADD_ITEM':
      await ordersService.addItem(payload.checkId, payload);
      break;
    case 'FIRE_ITEMS':
      await ordersService.fireItems(payload.checkId, payload);
      break;
    case 'UPDATE_TABLE_STATUS':
      await tablesService.updateTableStatus(payload.tableId, payload);
      break;
    default:
      throw new Error(`Unknown offline action type: ${type}`);
  }
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const processingRef = useRef(false);

  useEffect(() => {
    loadQueue().then(setQueue);
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline((prev) => {
        if (!prev && online) {
          // Transitioned from offline -> online: process the queue
          processQueueInternal();
        }
        return online;
      });
    });

    NetInfo.fetch().then((state) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
    });

    return unsubscribe;
  }, []);

  const processQueueInternal = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const current = await loadQueue();
      const remaining: QueuedAction[] = [];

      for (const action of current) {
        try {
          await dispatchAction(action);
        } catch {
          const updated = { ...action, retries: action.retries + 1 };
          if (updated.retries < MAX_RETRIES) {
            remaining.push(updated);
          }
          // Actions exceeding MAX_RETRIES are silently dropped
        }
      }

      await persistQueue(remaining);
      setQueue(remaining);
    } finally {
      processingRef.current = false;
    }
  }, []);

  const enqueue = useCallback(
    async (type: string, payload: any) => {
      const action: QueuedAction = {
        id: generateId(),
        type,
        payload,
        createdAt: Date.now(),
        retries: 0,
      };

      setQueue((prev) => {
        const next = [...prev, action];
        persistQueue(next);
        return next;
      });
    },
    [],
  );

  const processQueue = useCallback(async () => {
    await processQueueInternal();
  }, [processQueueInternal]);

  const clearQueue = useCallback(async () => {
    setQueue([]);
    await persistQueue([]);
  }, []);

  return {
    isOnline,
    pendingCount: queue.length,
    enqueue,
    processQueue,
    clearQueue,
  };
}
