import { NativeModules, Platform } from "react-native";

// Note: SunmiPrinterDirect is a custom module that would need to be implemented
// For now, we'll check if it exists safely
const SunmiPrinterDirect = NativeModules.SunmiPrinterDirect;

/**
 * Direct interface to the Sunmi printer service
 * This uses the native Android implementation directly instead of a third-party library
 */
class SunmiDirectPrinterService {
  private static instance: SunmiDirectPrinterService;
  private initialized: boolean = false;

  private constructor() {
    // Direct printer constructor - no initialization needed here
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SunmiDirectPrinterService {
    if (!SunmiDirectPrinterService.instance) {
      SunmiDirectPrinterService.instance = new SunmiDirectPrinterService();
    }
    return SunmiDirectPrinterService.instance;
  }

  /**
   * Check if the printer service is available
   */
  public async isPrinterAvailable(): Promise<boolean> {
    if (Platform.OS !== "android" || !SunmiPrinterDirect) {
      console.log(
        "Sunmi printer direct module is only available on Android Sunmi devices"
      );
      return false;
    }

    try {
      const result = await SunmiPrinterDirect.isPrinterAvailable();
      return result.available;
    } catch (error) {
      console.error("Failed to check printer availability:", error);
      return false;
    }
  }

  /**
   * Initialize the printer
   */
  public async init(): Promise<boolean> {
    if (Platform.OS !== "android" || !SunmiPrinterDirect) {
      console.log(
        "Sunmi printer direct module is only available on Android Sunmi devices"
      );
      return false;
    }

    try {
      await SunmiPrinterDirect.initPrinter();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize Sunmi printer (direct mode):", error);
      return false;
    }
  }

  /**
   * Check if printer is ready to use
   */
  public async isPrinterReady(): Promise<boolean> {
    const isAvailable = await this.isPrinterAvailable();
    if (!isAvailable) {
      return false;
    }

    if (!this.initialized) {
      return await this.init();
    }

    return true;
  }

  /**
   * Print text
   */
  public async printText(text: string): Promise<boolean> {
    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      await SunmiPrinterDirect.printText(text);
      return true;
    } catch (error) {
      console.error("Failed to print text:", error);
      throw error;
    }
  }

