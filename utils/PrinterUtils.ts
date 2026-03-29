// Lazy-load printer services to avoid triggering native modules at startup,
// especially under the New Architecture where some legacy modules may crash
// when method signatures are parsed.

/**
 * Utility class for checking printer availability
 */
class PrinterUtils {
  private static async loadDirectPrinterService(): Promise<any | null> {
    try {
      const mod = await import("./SunmiDirectPrinter");
      return mod.default ?? mod;
    } catch (error) {
      console.log(
        "[PrinterUtils] Failed to load direct printer service:",
        (error as Error)?.message
      );
      return null;
    }
  }

  private static async loadLegacyPrinterService(): Promise<any | null> {
    try {
      const mod = await import("./SunmiPrinter");
      return mod.default ?? mod;
    } catch (error) {
      console.log(
        "[PrinterUtils] Failed to load legacy Sunmi printer service:",
        (error as Error)?.message
      );
      return null;
    }
  }

  /**
   * Check if any printer is available (either direct or legacy)
   */
  public static async isAnyPrinterAvailable(): Promise<boolean> {
    try {
      console.log("[PrinterUtils] Starting printer availability check...");

      // Check direct printer first (this is a custom implementation that might not exist)
      try {
        const Direct = await PrinterUtils.loadDirectPrinterService();
        const directPrinterService = Direct?.getInstance?.();
        const isDirectAvailable = directPrinterService
          ? await directPrinterService.isPrinterAvailable()
          : false;

        if (isDirectAvailable) {
          console.log("[PrinterUtils] Direct printer is available");
          return true;
        } else {
          console.log("[PrinterUtils] Direct printer is not available");
        }
      } catch (directError) {
        console.log(
          "[PrinterUtils] Direct printer check failed:",
          (directError as Error).message
        );
      }

      // Check legacy printer (this uses the @heasy/react-native-sunmi-printer package)
      try {
        const Legacy = await PrinterUtils.loadLegacyPrinterService();
        const printerService = Legacy?.getInstance?.();
        const isLegacyAvailable = printerService
          ? await printerService.isPrinterAvailable()
          : false;

        if (isLegacyAvailable) {
          console.log("[PrinterUtils] Legacy printer is available");
          return true;
        } else {
          console.log("[PrinterUtils] Legacy printer is not available");
        }
      } catch (legacyError) {
        console.log(
          "[PrinterUtils] Legacy printer check failed:",
          (legacyError as Error).message
        );
      }

      console.log("[PrinterUtils] No printers are available");
      return false;
    } catch (error) {
      console.error(
        "[PrinterUtils] Error checking printer availability:",
        error
      );
      return false;
    }
  }

  /**
   * Get the available printer service (direct preferred, fallback to legacy)
   */
  public static async getAvailablePrinterService(): Promise<{
    service: any;
    isDirect: boolean;
  } | null> {
    try {
      console.log("[PrinterUtils] Getting available printer service...");

      // Check direct printer first
      try {
        const Direct = await PrinterUtils.loadDirectPrinterService();
        const directPrinterService = Direct?.getInstance?.();
        const isDirectAvailable = directPrinterService
          ? await directPrinterService.isPrinterAvailable()
          : false;

        if (isDirectAvailable) {
          console.log("[PrinterUtils] Using direct printer service");
          return { service: directPrinterService, isDirect: true };
        }
      } catch (directError) {
        console.log(
          "[PrinterUtils] Direct printer service unavailable:",
          (directError as Error).message
        );
      }

      // Check legacy printer
      try {
        const Legacy = await PrinterUtils.loadLegacyPrinterService();
        const printerService = Legacy?.getInstance?.();
        const isLegacyAvailable = printerService
          ? await printerService.isPrinterAvailable()
          : false;

        if (isLegacyAvailable) {
          console.log("[PrinterUtils] Using legacy printer service");
          return { service: printerService, isDirect: false };
        }
      } catch (legacyError) {
        console.log(
          "[PrinterUtils] Legacy printer service unavailable:",
          (legacyError as Error).message
        );
      }

      console.log("[PrinterUtils] No printer services available");
      return null;
    } catch (error) {
      console.error("[PrinterUtils] Error getting printer service:", error);
      return null;
    }
  }
}

export default PrinterUtils;
