import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import storage, { STORAGE_KEYS } from "./storage";
import api from "../api/api";

export interface SyncItem {
  id: string;
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
}

class NetworkManager {
  private static instance: NetworkManager;
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private listeners: ((isOnline: boolean) => void)[] = [];

  private constructor() {
    this.initializeNetworkListener();
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  /**
   * Initialize network listener
   */
  private initializeNetworkListener() {
    // Subscribe to network state updates
    NetInfo.addEventListener(this.handleNetworkChange);

    // Get initial network state
    NetInfo.fetch().then(this.handleNetworkChange);
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange = (state: NetInfoState) => {
    const wasOnline = this.isOnline;
    this.isOnline = !!state.isConnected;

    // If we came back online, trigger sync
    if (!wasOnline && this.isOnline) {
      console.log("[NetworkManager] Back online, triggering sync");
      this.syncOfflineData();
    }

    // Notify listeners
    if (wasOnline !== this.isOnline) {
      this.notifyListeners();
    }
  };

  /**
   * Check if device is online
   */
  public getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Add network state change listener
   */
  public addListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of network state change
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isOnline);
      } catch (error) {
        console.error("[NetworkManager] Error notifying listener:", error);
      }
    });
  }

  /**
   * Make API request with offline support
   * If offline, queue request for later
   */
  public async makeRequest<T = any>(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<T> {
    // If online, make the request directly
    if (this.isOnline) {
      try {
        const response = await api.request<T>({
          url: endpoint,
          method,
          data,
        });
        return response.data;
      } catch (error) {
        // If request failed and not due to network, rethrow
        if (error instanceof Error && !error.message.includes("network")) {
          throw error;
        }

        // If it's a network error, continue to offline logic
        console.log(
          "[NetworkManager] Network error, queueing for offline:",
          error
        );
      }
    }

    // If we're here, we're either offline or had a network error
    // Queue the request for later
    const syncItem: SyncItem = {
      id: Date.now().toString(),
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3,
    };

    await this.queueSyncItem(syncItem);

    throw new Error(
      "Device is offline. Your request has been queued for later."
    );
  }

  /**
   * Queue a request for later synchronization
   */
  private async queueSyncItem(item: SyncItem): Promise<void> {
    try {
      const queue = (await storage.getItem(STORAGE_KEYS.SYNC_QUEUE)) || [];
      queue.push(item);
      await storage.setItem(STORAGE_KEYS.SYNC_QUEUE, queue);
      console.log(
        `[NetworkManager] Queued item for sync: ${item.method} ${item.endpoint}`
      );
    } catch (error) {
      console.error("[NetworkManager] Error queueing sync item:", error);
      throw error;
    }
  }

  /**
   * Manually trigger sync of offline data
   */
  public async syncOfflineData(): Promise<{ success: number; failed: number }> {
    // Prevent multiple sync attempts
    if (this.syncInProgress || !this.isOnline) {
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let success = 0;
    let failed = 0;

    try {
      const queue: SyncItem[] =
        (await storage.getItem(STORAGE_KEYS.SYNC_QUEUE)) || [];

      if (queue.length === 0) {
        this.syncInProgress = false;
        return { success, failed };
      }

      console.log(`[NetworkManager] Attempting to sync ${queue.length} items`);

      // Process each queued request
      const remainingItems: SyncItem[] = [];

      for (const item of queue) {
        try {
          await api.request({
            url: item.endpoint,
            method: item.method,
            data: item.data,
          });

          success++;
        } catch (error) {
          console.error(
            `[NetworkManager] Sync failed for item: ${item.method} ${item.endpoint}`,
            error
          );

          // Increment attempt count and keep in queue if under max attempts
          item.attempts += 1;
          if (item.attempts < item.maxAttempts) {
            remainingItems.push(item);
          } else {
            failed++;
          }
        }
      }

      // Update queue with remaining items
      await storage.setItem(STORAGE_KEYS.SYNC_QUEUE, remainingItems);

      // Store last sync time
      await storage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, Date.now());

      console.log(
        `[NetworkManager] Sync completed. Success: ${success}, Failed: ${failed}, Remaining: ${remainingItems.length}`
      );

      return { success, failed };
    } catch (error) {
      console.error("[NetworkManager] Error during sync:", error);
      return { success, failed };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get the number of pending sync items
   */
  public async getPendingSyncCount(): Promise<number> {
    const queue = (await storage.getItem(STORAGE_KEYS.SYNC_QUEUE)) || [];
    return queue.length;
  }

  /**
   * Get the timestamp of the last successful sync
   */
  public async getLastSyncTime(): Promise<number | null> {
    return await storage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
  }

  /**
   * Clear the sync queue (for debugging purposes)
   */
  public async clearSyncQueue(): Promise<void> {
    try {
      await storage.setItem(STORAGE_KEYS.SYNC_QUEUE, []);
      console.log("[NetworkManager] Sync queue cleared");
    } catch (error) {
      console.error("[NetworkManager] Error clearing sync queue:", error);
      throw error;
    }
  }
}

export default NetworkManager.getInstance();
