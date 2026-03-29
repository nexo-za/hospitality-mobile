import AsyncStorage from '@react-native-async-storage/async-storage';
import createTaggedLogger from '../utils/appLogger';
import {
  type AppNotification,
  type EventMapping,
  NotificationPriority,
  SOCKET_EVENT_MAP,
} from '@/types/notifications';

const log = createTaggedLogger('NotificationService');

const STORAGE_KEY = 'notifications:state';
const MAX_NOTIFICATIONS = 100;

let idCounter = 0;
function nextId(): string {
  return `${Date.now()}-${++idCounter}`;
}

type ChangeListener = () => void;

class NotificationService {
  private _notifications: AppNotification[] = [];
  private _listeners = new Set<ChangeListener>();
  private _hydrated = false;

  // ── Public getters ──────────────────────────────────────────────────────

  get notifications(): ReadonlyArray<AppNotification> {
    return this._notifications;
  }

  get unreadCount(): number {
    return this._notifications.filter((n) => !n.read).length;
  }

  // ── Hydration ───────────────────────────────────────────────────────────

  async hydrate(): Promise<void> {
    if (this._hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this._notifications = JSON.parse(raw) as AppNotification[];
        this.pruneExpired();
        this.notify();
      }
    } catch (e) {
      log.error('Failed to hydrate notifications', e);
    }
    this._hydrated = true;
  }

  // ── Event → Notification mapping ────────────────────────────────────────

  /**
   * Given a raw socket event + payload, decide whether it produces
   * a notification for the current user.
   *
   * Returns the AppNotification if relevant, or null if it should be ignored.
   */
  mapEventToNotification(
    event: string,
    payload: Record<string, any>,
    currentUserId: number | undefined,
  ): AppNotification | null {
    const mapping: EventMapping | undefined = SOCKET_EVENT_MAP[event];
    if (!mapping) return null;

    if (!this.isRelevantToUser(event, payload, currentUserId)) return null;

    const notification: AppNotification = {
      id: nextId(),
      type: mapping.type,
      priority: mapping.priority,
      title: mapping.title(payload),
      body: mapping.body(payload),
      data: payload,
      read: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    this.addNotification(notification);
    return notification;
  }

  // ── Mutations ───────────────────────────────────────────────────────────

  markRead(id: string): void {
    const n = this._notifications.find((x) => x.id === id);
    if (n && !n.read) {
      n.read = true;
      this.persist();
      this.notify();
    }
  }

  markAllRead(): void {
    let changed = false;
    for (const n of this._notifications) {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    }
    if (changed) {
      this.persist();
      this.notify();
    }
  }

  clear(): void {
    this._notifications = [];
    this.persist();
    this.notify();
  }

  dismiss(id: string): void {
    this._notifications = this._notifications.filter((n) => n.id !== id);
    this.persist();
    this.notify();
  }

  // ── Subscription (for context) ──────────────────────────────────────────

  subscribe(listener: ChangeListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private isRelevantToUser(
    event: string,
    payload: Record<string, any>,
    currentUserId: number | undefined,
  ): boolean {
    if (!currentUserId) return false;

    // Approval requests go to managers — always show them
    if (event === 'approval:request') return true;

    // If the payload carries a serverId, only notify the assigned server
    if (payload.serverId != null) {
      return Number(payload.serverId) === currentUserId;
    }

    // For table:update, check if the server is assigned
    if (event === 'table:update' && payload.currentServerId != null) {
      return Number(payload.currentServerId) === currentUserId;
    }

    // Fallback: if no serverId is present, let the notification through
    // (this handles KDS and generic store-level events)
    return true;
  }

  private addNotification(notification: AppNotification): void {
    this._notifications = [notification, ...this._notifications].slice(
      0,
      MAX_NOTIFICATIONS,
    );
    this.persist();
    this.notify();
  }

  private pruneExpired(): void {
    const now = Date.now();
    this._notifications = this._notifications.filter(
      (n) => !n.expiresAt || n.expiresAt > now,
    );
  }

  private notify(): void {
    this._listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        log.error('Listener error', e);
      }
    });
  }

  private persist(): void {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(this._notifications),
    ).catch((e) => log.error('Persist failed', e));
  }
}

export default new NotificationService();
