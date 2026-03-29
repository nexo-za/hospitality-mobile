import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import notificationService from '@/api/services/notificationService';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AppNotification,
  NotificationPriority,
  PRIORITY_CONFIG,
  SOCKET_EVENT_MAP,
} from '@/types/notifications';
import * as Haptics from 'expo-haptics';

// ─── Context shape ───────────────────────────────────────────────────────────

interface NotificationContextValue {
  notifications: ReadonlyArray<AppNotification>;
  unreadCount: number;
  /** The notification currently being shown as a toast (if any). */
  activeToast: AppNotification | null;
  dismissToast: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      'useNotifications must be used within NotificationProvider',
    );
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const socket = useSocketSafe();

  const [notifications, setNotifications] = useState<
    ReadonlyArray<AppNotification>
  >(notificationService.notifications);
  const [unreadCount, setUnreadCount] = useState(
    notificationService.unreadCount,
  );
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastQueueRef = useRef<AppNotification[]>([]);

  // Sync state whenever NotificationService changes
  useEffect(() => {
    const unsub = notificationService.subscribe(() => {
      setNotifications([...notificationService.notifications]);
      setUnreadCount(notificationService.unreadCount);
    });
    return unsub;
  }, []);

  // Hydrate persisted notifications on mount
  useEffect(() => {
    notificationService.hydrate();
  }, []);

  // ── Toast queue management ──────────────────────────────────────────────

  const showNextToast = useCallback(() => {
    if (toastQueueRef.current.length === 0) {
      setActiveToast(null);
      return;
    }
    const next = toastQueueRef.current.shift()!;
    setActiveToast(next);

    const cfg = PRIORITY_CONFIG[next.priority];
    if (cfg.toastDurationMs > 0) {
      toastTimerRef.current = setTimeout(() => {
        toastTimerRef.current = null;
        showNextToast();
      }, cfg.toastDurationMs);
    }
    // CRITICAL (duration = 0) stays until user dismisses
  }, []);

  const enqueueToast = useCallback(
    (notification: AppNotification) => {
      // LOW priority never shows a toast
      if (notification.priority === NotificationPriority.LOW) return;

      // CRITICAL always jumps to front of queue and replaces current toast
      if (notification.priority === NotificationPriority.CRITICAL) {
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current);
          toastTimerRef.current = null;
        }
        toastQueueRef.current.unshift(notification);
        setActiveToast(notification);
        return;
      }

      if (!activeToast) {
        toastQueueRef.current.push(notification);
        showNextToast();
      } else {
        toastQueueRef.current.push(notification);
      }
    },
    [activeToast, showNextToast],
  );

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    showNextToast();
  }, [showNextToast]);

  // ── Socket event wiring ─────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const currentUserId = (user as any)?.id ?? (user as any)?.userId;
    const events = Object.keys(SOCKET_EVENT_MAP);
    const unsubscribes: (() => void)[] = [];

    for (const event of events) {
      const unsub = socket.on(event, (payload: Record<string, any>) => {
        const notification = notificationService.mapEventToNotification(
          event,
          payload,
          currentUserId,
        );
        if (!notification) return;

        // Haptic feedback
        const cfg = PRIORITY_CONFIG[notification.priority];
        if (cfg.hapticStyle) {
          Haptics.impactAsync(cfg.hapticStyle).catch(() => {});
        }

        enqueueToast(notification);
      });
      unsubscribes.push(unsub);
    }

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, [socket, user, enqueueToast]);

  // ── Exposed actions ─────────────────────────────────────────────────────

  const markRead = useCallback((id: string) => {
    notificationService.markRead(id);
  }, []);

  const markAllRead = useCallback(() => {
    notificationService.markAllRead();
  }, []);

  const clearAll = useCallback(() => {
    notificationService.clear();
  }, []);

  const dismiss = useCallback((id: string) => {
    notificationService.dismiss(id);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        dismissToast,
        markRead,
        markAllRead,
        clearAll,
        dismiss,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// ─── Safe socket hook (doesn't throw outside provider) ───────────────────────

function useSocketSafe() {
  try {
    return useSocket();
  } catch {
    return null;
  }
}