  /**
   * Set alignment
   * @param alignment 0: left, 1: center, 2: right
   */
  public async setAlignment(alignment: number): Promise<boolean> {
    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      await SunmiPrinterDirect.setAlignment(alignment);
      return true;
    } catch (error) {
      console.error("Failed to set alignment:", error);
      throw error;
    }
  }

  /**
   * Set font size
   * @param size Font size
   */
  public async setFontSize(size: number): Promise<boolean> {
    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      await SunmiPrinterDirect.setFontSize(size);
      return true;
    } catch (error) {
      console.error("Failed to set font size:", error);
      throw error;
    }
  }

  /**
   * Print a divider line
   */
  public async printDivider(): Promise<boolean> {
    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      await SunmiPrinterDirect.printDivider();
      return true;
    } catch (error) {
      console.error("Failed to print divider:", error);
      throw error;
    }
  }

  /**
   * Print QR code
   */
  public async printQRCode(
    data: string,
    moduleSize: number = 8,
    errorLevel: number = 1
  ): Promise<boolean> {
    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      await SunmiPrinterDirect.printQRCode(data, moduleSize, errorLevel);
      return true;
    } catch (error) {
      console.error("Failed to print QR code:", error);
      throw error;
    }
  }

  /**
   * Print columns text
   */
  public async printColumnsText(
    texts: string[],
    widths: number[],
    alignments: number[]
  ): Promise<boolean> {
    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      await SunmiPrinterDirect.printColumnsText(texts, widths, alignments);
      return true;
    } catch (error) {
      console.error("Failed to print columns text:", error);
      throw error;
    }
  }

  /**
   * Cut paper
   */
  public async cutPaper(): Promise<boolean> {
    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      await SunmiPrinterDirect.cutPaper();
      return true;
    } catch (error) {
      console.error("Failed to cut paper:", error);
      throw error;
    }
  }

  /**
   * Print a test receipt
   */
  public async printTestReceipt(): Promise<void> {
    if (!(await this.isPrinterReady())) {
      throw new Error("Printer is not ready");
    }

    try {
      // We'll use the native implementation directly
      await SunmiPrinterDirect.printTestPage();
    } catch (error) {
      console.error("Failed to print test receipt (direct mode):", error);
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
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
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
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
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
      const storeAddress =
        saleData.storeAddress ||
        "New Era Brand Management (Pty) Ltd\n44 Lake Road, Longmeadow Business Estate, Lethabong";
      const storePhone = saleData.storePhone || "021-555-1234";
      const vatNumber = saleData.vatNumber || "4340266289";

      // Initialize the printer
      await SunmiPrinterDirect.initPrinter();

      // Print company logo/header
      await SunmiPrinterDirect.setAlignment(1); // CENTER = 1
      await SunmiPrinterDirect.setFontSize(28);
      await SunmiPrinterDirect.printText(`${storeName}\n`);
      await SunmiPrinterDirect.setFontSize(22);
      await SunmiPrinterDirect.printText(`${storeAddress}\n`);
      await SunmiPrinterDirect.printText(`Tel: ${storePhone}\n`);
      await SunmiPrinterDirect.printText(`VAT# ${vatNumber}\n`);

      await SunmiPrinterDirect.setFontSize(30);
      await SunmiPrinterDirect.printText("SALES RECEIPT\n");
      await SunmiPrinterDirect.setFontSize(24);
      await SunmiPrinterDirect.printText("================\n");

      // Reset alignment and font
      await SunmiPrinterDirect.setAlignment(0); // LEFT = 0

      // Print date and receipt number
      await SunmiPrinterDirect.printText(
        `Date: ${date.toLocaleDateString("en-ZA")}\n`
      );
      await SunmiPrinterDirect.printText(
        `Time: ${date.toLocaleTimeString("en-ZA")}\n`
      );
      await SunmiPrinterDirect.printText(`Receipt: ${receiptNumber}\n`);
      await SunmiPrinterDirect.printText(`Teller: ${tellerName}\n`);

      // Print customer info if available
      if (saleData.customerName) {
        await SunmiPrinterDirect.printText(
          `Customer: ${saleData.customerName}\n`
        );
      }

      await SunmiPrinterDirect.printDivider();

      // Print items
      await SunmiPrinterDirect.printText("ITEMS:\n");
      await SunmiPrinterDirect.printColumnsText(
        ["Product", "Qty", "Price"],
        [16, 4, 12],
        [0, 1, 2] // LEFT = 0, CENTER = 1, RIGHT = 2
      );

      // Print each item
      let subtotal = 0;
      for (const item of saleData.items) {
        const lineTotal = item.quantity * item.price;
        subtotal += lineTotal;

        await SunmiPrinterDirect.printColumnsText(
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
      }

      await SunmiPrinterDirect.printDivider();

      // Print total
      await SunmiPrinterDirect.setAlignment(2); // RIGHT = 2

      // Use provided subtotal if available, otherwise calculate from items
      const finalSubtotal =
        saleData.subtotalOverride !== undefined
          ? saleData.subtotalOverride
          : subtotal;

      // For bold text, use larger font
      await SunmiPrinterDirect.setFontSize(28);
      await SunmiPrinterDirect.printText(
        `Subtotal: R ${finalSubtotal.toFixed(2)}\n`
      );

      // Calculate tax (15% VAT) or use provided tax override
      const tax =
        saleData.taxOverride !== undefined
          ? saleData.taxOverride
          : finalSubtotal * 0.15;
      await SunmiPrinterDirect.printText(`VAT (15%): R ${tax.toFixed(2)}\n`);

      // Print total
      await SunmiPrinterDirect.printText(
        `Total: R ${saleData.total.toFixed(2)}\n`
      );
      await SunmiPrinterDirect.setFontSize(24);

      // Print payment method
      await SunmiPrinterDirect.setAlignment(0); // LEFT = 0
      await SunmiPrinterDirect.printText(
        `Payment Method: ${saleData.paymentType}\n`
      );

      // If card payment, print card details
      if (saleData.paymentType === "ECENTRIC" && saleData.cardDetails) {
        await SunmiPrinterDirect.printDivider();
        await SunmiPrinterDirect.printText("CARD PAYMENT DETAILS:\n");

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
          await SunmiPrinterDirect.printText(
            `Card Type: ${receiptDetails.APPLICATION_LABEL}\n`
          );
        } else if (cardDetails.ecentric_card_type) {
          await SunmiPrinterDirect.printText(
            `Card Type: ${cardDetails.ecentric_card_type}\n`
          );
        }

        // Card number (PAN with BIN)
        if (receiptDetails?.PAN_WITH_BIN) {
          await SunmiPrinterDirect.printText(
            `Card Number: ${receiptDetails.PAN_WITH_BIN}\n`
          );
        } else if (cardDetails.ecentric_masked_pan) {
          await SunmiPrinterDirect.printText(
            `Card Number: ${cardDetails.ecentric_masked_pan}\n`
          );
        }

        // Transaction type
        if (receiptDetails?.CARD_TRANSACTION_TYPE) {
          await SunmiPrinterDirect.printText(
            `Transaction Type: ${receiptDetails.CARD_TRANSACTION_TYPE}\n`
          );
        }

        // Authorization code
        if (cardDetails.ecentric_auth_code) {
          await SunmiPrinterDirect.printText(
            `Auth Code: ${cardDetails.ecentric_auth_code}\n`
          );
        } else if (receiptDetails?.AUTH_CODE) {
          await SunmiPrinterDirect.printText(
            `Auth Code: ${receiptDetails.AUTH_CODE}\n`
          );
        }

        // RRN (Retrieval Reference Number)
        if (cardDetails.ecentric_rrn) {
          await SunmiPrinterDirect.printText(
            `RRN: ${cardDetails.ecentric_rrn}\n`
          );
        } else if (receiptDetails?.RRN) {
          await SunmiPrinterDirect.printText(`RRN: ${receiptDetails.RRN}\n`);
        }

        // Terminal ID
        if (cardDetails.ecentric_terminal_id) {
          await SunmiPrinterDirect.printText(
            `Terminal ID: ${cardDetails.ecentric_terminal_id}\n`
          );
        } else if (receiptDetails?.TERMINAL_ID) {
          await SunmiPrinterDirect.printText(
            `Terminal ID: ${receiptDetails.TERMINAL_ID}\n`
          );
        }

        // Merchant ID
        if (receiptDetails?.MERCHANT_ID) {
          await SunmiPrinterDirect.printText(
            `Merchant ID: ${receiptDetails.MERCHANT_ID}\n`
          );
        }

        // Status
        if (receiptDetails?.STATUS) {
          await SunmiPrinterDirect.printText(
            `Status: ${receiptDetails.STATUS}\n`
          );
        } else if (cardDetails.ecentric_result_desc) {
          await SunmiPrinterDirect.printText(
            `Status: ${cardDetails.ecentric_result_desc}\n`
          );
        }

        // Verification method
        if (receiptDetails?.CVM) {
          await SunmiPrinterDirect.printText(
            `Verification: ${receiptDetails.CVM}\n`
          );
        }
      }

      // Print footer
      await SunmiPrinterDirect.setAlignment(1); // CENTER = 1
      await SunmiPrinterDirect.printDivider();
      await SunmiPrinterDirect.printText("Thank you for shopping with us!\n");
      await SunmiPrinterDirect.printText("Visit us at: www.nexo.app\n");

      // Add legal text for South African receipts
      await SunmiPrinterDirect.setFontSize(20);
      await SunmiPrinterDirect.printText("This is your tax invoice\n");
      await SunmiPrinterDirect.printText(
        "Goods cannot be returned once they have left our premises\n\n"
      );
      await SunmiPrinterDirect.setFontSize(24);

      // Add extra space at the end
      await SunmiPrinterDirect.printText("\n\n\n\n");

      // Cut paper
      await SunmiPrinterDirect.cutPaper();
    } catch (error) {
      console.error("Failed to print sale receipt (direct mode):", error);
      throw error;
    }
  }

  /**
   * Print a split payment receipt with multiple payment methods
   */
  public async printSplitPaymentReceipt(saleData: {
    total: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
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
      const storeAddress =
        saleData.storeAddress ||
        "New Era Brand Management (Pty) Ltd\n44 Lake Road, Longmeadow Business Estate, Lethabong";
      const storePhone = saleData.storePhone || "021-555-1234";
      const vatNumber = saleData.vatNumber || "4340266289";

      // Initialize the printer
      await SunmiPrinterDirect.initPrinter();

      // Print company logo/header
      await SunmiPrinterDirect.setAlignment(1); // CENTER = 1
      await SunmiPrinterDirect.setFontSize(28);
      await SunmiPrinterDirect.printText(`${storeName}\n`);
      await SunmiPrinterDirect.setFontSize(22);
      await SunmiPrinterDirect.printText(`${storeAddress}\n`);
      await SunmiPrinterDirect.printText(`Tel: ${storePhone}\n`);
      await SunmiPrinterDirect.printText(`VAT# ${vatNumber}\n`);

      await SunmiPrinterDirect.setFontSize(30);
      await SunmiPrinterDirect.printText("SALES RECEIPT\n");
      await SunmiPrinterDirect.setFontSize(24);
      await SunmiPrinterDirect.printText("================\n");

      // Reset alignment and font
      await SunmiPrinterDirect.setAlignment(0); // LEFT = 0

      // Print date and receipt number
      await SunmiPrinterDirect.printText(
        `Date: ${date.toLocaleDateString("en-ZA")}\n`
      );
      await SunmiPrinterDirect.printText(
        `Time: ${date.toLocaleTimeString("en-ZA")}\n`
      );
      await SunmiPrinterDirect.printText(`Receipt: ${receiptNumber}\n`);
      await SunmiPrinterDirect.printText(`Teller: ${tellerName}\n`);

      // Print customer info if available
      if (saleData.customerName) {
        await SunmiPrinterDirect.printText(
          `Customer: ${saleData.customerName}\n`
        );
      }

      await SunmiPrinterDirect.printDivider();

      // Print items
      await SunmiPrinterDirect.printText("ITEMS:\n");
      await SunmiPrinterDirect.printColumnsText(
        ["Product", "Qty", "Price"],
        [16, 4, 12],
        [0, 1, 2]
      );

      // Print each item
      let subtotal = 0;
      for (const item of saleData.items) {
        const lineTotal = item.quantity * item.price;
        subtotal += lineTotal;

        await SunmiPrinterDirect.printColumnsText(
          [
            item.name.length > 16
              ? item.name.substring(0, 13) + "..."
              : item.name,
            item.quantity.toString(),
            `R ${item.price.toFixed(2)}`,
          ],
          [16, 4, 12],
          [0, 1, 2]
        );
      }

      await SunmiPrinterDirect.printDivider();

      // Print total
      await SunmiPrinterDirect.setAlignment(2); // RIGHT = 2

      const finalSubtotal =
        saleData.subtotalOverride !== undefined
          ? saleData.subtotalOverride
          : subtotal;

      await SunmiPrinterDirect.setFontSize(28);
      await SunmiPrinterDirect.printText(
        `Subtotal: R ${finalSubtotal.toFixed(2)}\n`
      );

      const tax =
        saleData.taxOverride !== undefined
          ? saleData.taxOverride
          : finalSubtotal * 0.15;
      await SunmiPrinterDirect.printText(`VAT (15%): R ${tax.toFixed(2)}\n`);

      await SunmiPrinterDirect.printText(
        `Total: R ${saleData.total.toFixed(2)}\n`
      );
      await SunmiPrinterDirect.setFontSize(24);

      // Print split payment methods
      await SunmiPrinterDirect.setAlignment(0); // LEFT = 0
      await SunmiPrinterDirect.printDivider();
      await SunmiPrinterDirect.setFontSize(26);
      await SunmiPrinterDirect.printText("SPLIT PAYMENT METHODS:\n");
      await SunmiPrinterDirect.setFontSize(24);

      // Print each payment method
      for (let i = 0; i < saleData.payments.length; i++) {
        const payment = saleData.payments[i];
        const displayType = (payment.type === "ECENTRIC" || payment.type === "CENDROID") ? "CARD" : payment.type;
        await SunmiPrinterDirect.printText(`\nPayment ${i + 1}:\n`);
        await SunmiPrinterDirect.printText(`  Type: ${displayType}\n`);
        await SunmiPrinterDirect.printText(
          `  Amount: R ${payment.amount.toFixed(2)}\n`
        );

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
            await SunmiPrinterDirect.printText(
              `  Card: ${receiptDetails.APPLICATION_LABEL}\n`
            );
          } else if (cardDetails.ecentric_card_type) {
            await SunmiPrinterDirect.printText(
              `  Card: ${cardDetails.ecentric_card_type}\n`
            );
          }

          // Card number (PAN with BIN)
          if (receiptDetails?.PAN_WITH_BIN) {
            await SunmiPrinterDirect.printText(
              `  Card #: ${receiptDetails.PAN_WITH_BIN}\n`
            );
          } else if (cardDetails.ecentric_masked_pan) {
            await SunmiPrinterDirect.printText(
              `  Card #: ${cardDetails.ecentric_masked_pan}\n`
            );
          }

          // Authorization code
          if (cardDetails.ecentric_auth_code) {
            await SunmiPrinterDirect.printText(
              `  Auth Code: ${cardDetails.ecentric_auth_code}\n`
            );
          }

          // RRN
          if (cardDetails.ecentric_rrn) {
            await SunmiPrinterDirect.printText(
              `  RRN: ${cardDetails.ecentric_rrn}\n`
            );
          }

          // Terminal ID
          if (receiptDetails?.TERMINAL_ID || cardDetails.ecentric_terminal_id) {
            const terminalId =
              receiptDetails?.TERMINAL_ID || cardDetails.ecentric_terminal_id;
            await SunmiPrinterDirect.printText(
              `  Terminal: ${terminalId}\n`
            );
          }
        }
      }

      await SunmiPrinterDirect.printDivider();

      // Footer
      await SunmiPrinterDirect.setAlignment(1); // CENTER = 1
      await SunmiPrinterDirect.printText("\n");
      await SunmiPrinterDirect.setFontSize(20);
      await SunmiPrinterDirect.printText("Thank you for your purchase!\n");
      await SunmiPrinterDirect.printText("\n");
      await SunmiPrinterDirect.setFontSize(20);
      await SunmiPrinterDirect.printText("This is your tax invoice\n");
      await SunmiPrinterDirect.printText(
        "Goods cannot be returned once they have left our premises\n\n"
      );
      await SunmiPrinterDirect.setFontSize(24);

      // Add extra space at the end
      await SunmiPrinterDirect.printText("\n\n\n\n");

      // Cut paper
      await SunmiPrinterDirect.cutPaper();
      console.log(
        "[SunmiDirectPrinter] Split payment receipt completed successfully"
      );
    } catch (error) {
      console.error(
        "[SunmiDirectPrinter] Failed to print split payment receipt:",
        error
      );
      throw error;
    }
  }
}

export default SunmiDirectPrinterService;
