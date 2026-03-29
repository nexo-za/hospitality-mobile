import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Maximum number of log entries to keep
const MAX_LOG_ENTRIES = 500;
const LOG_STORAGE_KEY = 'app_debug_logs';

export type LogEntry = {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  tag: string;
  message: string;
  data?: any;
};

class LogManager {
  private logs: LogEntry[] = [];
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const storedLogs = await AsyncStorage.getItem(LOG_STORAGE_KEY);
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize LogManager:', error);
    }
  }

  private async persistLogs() {
    if (!this.isInitialized) return;
    
    try {
      await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  /**
   * Add a log entry
   */
  public log(level: 'info' | 'warn' | 'error' | 'debug', tag: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      tag,
      message,
      data: data ? this.sanitizeData(data) : undefined
    };

    this.logs.unshift(entry); // Add to the beginning
    
    // Trim logs if they exceed the maximum
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(0, MAX_LOG_ENTRIES);
    }

    // Log to console as well for development
    if (__DEV__) {
      const logFn = level === 'error' ? console.error : 
                    level === 'warn' ? console.warn : 
                    level === 'debug' ? console.debug : 
                    console.log;
      logFn(`[${tag}] ${message}`, data);
    }

    // Persist logs
    this.persistLogs();
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // Clone the data to avoid modifying the original
    let sanitized = JSON.parse(JSON.stringify(data));
    
    // Sensitive keys to mask
    const sensitiveKeys = ['authenticationKey', 'secretKey', 'accessKey', 'password', 'cardNumber', 'cardNo', 'pan'];
    
    // Function to recursively sanitize objects
    const sanitizeObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        // Check if this is a sensitive key
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
          if (typeof obj[key] === 'string') {
            const strValue = obj[key] as string;
            if (strValue.length > 8) {
              // Mask the middle part
              obj[key] = `${strValue.substring(0, 4)}...${strValue.substring(strValue.length - 4)}`;
            } else if (strValue.length > 0) {
              // For short strings, just show the first and last character
              obj[key] = `${strValue.substring(0, 1)}...${strValue.substring(strValue.length - 1)}`;
            }
          } else {
            obj[key] = '[REDACTED]';
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Recursively sanitize nested objects
          sanitizeObject(obj[key]);
        }
      });
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Log info level message
   */
  public info(tag: string, message: string, data?: any) {
    this.log('info', tag, message, data);
  }

  /**
   * Log warning level message
   */
  public warn(tag: string, message: string, data?: any) {
    this.log('warn', tag, message, data);
  }

  /**
   * Log error level message
   */
  public error(tag: string, message: string, data?: any) {
    this.log('error', tag, message, data);
  }

  /**
   * Log debug level message
   */
  public debug(tag: string, message: string, data?: any) {
    this.log('debug', tag, message, data);
  }

  /**
   * Get all logs
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Filter logs by level
   */
  public filterByLevel(level: 'info' | 'warn' | 'error' | 'debug'): LogEntry[] {
    return this.logs.filter(entry => entry.level === level);
  }

  /**
   * Filter logs by tag
   */
  public filterByTag(tag: string): LogEntry[] {
    return this.logs.filter(entry => entry.tag.includes(tag));
  }

  /**
   * Clear all logs
   */
  public async clearLogs() {
    this.logs = [];
    await this.persistLogs();
  }

  /**
   * Export logs as a string
   */
  public exportLogs(): string {
    return this.logs.map(entry => {
      const date = new Date(entry.timestamp);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      const data = entry.data ? `\nData: ${JSON.stringify(entry.data, null, 2)}` : '';
      return `[${formattedDate}] [${entry.level.toUpperCase()}] [${entry.tag}]: ${entry.message}${data}`;
    }).join('\n\n');
  }
}

// Create a singleton instance
const logManager = new LogManager();
export default logManager; 