import * as FileSystem from "expo-file-system";
import ApiLogger from "./logger";
import { Share } from "react-native";
import Constants from "expo-constants";

/**
 * Utility for accessing and sharing authentication logs
 */
class AuthLoggerUtil {
  /**
   * View auth logs that have been saved to the file system
   * This is useful after a build when console logs are not accessible
   */
  static async viewAuthLogs(): Promise<string> {
    try {
      const logger = ApiLogger.getInstance();
      return await logger.getAuthLogsFromFile();
    } catch (error) {
      console.error("Failed to read auth logs:", error);
      return `Error reading auth logs: ${error}`;
    }
  }

  /**
   * Share auth logs with developer via sharing menu
   * This can be used after a production build to help diagnose auth issues
   */
  static async shareAuthLogs(): Promise<boolean> {
    try {
      const logs = await this.viewAuthLogs();

      // Prepare text for sharing
      const appInfo = `
App: ${Constants.expoConfig?.name || "Nexo App"}
Version: ${Constants.expoConfig?.version || "unknown"}
Platform: ${Constants.platform?.os} ${Constants.platform?.version || ""}
Device: ${Constants.deviceName || "unknown"}
Time: ${new Date().toISOString()}
      `;

      const shareText = `${appInfo}\n\n=== AUTH LOGS ===\n${logs}`;

      // Share the logs
      const result = await Share.share({
        title: "Nexo Auth Logs",
        message: shareText,
      });

      return result.action !== Share.dismissedAction;
    } catch (error) {
      console.error("Failed to share auth logs:", error);
      return false;
    }
  }

  /**
   * Export logs to a file that can be attached to support emails
   */
  static async exportLogsToFile(): Promise<string | null> {
    try {
      const logs = await this.viewAuthLogs();

      // Create a logs directory if it doesn't exist
      const logsDir = `${FileSystem.documentDirectory}exported_logs`;
      const dirInfo = await FileSystem.getInfoAsync(logsDir);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(logsDir, { intermediates: true });
      }

      // Generate a filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `auth_logs_${timestamp}.txt`;
      const filePath = `${logsDir}/${filename}`;

      // Prepare content with app info
      const appInfo = `
App: ${Constants.expoConfig?.name || "Nexo App"}
Version: ${Constants.expoConfig?.version || "unknown"}
Platform: ${Constants.platform?.os} ${Constants.platform?.version || ""}
Device: ${Constants.deviceName || "unknown"}
Time: ${new Date().toISOString()}
      `;

      const fileContent = `${appInfo}\n\n=== AUTH LOGS ===\n${logs}`;

      // Write the file
      await FileSystem.writeAsStringAsync(filePath, fileContent);

      return filePath;
    } catch (error) {
      console.error("Failed to export auth logs to file:", error);
      return null;
    }
  }
}

export default AuthLoggerUtil;
