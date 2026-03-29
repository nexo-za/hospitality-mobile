import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import socketService from '@/api/services/socketService';

interface RealtimeConfig {
  storeId?: number;
  onTableUpdate?: (data: { tableId: number; status: string; checkId?: number }) => void;
  onCheckUpdate?: (data: { checkId: number; status: string }) => void;
  onKdsUpdate?: (data: any) => void;
  onApprovalRequest?: (data: { approvalId: number; requestType: string }) => void;
  onOrderReady?: (data: { checkNumber?: string; orderNumber?: string; tableName?: string }) => void;
}

// Maps API socket event names -> config handler keys.
// The API (OrderEventBus) emits these exact event names to `store:{storeId}`.
const EVENT_MAP: Record<string, keyof RealtimeConfig> = {
  'table:update': 'onTableUpdate',
  'check:update': 'onCheckUpdate',
  'check:opened': 'onCheckUpdate',
  'check:closed': 'onCheckUpdate',
  'check:voided': 'onCheckUpdate',
  'check:itemAdded': 'onCheckUpdate',
  'check:itemVoided': 'onCheckUpdate',
  'check:itemFired': 'onCheckUpdate',
  'kds:ticketCreated': 'onKdsUpdate',
  'kds:ticketStarted': 'onKdsUpdate',
  'kds:ticketReady': 'onKdsUpdate',
  'kds:ticketBumped': 'onKdsUpdate',
  'kds:ticketRecalled': 'onKdsUpdate',
  'kds:itemStatusChanged': 'onKdsUpdate',
  'approval:request': 'onApprovalRequest',
  'order:ready': 'onOrderReady',
};

export function useRealtimeUpdates(config: RealtimeConfig) {
  const configRef = useRef(config);
  configRef.current = config;

  let socket: ReturnType<typeof useSocket> | null = null;
  try {
    socket = useSocket();
  } catch {
    // SocketProvider not mounted — fall back to direct service usage
  }

  const subscribe = useCallback(
    (event: string, cb: (...args: any[]) => void): (() => void) => {
      if (socket?.on) return socket.on(event, cb);
      return socketService.on(event, cb);
    },
    [socket],
  );

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    Object.entries(EVENT_MAP).forEach(([event, handlerKey]) => {
      const handler = configRef.current[handlerKey];
      if (typeof handler === 'function') {
        unsubscribes.push(subscribe(event, handler as (...args: any[]) => void));
      }
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [
    config.storeId,
    config.onTableUpdate,
    config.onCheckUpdate,
    config.onKdsUpdate,
    config.onApprovalRequest,
    config.onOrderReady,
    subscribe,
  ]);

  return {
    isConnected: socket?.isConnected ?? socketService.isConnected,
  };
}
