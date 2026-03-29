import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import logManager from './LogManager';

class FSManager {
  private isInitialized: boolean = false;
  private baseDir: string;
  private appDir: string;
  private logsDir: string;

  constructor() {
    // Set base directory based on platform
    this.baseDir = Platform.OS === 'ios' 
      ? RNFS.DocumentDirectoryPath 
      : RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath;
    
    this.appDir = `${this.baseDir}/nexo`;
    this.logsDir = `${this.appDir}/logs`;
    
    this.initialize();
  }

  /**
   * Initialize the filesystem
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      logManager.info('FSManager', 'Initializing filesystem access');
      
      // Create app directory if it doesn't exist
      const appDirExists = await RNFS.exists(this.appDir);
      if (!appDirExists) {
        logManager.info('FSManager', `Creating app directory: ${this.appDir}`);
        await RNFS.mkdir(this.appDir);
      }

      // Create logs directory if it doesn't exist
      const logsDirExists = await RNFS.exists(this.logsDir);
      if (!logsDirExists) {
        logManager.info('FSManager', `Creating logs directory: ${this.logsDir}`);
        await RNFS.mkdir(this.logsDir);
      }

      this.isInitialized = true;
      logManager.info('FSManager', 'Filesystem initialization complete');
      return true;
    } catch (error) {
      logManager.error('FSManager', 'Failed to initialize filesystem access', { error });
      return false;
    }
  }

  /**
   * Write a file to the filesystem
   */
  public async writeFile(filename: string, data: string, directory: 'app' | 'logs' = 'app'): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const dir = directory === 'logs' ? this.logsDir : this.appDir;
      const path = `${dir}/${filename}`;
      
      await RNFS.writeFile(path, data, 'utf8');
      return true;
    } catch (error) {
      logManager.error('FSManager', `Failed to write file: ${filename}`, { error });
      return false;
    }
  }

  /**
   * Read a file from the filesystem
   */
  public async readFile(filename: string, directory: 'app' | 'logs' = 'app'): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const dir = directory === 'logs' ? this.logsDir : this.appDir;
      const path = `${dir}/${filename}`;
      
      const exists = await RNFS.exists(path);
      if (!exists) {
        logManager.warn('FSManager', `File does not exist: ${path}`);
        return null;
      }
      
      return await RNFS.readFile(path, 'utf8');
    } catch (error) {
      logManager.error('FSManager', `Failed to read file: ${filename}`, { error });
      return null;
    }
  }

  /**
   * Delete a file from the filesystem
   */
  public async deleteFile(filename: string, directory: 'app' | 'logs' = 'app'): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const dir = directory === 'logs' ? this.logsDir : this.appDir;
      const path = `${dir}/${filename}`;
      
      const exists = await RNFS.exists(path);
      if (!exists) {
        return true; // File doesn't exist, so it's already "deleted"
      }
      
      await RNFS.unlink(path);
      return true;
    } catch (error) {
      logManager.error('FSManager', `Failed to delete file: ${filename}`, { error });
      return false;
    }
  }

  /**
   * List files in a directory
   */
  public async listFiles(directory: 'app' | 'logs' = 'app'): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const dir = directory === 'logs' ? this.logsDir : this.appDir;
      const files = await RNFS.readDir(dir);
      return files.map(file => file.name);
    } catch (error) {
      logManager.error('FSManager', `Failed to list files in directory: ${directory}`, { error });
      return [];
    }
  }

  /**
   * Export logs to a file
   */
  public async exportLogsToFile(data: string): Promise<string | null> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `logs_${timestamp}.txt`;
    
    const success = await this.writeFile(filename, data, 'logs');
    if (success) {
      const path = `${this.logsDir}/${filename}`;
      logManager.info('FSManager', `Logs exported to file: ${path}`);
      return path;
    }
    
    return null;
  }
}

// Create a singleton instance
const fsManager = new FSManager();
export default fsManager; 