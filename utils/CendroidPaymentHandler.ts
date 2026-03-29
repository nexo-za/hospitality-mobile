import { Platform, Alert } from 'react-native';
import CendroidPayment from './CendroidPayment';
import PrinterUtils from './PrinterUtils';

// Helper function to safely print receipts
const safePrintReceipt = async (printData: {
  paymentType: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  customerName?: string;
  receiptNumber: string;
  tellerName?: string;
  storeName?: string;
  cardDetails?: any;
}) => {
  try {
    // Check if any printer is available before attempting to print
    const isPrinterAvailable = await PrinterUtils.isAnyPrinterAvailable();
    
    if (!isPrinterAvailable) {
      console.log("[PRINT] No printer available, skipping receipt printing");
      return;
    }

    // Get available printer service
    const printerInfo = await PrinterUtils.getAvailablePrinterService();
    
    if (!printerInfo) {
      console.log("[PRINT] No printer service available");
      return;
    }

    console.log(`[PRINT] Printing receipt with ${printerInfo.isDirect ? 'direct' : 'legacy'} printer`);

    if (printerInfo.isDirect) {
      await printerInfo.service.printReceipt(printData);
      console.log("Receipt printed successfully (direct mode)");
    } else {
      await printerInfo.service.printReceipt(printData);
      console.log("Receipt printed successfully (legacy mode)");
    }
  } catch (error) {
    console.error("[PRINT] Error printing receipt:", error);
    // Continue even if printing fails
  }
};

export interface CendroidPaymentHandlerProps {
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  customer?: { fullname: string; email?: string; phone?: string } | null;
  staffDisplayName?: string;
  staffStoreName?: string;
  onPaymentComplete: (total: number, paymentType: string, details?: any) => Promise<any>;
  setIsProcessing: (processing: boolean) => void;
  setProcessingMessage: (message: string) => void;
  setPaymentSuccess: (success: boolean) => void;
  setErrorMessage: (message: string) => void;
  setShowResultModal: (show: boolean) => void;
  setFinalAmount: (amount: number) => void;
  setPaymentDetails: (details: any) => void;
}

