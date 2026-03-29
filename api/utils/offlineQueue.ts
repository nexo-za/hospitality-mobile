import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import api from "../api";
import createTaggedLogger from "./appLogger";

const log = createTaggedLogger("OfflineQueue");

const STORAGE_KEY = "nexo_offline_queue";

export interface QueuedRequest {
  id: string;
  url: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  data?: any;
  headers?: Record<string, string>;
  createdAt: string;
  retries: number;
}

const MAX_RETRIES = 5;

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private flushing = false;
  private unsubscribeNetInfo: (() => void) | null = null;

  async init(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      this.queue = raw ? JSON.parse(raw) : [];
      log.info("Loaded", this.queue.length, "queued requests");
    } catch {
      this.queue = [];
    }

    this.unsubscribeNetInfo = NetInfo.addEventListener(this.onNetInfoChange);
  }

  destroy(): void {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
  }

  async enqueue(request: Omit<QueuedRequest, "id" | "createdAt" | "retries">): Promise<string> {
    const entry: QueuedRequest = {
      ...request,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      retries: 0,
    };

    this.queue.push(entry);
    await this.persist();
    log.info("Enqueued", entry.method, entry.url, "→ queue size:", this.queue.length);
    return entry.id;
  }

  async flush(): Promise<{ succeeded: number; failed: number }> {
    if (this.flushing || this.queue.length === 0) return { succeeded: 0, failed: 0 };

    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      log.warn("Still offline, skipping flush");
      return { succeeded: 0, failed: 0 };
    }

    this.flushing = true;
    let succeeded = 0;
    let failed = 0;

    const snapshot = [...this.queue];
    log.info("Flushing", snapshot.length, "queued requests");

    for (const entry of snapshot) {
      try {
        await api.request({
          url: entry.url,
          method: entry.method,
          data: entry.data,
          headers: entry.headers,
        });
        this.queue = this.queue.filter((q) => q.id !== entry.id);
        succeeded++;
      } catch (err: any) {
        entry.retries++;
        if (entry.retries >= MAX_RETRIES) {
          log.error("Dropping request after", MAX_RETRIES, "retries:", entry.url);
          this.queue = this.queue.filter((q) => q.id !== entry.id);
        }
        failed++;
      }
    }

    await this.persist();
    this.flushing = false;
    log.info("Flush complete:", { succeeded, failed, remaining: this.queue.length });
    return { succeeded, failed };
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getQueue(): ReadonlyArray<QueuedRequest> {
    return this.queue;
  }

  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      log.error("Failed to persist queue:", e);
    }
  }

  private onNetInfoChange = (state: NetInfoState): void => {
    if (state.isConnected && this.queue.length > 0) {
      log.info("Network restored, flushing queue…");
      this.flush();
    }
  };
}

export default new OfflineQueue();
