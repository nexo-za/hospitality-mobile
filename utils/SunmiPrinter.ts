import SunmiPrinter from "@heasy/react-native-sunmi-printer";
import { Platform, NativeModules } from "react-native";

// Create a safe wrapper for RNFS to avoid RNFSFileTypeRegular errors
let RNFS: any = null;
try {
  RNFS = require("react-native-fs");
  if (typeof RNFS === "undefined" || RNFS === null) {
    console.warn("RNFS library loaded but is undefined or null");
  }
} catch (err) {
  console.error("Failed to load react-native-fs:", err);
}

// Initialize RNFS with a null check to avoid RNFSFileTypeRegular errors
const isRNFSAvailable =
  RNFS !== null &&
  typeof RNFS !== "undefined" &&
  typeof RNFS.MainBundlePath !== "undefined";

if (!isRNFSAvailable) {
  console.error("React Native FS is not properly initialized");
}

/**
 * Utility class for handling Sunmi printer operations
 */
class SunmiPrinterService {
  private static instance: SunmiPrinterService;
  private initialized: boolean = false;
  private nativeModuleAvailable: boolean = false;

  private constructor() {
    // Check if the native module is available
    this.nativeModuleAvailable = this.checkNativeModule();
    // Only try to initialize if the module is available
    if (this.nativeModuleAvailable) {
      this.init();
    } else {
      console.log(
        "Sunmi printer native module is not available, skipping initialization"
      );
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SunmiPrinterService {
    if (!SunmiPrinterService.instance) {
      SunmiPrinterService.instance = new SunmiPrinterService();
    }
    return SunmiPrinterService.instance;
  }

  /**
   * Check if the printer service is available
   */
  public async isPrinterAvailable(): Promise<boolean> {
    return this.nativeModuleAvailable;
  }

  /**
   * Check if the native module is properly available
   */
  private checkNativeModule(): boolean {
    if (Platform.OS !== "android") {
      console.log("Sunmi printer is only available on Android devices");
      return false;
    }

    // Check for both possible module names in NativeModules
    const moduleAvailable =
      (NativeModules.RNSunmiPrinter !== null &&
        typeof NativeModules.RNSunmiPrinter !== "undefined") ||
      (NativeModules.SunmiPrinter !== null &&
        typeof NativeModules.SunmiPrinter !== "undefined");

    if (!moduleAvailable) {
      console.log(
        "Sunmi printer native module is not available - checking available modules:",
        Object.keys(NativeModules).filter(
          (key) =>
            key.toLowerCase().includes("sunmi") ||
            key.toLowerCase().includes("printer")
        )
      );
    }

    // Also verify the SunmiPrinter object from the package
    const packageAvailable =
      SunmiPrinter !== null &&
      typeof SunmiPrinter !== "undefined" &&
      typeof SunmiPrinter.printerInit === "function";

    if (!packageAvailable) {
      console.log(
        "Sunmi printer package functions are not available - SunmiPrinter object:",
        !!SunmiPrinter
      );
    }

    const isAvailable = moduleAvailable && packageAvailable;
    console.log(
      `[SunmiPrinterService] Module check result: native=${moduleAvailable}, package=${packageAvailable}, final=${isAvailable}`
    );

    return isAvailable;
  }

  /**
   * Check if the Sunmi Printer module is available
   */
  public isModuleAvailable(): boolean {
    return this.nativeModuleAvailable;
  }

  /**
   * Initialize the printer
   */
  public async init(): Promise<boolean> {
    if (!this.nativeModuleAvailable) {
      console.error(
        "Cannot initialize Sunmi printer: Native module is not available"
      );
      return false;
    }

    try {
      // Initialize the printer
      SunmiPrinter.printerInit();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize Sunmi printer:", error);
      return false;
    }
  }

  /**
   * Check if printer is ready to use
   */
  public async isPrinterReady(): Promise<boolean> {
    if (!this.nativeModuleAvailable) {
      console.error(
        "Cannot check if printer is ready: Native module is not available"
      );
      return false;
    }

    if (!this.initialized) {
      await this.init();
    }
    return this.initialized;
  }

  /**
   * Print logo on receipt
   * Removed image printing to avoid bitmap-related crashes on devices.
   * Kept as a no-op to preserve call sites without breaking behavior.
   */
  private async printLogo(_alignment: number = 1): Promise<void> {
    // Intentionally no-op: we do not print images/logos anymore
    return Promise.resolve();
  }

  /**
   * Print a test receipt
   */
  public async printTestReceipt(): Promise<void> {
    if (!this.nativeModuleAvailable) {
      throw new Error("Sunmi printer module is not available on this device");
    }

    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      // Logo printing removed (no-op)

      // Print header
      SunmiPrinter.setAlignment(1); // CENTER = 1
      SunmiPrinter.setFontSize(30);
      SunmiPrinter.printerText("TEST RECEIPT\n");
      SunmiPrinter.setFontSize(24);
      SunmiPrinter.printerText("================\n");

      // Store Details (simplified)
      SunmiPrinter.printerText("Nexo\n");
      SunmiPrinter.printerText("--------------------------------\n");

      // Reset alignment and font
      SunmiPrinter.setAlignment(0); // LEFT = 0
      SunmiPrinter.setFontSize(24);

      // Print date and receipt number
      SunmiPrinter.printerText(
        `Date: ${new Date().toLocaleDateString("en-ZA")}\n`
      );
      SunmiPrinter.printerText(
        `Time: ${new Date().toLocaleTimeString("en-ZA")}\n`
      );
      SunmiPrinter.printerText(
        `Receipt: TEST-${Math.floor(1000 + Math.random() * 9000)}\n`
      );
      SunmiPrinter.printerText(`Teller: John Doe\n`);
      SunmiPrinter.printerText("--------------------------------\n");

      // Print items
      SunmiPrinter.printerText("ITEMS:\n");
      SunmiPrinter.printColumnsText(
        ["Product", "Qty", "Price"],
        [16, 4, 12],
        [0, 1, 2] // LEFT = 0, CENTER = 1, RIGHT = 2
      );

      SunmiPrinter.printColumnsText(
        ["Test Item 1", "1", "R 25.00"],
        [20, 4, 8],
        [0, 1, 2] // LEFT = 0, CENTER = 1, RIGHT = 2
      );

      SunmiPrinter.printColumnsText(
        ["Test Item 2", "2", "R 30.00"],
        [20, 4, 8],
        [0, 1, 2] // LEFT = 0, CENTER = 1, RIGHT = 2
      );

      SunmiPrinter.printerText("--------------------------------\n");

      // Print total
      SunmiPrinter.setAlignment(2); // RIGHT = 2

      // For bold text, we'll just use setFontSize with larger font
      SunmiPrinter.setFontSize(28);
      SunmiPrinter.printerText("Subtotal: R 85.00\n");
      SunmiPrinter.printerText("VAT (15%): R 12.75\n");
      SunmiPrinter.printerText("Total: R 97.75\n");
      SunmiPrinter.setFontSize(24);

      // Print footer
      SunmiPrinter.setAlignment(1); // CENTER = 1
      SunmiPrinter.printerText("--------------------------------\n");
      SunmiPrinter.printerText("Thank you for shopping with us!\n");
      SunmiPrinter.printerText("Visit us at: www.nexo.app\n");

      // Add legal text
      SunmiPrinter.setFontSize(20);
      SunmiPrinter.printerText("This is your tax invoice\n");
      SunmiPrinter.printerText(
        "Goods cannot be returned once they have left our premises\n\n"
      );
      SunmiPrinter.setFontSize(24);

      // Add extra space at the end
      SunmiPrinter.printerText("\n\n\n");

      // Cut paper
      try {
        SunmiPrinter.cutPaper();
        console.log(
          "[SunmiPrinter] Test receipt completed successfully - paper cut"
        );
      } catch (cutError) {
        console.log(
          "[SunmiPrinter] Paper cutting failed:",
          (cutError as Error).message
        );
        // Continue even if cutting fails
      }

      console.log(
        "[SunmiPrinter] Test receipt printing completed successfully"
      );
    } catch (error) {
      console.error("[SunmiPrinter] Failed to print test receipt:", error);
      throw error;
    }
  }

  /**
   * Print a receipt (alias for printSaleReceipt for compatibility)
   * @param saleData Sale data with receipt information
   */
  public async printReceipt(saleData: {
    paymentType: string;
    total: number;
    items: {
      name: string;
      quantity: number;
      price: number;
    }[];
    customerName?: string;
    receiptNumber: string;
    tellerName?: string;
    storeName?: string;
    cardDetails?: any;
  }): Promise<void> {
    // Convert to the format expected by printSaleReceipt
    return this.printSaleReceipt({
      paymentType: saleData.paymentType,
      total: saleData.total,
      items: saleData.items,
      customerName: saleData.customerName,
      receiptNumber: saleData.receiptNumber,
      tellerName: saleData.tellerName,
      storeName: saleData.storeName,
      cardDetails: saleData.cardDetails,
    });
  }

  /**
   * Print a sale receipt
   * @param saleData Sale data with receipt information
   */
  public async printSaleReceipt(saleData: {
    paymentType: string;
    total: number;
    items: {
      name: string;
      quantity: number;
      price: number;
    }[];
    customerName?: string;
    date?: Date;
    receiptNumber?: string;
    cardDetails?: any;
    subtotalOverride?: number;
    taxOverride?: number;
    tellerName?: string;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    vatNumber?: string;
  }): Promise<void> {
    if (!this.nativeModuleAvailable) {
      throw new Error("Sunmi printer module is not available on this device");
    }

    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      const date = saleData.date || new Date();
      const receiptNumber =
        saleData.receiptNumber ||
        `NX-${Math.floor(1000 + Math.random() * 9000)}`;
      const tellerName = saleData.tellerName || "Admin";
      const storeName = saleData.storeName || "Nexo";
      // Removed address, phone, VAT per requirement

      // Logo printing removed (no-op)

      // Print store name only
      console.log("[SunmiPrinter] Printing store name...");
      SunmiPrinter.setAlignment(1); // CENTER = 1
      SunmiPrinter.setFontSize(28);
      SunmiPrinter.printerText(`${storeName}\n`);
      console.log("[SunmiPrinter] Store name printed successfully");

      console.log("[SunmiPrinter] Printing receipt header...");
      SunmiPrinter.setFontSize(30);
      SunmiPrinter.printerText("SALES RECEIPT\n");
      SunmiPrinter.setFontSize(24);
      SunmiPrinter.printerText("================\n");
      console.log("[SunmiPrinter] Receipt header printed successfully");

      // Reset alignment and font
      SunmiPrinter.setAlignment(0); // LEFT = 0
      SunmiPrinter.setFontSize(24);

      // Print date and receipt number
      SunmiPrinter.printerText(`Date: ${date.toLocaleDateString("en-ZA")}\n`);
      SunmiPrinter.printerText(`Time: ${date.toLocaleTimeString("en-ZA")}\n`);
      SunmiPrinter.printerText(`Receipt: ${receiptNumber}\n`);
      SunmiPrinter.printerText(`Teller: ${tellerName}\n`);

      // Print customer info if available
      if (saleData.customerName) {
        SunmiPrinter.printerText(`Customer: ${saleData.customerName}\n`);
      }

      SunmiPrinter.printerText("--------------------------------\n");

      // Print items
      console.log("[SunmiPrinter] Printing items section...");
      SunmiPrinter.printerText("ITEMS:\n");

      try {
        SunmiPrinter.printColumnsText(
          ["Product", "Qty", "Price"],
          [16, 4, 12],
          [0, 1, 2] // LEFT = 0, CENTER = 1, RIGHT = 2
        );
        console.log("[SunmiPrinter] Items header printed successfully");
      } catch (columnError) {
        console.error("[SunmiPrinter] Column printing failed:", columnError);
        // Fallback to simple text
        SunmiPrinter.printerText("Product          Qty    Price\n");
      }

      // Print each item
      console.log(`[SunmiPrinter] Printing ${saleData.items.length} items...`);
      let subtotal = 0;
      for (const [index, item] of saleData.items.entries()) {
        const lineTotal = item.quantity * item.price;
        subtotal += lineTotal;

        try {
          SunmiPrinter.printColumnsText(
            [
              item.name.length > 16
                ? item.name.substring(0, 13) + "..."
                : item.name,
              item.quantity.toString(),
              `R ${item.price.toFixed(2)}`,
            ],
            [16, 4, 12],
            [0, 1, 2] // LEFT = 0, CENTER = 1, RIGHT = 2
          );
          console.log(
            `[SunmiPrinter] Item ${index + 1} printed successfully: ${
              item.name
            }`
          );
        } catch (itemError) {
          console.error(
            `[SunmiPrinter] Item ${index + 1} printing failed:`,
            itemError
          );
          // Fallback to simple text
          const itemName =
            item.name.length > 16
              ? item.name.substring(0, 13) + "..."
              : item.name;
          SunmiPrinter.printerText(
            `${itemName.padEnd(16)} ${item.quantity
              .toString()
              .padStart(4)} R ${item.price.toFixed(2).padStart(8)}\n`
          );
        }
      }

      SunmiPrinter.printerText("--------------------------------\n");

      // Print total
      SunmiPrinter.setAlignment(2); // RIGHT = 2

      // Use provided subtotal if available, otherwise calculate from items
      const finalSubtotal =
        saleData.subtotalOverride !== undefined
          ? saleData.subtotalOverride
          : subtotal;

      // For bold text, we'll just use setFontSize with larger font
      SunmiPrinter.setFontSize(28);
      SunmiPrinter.printerText(`Subtotal: R ${finalSubtotal.toFixed(2)}\n`);

      // Calculate tax (15% VAT) or use provided tax override
      const tax =
        saleData.taxOverride !== undefined
          ? saleData.taxOverride
          : finalSubtotal * 0.15;
      SunmiPrinter.printerText(`VAT (15%): R ${tax.toFixed(2)}\n`);

      // Print total with bold formatting
      SunmiPrinter.printerText(`Total: R ${saleData.total.toFixed(2)}\n`);
      SunmiPrinter.setFontSize(24);

      // Print payment method
      SunmiPrinter.setAlignment(0); // LEFT = 0
      SunmiPrinter.printerText(`Payment Method: ${saleData.paymentType}\n`);

      // If card payment, print card details
      if (saleData.paymentType === "ECENTRIC" && saleData.cardDetails) {
        SunmiPrinter.printerText("--------------------------------\n");
        SunmiPrinter.printerText("CARD PAYMENT DETAILS:\n");

        const cardDetails = saleData.cardDetails;

        // Get receipt details if available
        let receiptDetails = null;
        try {
          if (cardDetails.ecentric_receipt_details) {
            receiptDetails =
              typeof cardDetails.ecentric_receipt_details === "string"
                ? JSON.parse(cardDetails.ecentric_receipt_details)
                : cardDetails.ecentric_receipt_details;
          }
        } catch (error) {
          console.error("Error parsing receipt details:", error);
        }

        // Card type/name
        if (receiptDetails?.APPLICATION_LABEL) {
          SunmiPrinter.printerText(
            `Card Type: ${receiptDetails.APPLICATION_LABEL}\n`
          );
        } else if (cardDetails.ecentric_card_type) {
          SunmiPrinter.printerText(
            `Card Type: ${cardDetails.ecentric_card_type}\n`
          );
        }

        // Card number (PAN with BIN)
        if (receiptDetails?.PAN_WITH_BIN) {
          SunmiPrinter.printerText(
            `Card Number: ${receiptDetails.PAN_WITH_BIN}\n`
          );
        } else if (cardDetails.ecentric_masked_pan) {
          SunmiPrinter.printerText(
            `Card Number: ${cardDetails.ecentric_masked_pan}\n`
          );
        }

        // Transaction type
        if (receiptDetails?.CARD_TRANSACTION_TYPE) {
          SunmiPrinter.printerText(
            `Transaction Type: ${receiptDetails.CARD_TRANSACTION_TYPE}\n`
          );
        }

        // Authorization code
        if (cardDetails.ecentric_auth_code) {
          SunmiPrinter.printerText(
            `Auth Code: ${cardDetails.ecentric_auth_code}\n`
          );
        } else if (receiptDetails?.AUTH_CODE) {
          SunmiPrinter.printerText(`Auth Code: ${receiptDetails.AUTH_CODE}\n`);
        }

        // RRN (Retrieval Reference Number)
        if (cardDetails.ecentric_rrn) {
          SunmiPrinter.printerText(`RRN: ${cardDetails.ecentric_rrn}\n`);
        } else if (receiptDetails?.RRN) {
          SunmiPrinter.printerText(`RRN: ${receiptDetails.RRN}\n`);
        }

        // Terminal ID
        if (cardDetails.ecentric_terminal_id) {
          SunmiPrinter.printerText(
            `Terminal ID: ${cardDetails.ecentric_terminal_id}\n`
          );
        } else if (receiptDetails?.TERMINAL_ID) {
          SunmiPrinter.printerText(
            `Terminal ID: ${receiptDetails.TERMINAL_ID}\n`
          );
        }

        // Merchant ID
        if (receiptDetails?.MERCHANT_ID) {
          SunmiPrinter.printerText(
            `Merchant ID: ${receiptDetails.MERCHANT_ID}\n`
          );
        }

        // Status
        if (receiptDetails?.STATUS) {
          SunmiPrinter.printerText(`Status: ${receiptDetails.STATUS}\n`);
        } else if (cardDetails.ecentric_result_desc) {
          SunmiPrinter.printerText(
            `Status: ${cardDetails.ecentric_result_desc}\n`
          );
        }

        // Verification method
        if (receiptDetails?.CVM) {
          SunmiPrinter.printerText(`Verification: ${receiptDetails.CVM}\n`);
        }
      }

      // Print footer
      SunmiPrinter.setAlignment(1); // CENTER = 1
      SunmiPrinter.printerText("--------------------------------\n");
      SunmiPrinter.printerText("Thank you for shopping with us!\n");
      SunmiPrinter.printerText("Visit us at: www.nexo.app\n");

      // Add legal text for South African receipts
      SunmiPrinter.setFontSize(20);
      SunmiPrinter.printerText("This is your tax invoice\n");
      SunmiPrinter.printerText(
        "Goods cannot be returned once they have left our premises\n\n"
      );
      SunmiPrinter.setFontSize(24);

      // Add extra space at the end
      SunmiPrinter.printerText("\n\n\n\n");

      // Cut paper
      try {
        SunmiPrinter.cutPaper();
        console.log(
          "[SunmiPrinter] Receipt completed successfully - paper cut"
        );
      } catch (cutError) {
        console.log(
          "[SunmiPrinter] Paper cutting failed:",
          (cutError as Error).message
        );
        // Continue even if cutting fails
      }

      console.log(
        "[SunmiPrinter] Sale receipt printing completed successfully"
      );
    } catch (error) {
      console.error("[SunmiPrinter] Failed to print sale receipt:", error);
      throw error;
    }
  }