export const handleCendroidPayment = async (props: CendroidPaymentHandlerProps) => {
  const {
    total,
    items,
    customer,
    staffDisplayName,
    staffStoreName,
    onPaymentComplete,
    setIsProcessing,
    setProcessingMessage,
    setPaymentSuccess,
    setErrorMessage,
    setShowResultModal,
    setFinalAmount,
    setPaymentDetails
  } = props;

  // 🚀 COMPREHENSIVE LOGGING: CenDroid Payment Flow Initiated
  console.log("=".repeat(80));
  console.log("🚀 [CENDROID PAYMENT FLOW] ====== INITIATED =====");
  console.log("=".repeat(80));
  
  console.log("📱 [CENDROID PAYMENT] Platform check:", Platform.OS);
  console.log("💰 [CENDROID PAYMENT] Total amount:", total);
  console.log("👤 [CENDROID PAYMENT] Customer data:", customer);
  console.log("🛒 [CENDROID PAYMENT] Items count:", items.length);
  console.log("⏰ [CENDROID PAYMENT] Timestamp:", new Date().toISOString());
  
  if (Platform.OS !== "android") {
    console.error("❌ [CENDROID PAYMENT] Platform not supported:", Platform.OS);
    Alert.alert(
      "Error",
      "CenDroid Payment is only supported on Android devices"
    );
    return;
  }

  try {
    // Show processing overlay
    console.log("📱 [CENDROID PAYMENT] Setting processing state to true");
    setIsProcessing(true);
    setProcessingMessage("Initializing CenDroid payment...");
    console.log("💬 [CENDROID PAYMENT] Processing message set to: 'Initializing CenDroid payment...'");
    
    // Generate reference number
    const generateUUID = (): string => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
    
    const referenceNo = generateUUID();
    console.log("🔢 [CENDROID PAYMENT] Generated reference number:", referenceNo);

    // Round the amount for testing purposes
    const roundedAmount = Math.round(total);
    console.log(
      "💳 [CENDROID PAYMENT] Starting CenDroid payment process with rounded amount:",
      roundedAmount
    );

    setProcessingMessage("Processing CenDroid payment...");

    // Initialize CenDroid service before processing payment
    console.log("🔧 [CENDROID PAYMENT] Initializing CenDroid service...");
    
    // Log the configuration being retrieved
    const { getPaymentConfig } = await import('../config/dynamicAppConfig');
    const paymentConfig = await getPaymentConfig();
    console.log("🔍 [CENDROID PAYMENT] Retrieved payment config from localStorage:", JSON.stringify(paymentConfig, null, 2));
    
    const isInitialized = await CendroidPayment.initializeWithDynamicConfig();
    if (!isInitialized) {
      throw new Error("Failed to initialize CenDroid service");
    }
    console.log("✅ [CENDROID PAYMENT] CenDroid service initialized successfully");

    // Process payment using CenDroid service
    const paymentResult = await CendroidPayment.processPayment(roundedAmount, referenceNo);

    console.log("🔐 [CENDROID PAYMENT] CenDroid payment result:", paymentResult);

    if (paymentResult.success && paymentResult.approved) {
      console.log("✅ [CENDROID PAYMENT] Payment successful");
      
      // Prepare payment details for API submission
      const cendroidDetails = {
        cendroid_transaction_uuid: paymentResult.uuid,
        cendroid_pan_hash: paymentResult.panHash,
        cendroid_auth_code: paymentResult.authCode,
        cendroid_is_approved: paymentResult.approved,
        cendroid_amount: paymentResult.amount,
        cendroid_ecr_host_response: paymentResult.ecrHostResponse,
        cendroid_transaction_result_code: paymentResult.transactionResultCode,
        cendroid_response: paymentResult.cendroidResponse
      };

      console.log("📊 [CENDROID PAYMENT] Submitting sale data to backend...");
      
      try {
        // Submit sale data to backend
        const result = await onPaymentComplete(total, "CENDROID", cendroidDetails);
        console.warn("✅ CENDROID PAYMENT API CALL SUCCESS - onPaymentComplete executed successfully");
        
        // Set payment details for the result modal to show "Card" instead of "Cash"
        setPaymentDetails(cendroidDetails);
        
        // Set success state
        setPaymentSuccess(true);
        
        // Print receipt using safe printing function
        setProcessingMessage("Printing receipt...");
        
        await safePrintReceipt({
          paymentType: "CARD",
          total: total,
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          customerName: customer?.fullname || "Guest Customer",
          receiptNumber: referenceNo,
          tellerName: staffDisplayName,
          storeName: staffStoreName,
          cardDetails: {
            lastFourDigits: paymentResult.cardLastFourDigits,
            authCode: paymentResult.authCode,
            transactionId: paymentResult.transactionId,
          },
        });

        setProcessingMessage("Payment completed successfully!");
        setIsProcessing(false);
        setShowResultModal(true);
      } catch (apiError) {
        console.error("❌ CENDROID PAYMENT API CALL FAILED:", apiError);
        setPaymentSuccess(false);
        console.warn(
          "❌ CENDROID PAYMENT FAILED - Setting error message:",
          apiError instanceof Error ? apiError.message : "Failed to complete CenDroid payment"
        );
        setErrorMessage(
          apiError instanceof Error ? apiError.message : "Failed to complete CenDroid payment"
        );
        console.warn(`❌ SHOWING ERROR RESULT MODAL - paymentSuccess: false, errorMessage set`);
        setIsProcessing(false);
        setShowResultModal(true);
      }
    } else {
      // Payment failed
      console.log("❌ [CENDROID PAYMENT] Payment failed:", paymentResult.errorMessage);
      setPaymentSuccess(false);
      setErrorMessage(paymentResult.errorMessage || "CenDroid payment failed");
      setFinalAmount(total);
      setIsProcessing(false);
      setShowResultModal(true);
    }
  } catch (error) {
    console.error("❌ [CENDROID PAYMENT] Unexpected error:", error);
    setPaymentSuccess(false);
    setErrorMessage(
      error instanceof Error ? error.message : "Failed to process CenDroid payment"
    );
    setFinalAmount(total);
    setIsProcessing(false);
    setShowResultModal(true);
  }
};
