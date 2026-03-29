import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import Constants from "expo-constants";
import { Platform } from "react-native";

export interface ApiLogEntry {
  timestamp: string;
  type:
    | "REQUEST"
    | "RESPONSE"
    | "ERROR"
    | "CACHE"
    | "RESPONSE_SUCCESS"
    | "RESPONSE_ERROR"
    | "REQUEST_FAILED"
    | "AUTH_ERROR";
  endpoint: string;
  method: string;
  service?: string;
  params?: any;
  data?: any;
  status?: number;
}

class ApiLogger {
  private static instance: ApiLogger;
  private logs: ApiLogEntry[] = [];
  private maxLogs: number = 100;
  private storageKey: string = "@api_logs";
  private logFilePath: string | null = null;

  private constructor() {
    this.loadLogsFromStorage();
    this.setupFileLogging();
  }

  private async setupFileLogging() {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        // Create a logs directory if it doesn't exist
        const logsDir = `${FileSystem.documentDirectory}logs`;
        const dirInfo = await FileSystem.getInfoAsync(logsDir);

        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(logsDir, { intermediates: true });
        }

        // Set up path for auth-specific logs
        this.logFilePath = `${logsDir}/auth_logs.txt`;

        // Check if log file exists, create if not
        const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);
        if (!fileInfo.exists) {
          await FileSystem.writeAsStringAsync(
            this.logFilePath,
            `=== Auth Logs Started ${new Date().toISOString()} ===\n`,
            { encoding: FileSystem.EncodingType.UTF8 }
          );
        }
      } catch (error) {
        console.error("Failed to set up file logging:", error);
      }
    }
  }

  private async appendToLogFile(entry: ApiLogEntry) {
    // Only log auth-related errors to file
    if (
      !this.logFilePath ||
      !["AUTH_ERROR", "RESPONSE_ERROR"].includes(entry.type)
    ) {
      return;
    }

    try {
      // For auth errors, format a detailed log entry
      let logText = `\n[${entry.timestamp}] ${entry.type}: ${entry.method} ${entry.endpoint}\n`;

      if (entry.status) {
        logText += `Status: ${entry.status}\n`;
      }

      if (entry.data) {
        try {
          logText += `Data: ${JSON.stringify(entry.data, null, 2)}\n`;
        } catch (e) {
          logText += `Data: [Could not stringify]\n`;
        }
      }

      logText += `App Version: ${Constants.expoConfig?.version || "unknown"}\n`;
      logText += `-------------------------\n`;

      await FileSystem.writeAsStringAsync(this.logFilePath, logText, {
        append: true,
      });
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  public static getInstance(): ApiLogger {
    if (!ApiLogger.instance) {
      ApiLogger.instance = new ApiLogger();
    }
    return ApiLogger.instance;
  }

  private async loadLogsFromStorage() {
    try {
      const storedLogs = await AsyncStorage.getItem(this.storageKey);
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error("Error loading API logs from storage:", error);
    }
  }

  private async saveLogs() {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error("Error saving API logs to storage:", error);
    }
  }

  public addLog(log: ApiLogEntry) {
    // Add to the beginning of the array (most recent first)
    this.logs.unshift(log);

    // Trim logs if exceeding maximum
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Save to storage
    this.saveLogs();

    // Also append to log file if it's auth-related
    this.appendToLogFile(log);
  }

  public getLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.saveLogs();
  }

  public getLogsByEndpoint(endpoint: string): ApiLogEntry[] {
    return this.logs.filter((log) => log.endpoint.includes(endpoint));
  }

  public getLogsByService(service: string): ApiLogEntry[] {
    return this.logs.filter((log) => log.service === service);
  }

  public async getAuthLogsFromFile(): Promise<string> {
    if (!this.logFilePath) {
      return "File logging not available on this platform";
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);
      if (!fileInfo.exists) {
        return "No auth log file exists yet";
      }

      return await FileSystem.readAsStringAsync(this.logFilePath);
    } catch (error) {
      console.error("Error reading auth log file:", error);
      return `Error reading log file: ${error}`;
    }
  }
}

export default ApiLogger;