  /**
   * Print a split payment receipt with multiple payment methods
   */
  public async printSplitPaymentReceipt(saleData: {
    total: number;
    items: {
      name: string;
      quantity: number;
      price: number;
    }[];
    payments: Array<{
      type: string;
      amount: number;
      cardDetails?: any;
    }>;
    customerName?: string;
    date?: Date;
    receiptNumber?: string;
    subtotalOverride?: number;
    taxOverride?: number;
    tellerName?: string;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    vatNumber?: string;
  }): Promise<void> {
    try {
      const date = saleData.date || new Date();
      const receiptNumber =
        saleData.receiptNumber ||
        `NX-${Math.floor(1000 + Math.random() * 9000)}`;
      const tellerName = saleData.tellerName || "Admin";
      const storeName = saleData.storeName || "Nexo";
      const storeAddress =
        saleData.storeAddress ||
        "New Era Brand Management (Pty) Ltd\n44 Lake Road, Longmeadow Business Estate, Lethabong";
      const storePhone = saleData.storePhone || "021-555-1234";
      const vatNumber = saleData.vatNumber || "4340266289";

      // Initialize the printer
      SunmiPrinter.printerInit();

      // Print company logo/header
      SunmiPrinter.setAlignment(1); // CENTER = 1
      SunmiPrinter.setFontSize(28);
      SunmiPrinter.printerText(`${storeName}\n`);
      SunmiPrinter.setFontSize(22);
      SunmiPrinter.printerText(`${storeAddress}\n`);
      SunmiPrinter.printerText(`Tel: ${storePhone}\n`);
      SunmiPrinter.printerText(`VAT# ${vatNumber}\n`);

      SunmiPrinter.setFontSize(30);
      SunmiPrinter.printerText("SALES RECEIPT\n");
      SunmiPrinter.setFontSize(24);
      SunmiPrinter.printerText("================\n");

      // Reset alignment and font
      SunmiPrinter.setAlignment(0); // LEFT = 0

      // Print date and receipt number
      SunmiPrinter.printerText(`Date: ${date.toLocaleDateString("en-ZA")}\n`);
      SunmiPrinter.printerText(`Time: ${date.toLocaleTimeString("en-ZA")}\n`);
      SunmiPrinter.printerText(`Receipt: ${receiptNumber}\n`);
      SunmiPrinter.printerText(`Teller: ${tellerName}\n`);

      // Print customer info if available
      if (saleData.customerName) {
        SunmiPrinter.printerText(`Customer: ${saleData.customerName}\n`);
      }

      SunmiPrinter.printerText("--------------------------------\n");

      // Print items
      SunmiPrinter.printerText("ITEMS:\n");
      let subtotal = 0;
      for (const item of saleData.items) {
        const lineTotal = item.quantity * item.price;
        subtotal += lineTotal;
        SunmiPrinter.printerText(
          `${item.name}\n  ${item.quantity} x R${item.price.toFixed(2)} = R${lineTotal.toFixed(2)}\n`
        );
      }

      SunmiPrinter.printerText("--------------------------------\n");

      // Print total
      SunmiPrinter.setAlignment(2); // RIGHT = 2

      const finalSubtotal =
        saleData.subtotalOverride !== undefined
          ? saleData.subtotalOverride
          : subtotal;

      SunmiPrinter.setFontSize(28);
      SunmiPrinter.printerText(`Subtotal: R ${finalSubtotal.toFixed(2)}\n`);

      const tax =
        saleData.taxOverride !== undefined
          ? saleData.taxOverride
          : finalSubtotal * 0.15;
      SunmiPrinter.printerText(`VAT (15%): R ${tax.toFixed(2)}\n`);

      SunmiPrinter.printerText(`Total: R ${saleData.total.toFixed(2)}\n`);
      SunmiPrinter.setFontSize(24);

      // Print split payment methods
      SunmiPrinter.setAlignment(0); // LEFT = 0
      SunmiPrinter.printerText("--------------------------------\n");
      SunmiPrinter.setFontSize(26);
      SunmiPrinter.printerText("SPLIT PAYMENT METHODS:\n");
      SunmiPrinter.setFontSize(24);

      // Print each payment method
      for (let i = 0; i < saleData.payments.length; i++) {
        const payment = saleData.payments[i];
        const displayType = (payment.type === "ECENTRIC" || payment.type === "CENDROID") ? "CARD" : payment.type;
        SunmiPrinter.printerText(`\nPayment ${i + 1}:\n`);
        SunmiPrinter.printerText(`  Type: ${displayType}\n`);
        SunmiPrinter.printerText(`  Amount: R ${payment.amount.toFixed(2)}\n`);

        // If card payment, print card details
        if ((payment.type === "ECENTRIC" || payment.type === "CENDROID") && payment.cardDetails) {
          const cardDetails = payment.cardDetails;

          // Get receipt details if available
          let receiptDetails = null;
          try {
            if (cardDetails.ecentric_receipt_details) {
              receiptDetails =
                typeof cardDetails.ecentric_receipt_details === "string"
                  ? JSON.parse(cardDetails.ecentric_receipt_details)
                  : cardDetails.ecentric_receipt_details;
            }
          } catch (error) {
            console.error("Error parsing receipt details:", error);
          }

          // Card type/name
          if (receiptDetails?.APPLICATION_LABEL) {
            SunmiPrinter.printerText(`  Card: ${receiptDetails.APPLICATION_LABEL}\n`);
          } else if (cardDetails.ecentric_card_type) {
            SunmiPrinter.printerText(`  Card: ${cardDetails.ecentric_card_type}\n`);
          }

          // Card number (PAN with BIN)
          if (receiptDetails?.PAN_WITH_BIN) {
            SunmiPrinter.printerText(`  Card #: ${receiptDetails.PAN_WITH_BIN}\n`);
          } else if (cardDetails.ecentric_masked_pan) {
            SunmiPrinter.printerText(`  Card #: ${cardDetails.ecentric_masked_pan}\n`);
          }

          // Authorization code
          if (cardDetails.ecentric_auth_code) {
            SunmiPrinter.printerText(`  Auth Code: ${cardDetails.ecentric_auth_code}\n`);
          }

          // RRN
          if (cardDetails.ecentric_rrn) {
            SunmiPrinter.printerText(`  RRN: ${cardDetails.ecentric_rrn}\n`);
          }

          // Terminal ID
          if (receiptDetails?.TERMINAL_ID || cardDetails.ecentric_terminal_id) {
            const terminalId = receiptDetails?.TERMINAL_ID || cardDetails.ecentric_terminal_id;
            SunmiPrinter.printerText(`  Terminal: ${terminalId}\n`);
          }
        }
      }

      SunmiPrinter.printerText("--------------------------------\n");

      // Footer
      SunmiPrinter.setAlignment(1); // CENTER = 1
      SunmiPrinter.printerText("\n");
      SunmiPrinter.setFontSize(20);
      SunmiPrinter.printerText("Thank you for your purchase!\n");
      SunmiPrinter.printerText("\n");
      SunmiPrinter.setFontSize(20);
      SunmiPrinter.printerText("This is your tax invoice\n");
      SunmiPrinter.printerText(
        "Goods cannot be returned once they have left our premises\n\n"
      );
      SunmiPrinter.setFontSize(24);

      // Add extra space at the end
      SunmiPrinter.printerText("\n\n\n\n");

      // Cut paper
      try {
        SunmiPrinter.cutPaper();
        console.log(
          "[SunmiPrinter] Split payment receipt completed successfully - paper cut"
        );
      } catch (cutError) {
        console.log(
          "[SunmiPrinter] Paper cutting failed:",
          (cutError as Error).message
        );
      }

      console.log(
        "[SunmiPrinter] Split payment receipt printing completed successfully"
      );
    } catch (error) {
      console.error("[SunmiPrinter] Failed to print split payment receipt:", error);
      throw error;
    }
  }
}

export default SunmiPrinterService;
