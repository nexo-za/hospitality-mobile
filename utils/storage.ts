import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Helper function to conditionally log only in development
const debugLog = (message: string, ...args: any[]) => {
  if (__DEV__) {
    console.log(message, ...args);
  }
};

/**
 * Keys used for storage across the app
 * Having them in one place helps prevent typos and makes refactoring easier
 */
export const STORAGE_KEYS = {
  // Auth related
  AUTH_TOKEN: "auth_token",
  USER_DATA: "user_data",
  USER_ID: "user_id",
  REMEMBERED_USERNAME: "remembered_username",
  API_TOKEN: "api_token",
  ACCESS_TOKEN: "access_token", // Add this new key for the JWT access token
  REFRESH_TOKEN: "refresh_token", // Add this new key for the refresh token
  API_USER: "api_user",
  API_PASSWORD: "api_password",



  // Session / Org
  SESSION_ID: "session_id",
  ORGANIZATION_CONFIG: "organization_config",

  // Shift related
  CURRENT_SHIFT: "currentShift",
  SHIFT_HISTORY: "shiftHistory",

  // Other app data
  SETTINGS: "app_settings",
  OFFLINE_TRANSACTIONS: "offline_transactions",
  SYNC_QUEUE: "sync_queue",
  LAST_SYNC_TIME: "last_sync_time",
};

/**
 * Gets the authentication token from secure storage
 * This is used by API endpoints that need the token for authentication
 */
export const getToken = async (): Promise<string | null> => {
  try {
    // Get the token from secure storage using the AUTH_TOKEN key
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    } else {
      // Try secure store first
      const secureToken = await SecureStore.getItemAsync(
        STORAGE_KEYS.AUTH_TOKEN
      );

      // If no secure token, fall back to user ID as token
      if (!secureToken) {
        return AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      }

      return secureToken;
    }
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

// export const getAccessToken = async (): Promise<string | null> => {
//   try {
//     // Get the access token from secure storage using the AUTH_TOKEN key
//     if (Platform.OS === "web") {
//       return AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
//     }else {
//       // Try secure store first
//       const secureToken = await SecureStore.getItemAsync(
//         STORAGE_KEYS.AUTH_TOKEN
//       ); 
//       // If no secure token, fall back to user ID as token
//       if (!secureToken) {
//         return AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
//       }
//       return secureToken;
//     }
//   } catch (error) {
//     console.error("Error getting access token:", error);
//     return null;
//   }
// };

/**
 * Default cache duration in milliseconds (1 hour)
 */
const DEFAULT_CACHE_DURATION = 60 * 60 * 1000;

/**
 * Storage service for handling secure and non-secure data persistence
 */
class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Store sensitive data securely
   * Falls back to AsyncStorage if SecureStore is not available (web platform)
   */
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        // For web, encrypt before storing if needed
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error(`Error storing secure item [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Retrieve sensitive data
   */
  async getSecureItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return await AsyncStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error retrieving secure item [${key}]:`, error);
      return null;
    }
  }

  /**
   * Remove secure item
   */
  async removeSecureItem(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`Error removing secure item [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Set item in storage
   */
  async setItem(key: string, value: any): Promise<void> {
    try {
      
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
      
    } catch (error) {
      console.error(`[Storage] Error storing item [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Get item from storage
   * @param parse - Whether to parse the retrieved value as JSON
   */
  async getItem(key: string, parse: boolean = true): Promise<any> {
    try {
     
      const value = await AsyncStorage.getItem(key);

      if (value === null) return null;

      try {
        return parse ? JSON.parse(value) : value;
      } catch (parseError) {
        // Gracefully handle parse errors - some values are stored as plain strings
        console.log(
          `[Storage] Note: Item for key [${key}] is not JSON, returning as string`
        );
        return value; // Return the raw value if parsing fails
      }
    } catch (error) {
      console.error(`[Storage] Error retrieving item [${key}]:`, error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Store data with expiration (cache)
   */
  async setCachedItem(
    key: string,
    value: any,
    duration: number = DEFAULT_CACHE_DURATION
  ): Promise<void> {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        expiry: Date.now() + duration,
      };
      await this.setItem(key, item);
    } catch (error) {
      console.error(`Error caching item [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Get cached data if not expired
   */
  async getCachedItem(key: string): Promise<any> {
    try {
      const cachedItem = await this.getItem(key);
      if (!cachedItem) return null;

      // Check if expired
      if (Date.now() > cachedItem.expiry) {
        await this.removeItem(key);
        return null;
      }

      return cachedItem.value;
    } catch (error) {
      console.error(`Error retrieving cached item [${key}]:`, error);
      return null;
    }
  }

  /**
   * Store data that needs to be synced later
   */
  async addToSyncQueue(data: any): Promise<void> {
    try {
      const queue = (await this.getItem(STORAGE_KEYS.SYNC_QUEUE)) || [];
      queue.push({
        id: Date.now().toString(),
        data,
        timestamp: Date.now(),
        attempts: 0,
      });
      await this.setItem(STORAGE_KEYS.SYNC_QUEUE, queue);
    } catch (error) {
      console.error("Error adding to sync queue:", error);
      throw error;
    }
  }

  /**
   * Get all items pending synchronization
   */
  async getSyncQueue(): Promise<any[]> {
    return (await this.getItem(STORAGE_KEYS.SYNC_QUEUE)) || [];
  }

  /**
   * Remove item from sync queue after successful sync
   */
  async removeFromSyncQueue(itemId: string): Promise<void> {
    try {
      const queue = (await this.getItem(STORAGE_KEYS.SYNC_QUEUE)) || [];
      const newQueue = queue.filter((item: any) => item.id !== itemId);
      await this.setItem(STORAGE_KEYS.SYNC_QUEUE, newQueue);
    } catch (error) {
      console.error("Error removing from sync queue:", error);
      throw error;
    }
  }

  /**
   * Clear all data from storage (useful for logout)
   * @param preserveKeys - Keys to preserve when clearing storage
   */
  async clearStorage(preserveKeys: string[] = []): Promise<void> {
    try {
      // Backup preserved keys
      const preserved: Record<string, any> = {};
      for (const key of preserveKeys) {
        const value = await this.getItem(key, false);
        if (value !== null) {
          preserved[key] = value;
        }
      }

      // Clear storage
      await AsyncStorage.clear();

      // Restore preserved keys
      for (const key of Object.keys(preserved)) {
        await AsyncStorage.setItem(key, preserved[key]);
      }

      // Clear secure storage (except preserved keys)
      if (Platform.OS !== "web") {
        const secureKeys = [
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.API_TOKEN,
          STORAGE_KEYS.API_PASSWORD,
        ];

        for (const key of secureKeys) {
          if (!preserveKeys.includes(key)) {
            await SecureStore.deleteItemAsync(key);
          }
        }
      }
    } catch (error) {
      console.error("Error clearing storage:", error);
      throw error;
    }
  }
}

export default StorageService.getInstance();
