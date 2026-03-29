import * as React from "react";
import { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Alert,
  Platform,
  ScrollView,
  Share,
  ActivityIndicator,
  TextInput,
  NativeModules,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";

import PrinterUtils from "@/utils/PrinterUtils";

// Lazy-load printer services to avoid loading native modules at app startup
// These will only be loaded when actually needed for printing
const loadSunmiPrinterService = async () => {
  const module = await import("@/utils/SunmiPrinter");
  return module.default;
};

const loadSunmiDirectPrinterService = async () => {
  const module = await import("@/utils/SunmiDirectPrinter");
  return module.default;
};
import {
  useStaffSession,
  getCurrentStaff,
} from "@/contexts/StaffSessionContext";
import { getPaymentConfig } from '../../config/dynamicAppConfig';
import PaymentServiceManager from '../../utils/PaymentServiceManager';
import { getAvailablePaymentMethods, isPaymentMethodConfigured } from '../../utils/paymentConfig';
import { handleCendroidPayment } from '../../utils/CendroidPaymentHandler';

// Get the EcentricPayment native module
const { EcentricPaymentModule } = NativeModules;

const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
      await printerInfo.service.printSaleReceipt(printData);
      console.log("Receipt printed successfully (direct mode)");
    } else {
      await printerInfo.service.printSaleReceipt(printData);
      console.log("Receipt printed successfully (legacy mode)");
    }
  } catch (error) {
    console.error("[PRINT] Error printing receipt:", error);
    // Continue even if printing fails
  }
};

interface PaymentResultModalProps {
  visible: boolean;
  onClose: () => void;
  isSuccess: boolean;
  errorMessage?: string;
  ecentricDetails?: any;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

function PaymentResultModal({
  visible,
  onClose,
  isSuccess,
  errorMessage,
  ecentricDetails,
  amount,
  customerName,
  customerEmail,
  items = [],
}: PaymentResultModalProps) {
  console.warn(
    `🔍 PAYMENT RESULT MODAL - isSuccess: ${isSuccess}, errorMessage: ${
      errorMessage || "none"
    }`
  );
  const [sending, setSending] = useState(false);
  const { currentStaff } = useStaffSession();
  const staffDisplayName = (currentStaff as any)?.displayName || undefined;
  const staffStoreName = (currentStaff as any)?.storeName || undefined;

  useEffect(() => {
    if (visible) {
      console.warn(
        `🔍 PAYMENT RESULT MODAL VISIBLE - isSuccess: ${isSuccess}, showing ${
          isSuccess ? "SUCCESS" : "ERROR"
        } UI`
      );
    }
  }, [visible, isSuccess]);

  const [storedItems] = useState(() => {
    if (Array.isArray(items) && items.length > 0) {
      console.log(
        "[PaymentResultModal] Storing original items for future printing:",
        items.length
      );
      return [...items];
    } else {
      console.log(
        "[PaymentResultModal] No items provided, using default payment item"
      );
      return [
        {
          name: "Payment",
          quantity: 1,
          price: amount,
        },
      ];
    }
  });

  const getHumanReadableKey = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getImportantReceiptFields = () => {
    if (!ecentricDetails) {
      const currentDate = new Date();
      return [
        {
          key: "payment_type",
          label: "Payment Type",
          value: "Cash",
        },
        {
          key: "date",
          label: "Date",
          value: currentDate.toLocaleDateString(),
        },
        {
          key: "time",
          label: "Time",
          value: currentDate.toLocaleTimeString(),
        },
        {
          key: "amount",
          label: "Amount",
          value: new Intl.NumberFormat("en-ZA", {
            style: "currency",
            currency: "ZAR",
          }).format(amount),
        },
      ];
    }

    // Check if this is a Cendroid payment
    if (ecentricDetails.cendroid_transaction_uuid) {
      const currentDate = new Date();
      return [
        { key: "payment_type", label: "Payment Type", value: "Card" },
        {
          key: "payment_method",
          label: "Payment Method",
          value: "CenDroid",
        },
        {
          key: "transaction_id",
          label: "Transaction ID",
          value: ecentricDetails.cendroid_transaction_uuid || "N/A",
        },
        {
          key: "auth_code",
          label: "Auth Code",
          value: ecentricDetails.cendroid_auth_code || "N/A",
        },
        {
          key: "status",
          label: "Status",
          value: ecentricDetails.cendroid_is_approved ? "Approved" : "Declined",
        },
        {
          key: "date",
          label: "Date",
          value: currentDate.toLocaleDateString(),
        },
        {
          key: "time",
          label: "Time",
          value: currentDate.toLocaleTimeString(),
        },
        {
          key: "amount",
          label: "Amount",
          value: new Intl.NumberFormat("en-ZA", {
            style: "currency",
            currency: "ZAR",
          }).format(amount),
        },
      ];
    }

    if (!ecentricDetails.ecentric_receipt_details) {
      return [
        { key: "payment_type", label: "Payment Type", value: "Card" },
        {
          key: "card_type",
          label: "Card Type",
          value: ecentricDetails.ecentric_card_type || "Credit/Debit Card",
        },
        {
          key: "masked_pan",
          label: "Card Number",
          value: ecentricDetails.ecentric_masked_pan || "************1234",
        },
        {
          key: "auth_code",
          label: "Auth Code",
          value: ecentricDetails.ecentric_auth_code || "N/A",
        },
        {
          key: "status",
          label: "Status",
          value: ecentricDetails.ecentric_result_desc || "Approved",
        },
        {
          key: "amount",
          label: "Amount",
          value: new Intl.NumberFormat("en-ZA", {
            style: "currency",
            currency: "ZAR",
          }).format(amount),
        },
      ];
    }

    const priorityFields = [
      "MERCHANT_NAME",
      "MERCHANT_ID",
      "TERMINAL_ID",
      "PAN",
      "CARD_TYPE",
      "AMOUNT",
      "FORMATTED_AMOUNT",
      "AUTH_CODE",
      "RRN",
      "STATUS",
      "RESULT_CODE",
      "APP_LABEL",
      "TRANSACTION_INFO",
      "DATE",
    ];

    const receiptData =
      typeof ecentricDetails.ecentric_receipt_details === "string"
        ? JSON.parse(ecentricDetails.ecentric_receipt_details)
        : ecentricDetails.ecentric_receipt_details;

    const fields = priorityFields
      .filter((field) => receiptData[field])
      .map((field) => ({
        key: field,
        label: getHumanReadableKey(field),
        value: receiptData[field],
      }));

    const amountField = fields.find(
      (f) => f.key === "AMOUNT" || f.key === "FORMATTED_AMOUNT"
    );
    if (!amountField) {
      fields.push({
        key: "amount",
        label: "Amount",
        value: new Intl.NumberFormat("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }).format(amount),
      });
    }

    return fields;
  };

  const handlePrint = async () => {
    console.warn(`🖨️ PRINT ATTEMPT - isSuccess: ${isSuccess}`);
    if (!isSuccess) {
      console.warn(
        "🖨️ PRINT BLOCKED - Not printing receipt for failed payment"
      );
      console.log("Not printing receipt for failed payment");
      Alert.alert(
        "Cannot Print Receipt",
        "Receipt can only be printed for successful payments.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const receiptItems = storedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const staffInfo = currentStaff || {};

      const SunmiDirectPrinterServiceClass = await loadSunmiDirectPrinterService();
      const directPrinterService = SunmiDirectPrinterServiceClass.getInstance();
      const isDirectAvailable = await directPrinterService.isPrinterAvailable();
      console.log("[PRINT] Direct printer available:", isDirectAvailable);

      if (isDirectAvailable) {
        try {
          await directPrinterService.printSaleReceipt({
            paymentType: ecentricDetails ? (ecentricDetails.cendroid_transaction_uuid ? "CENDROID" : "ECENTRIC") : "CASH",
            total: amount,
            items: receiptItems,
            customerName: customerName || undefined,
            cardDetails: ecentricDetails || undefined,
            receiptNumber:
              ecentricDetails?.ecentric_receipt_number ||
              `NX-${Math.floor(1000 + Math.random() * 9000)}`,
            tellerName: staffDisplayName,
            storeName: staffStoreName,
          });

          console.log("Receipt printed successfully (direct mode)");
          return;
        } catch (directError) {
          console.error("[PRINT] Direct printer error:", directError);
        }
      }

      const SunmiPrinterServiceClass = await loadSunmiPrinterService();
      const printerService = SunmiPrinterServiceClass.getInstance();

      await printerService.printSaleReceipt({
        paymentType: ecentricDetails ? (ecentricDetails.cendroid_transaction_uuid ? "CENDROID" : "ECENTRIC") : "CASH",
        total: amount,
        items: receiptItems,
        customerName: customerName || undefined,
        cardDetails: ecentricDetails || undefined,
        receiptNumber:
          ecentricDetails?.ecentric_receipt_number ||
          `NX-${Math.floor(1000 + Math.random() * 9000)}`,
        tellerName: staffDisplayName,
        storeName: staffStoreName,
      });

      console.log("Receipt printed successfully (legacy mode)");
    } catch (error) {
      console.error("Failed to print receipt:", error);
      Alert.alert(
        "Print Error",
        "Failed to print the receipt. Make sure your device is connected to a Sunmi printer.",
        [{ text: "OK" }]
      );
    }
  };

  const handleEmailReceipt = async () => {
    if (!isSuccess || !customerEmail) {
      console.log("Not emailing receipt for failed payment or missing email");
      Alert.alert(
        "Cannot Send Receipt",
        !isSuccess
          ? "Receipt can only be sent for successful payments."
          : "The customer doesn't have an email address to send the receipt to.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setSending(true);
      Alert.alert(
        "Email Receipt",
        `A receipt will be automatically sent to ${customerEmail} once the sale is completed.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Failed to send receipt:", error);
      Alert.alert(
        "Error Sending Receipt",
        "Failed to send the receipt via email. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSending(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!isSuccess) {
      console.log("Not sharing receipt for failed payment");
      Alert.alert(
        "Cannot Share Receipt",
        "Receipt can only be shared for successful payments.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const items = storedItems
        .map(
          (item) =>
            `- ${item.name} x${item.quantity}: ${new Intl.NumberFormat(
              "en-ZA",
              {
                style: "currency",
                currency: "ZAR",
              }
            ).format(item.price)}`
        )
        .join("\n");

      const paymentType = ecentricDetails ? "Card" : "Cash";

      const message =
        `Receipt from Nexo\n\n` +
        `Customer: ${customerName || "Guest"}\n` +
        `Date: ${new Date().toLocaleDateString()}\n` +
        `Time: ${new Date().toLocaleTimeString()}\n` +
        `Payment: ${paymentType}\n` +
        `Amount: ${new Intl.NumberFormat("en-ZA", {
          style: "currency",
          currency: "ZAR",
        }).format(amount)}\n\n` +
        `Items:\n${items}\n\n` +
        `Thank you for your purchase!`;

      await Share.share({
        message,
        title: `Nexo Receipt - ${new Date().toLocaleDateString()}`,
      });
    } catch (error) {
      console.error("Failed to share receipt:", error);
      Alert.alert("Share Error", "Failed to share the receipt.", [
        { text: "OK" },
      ]);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={tw`flex-1 bg-gray-800 bg-opacity-50 justify-center items-center p-6`}
      >
        <View style={tw`bg-white w-full max-w-md rounded-xl p-6`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <GeistText style={[tw`text-gray-900`, typography.h2]}>
              {isSuccess ? "Payment Successful" : "Payment Failed"}
            </GeistText>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {isSuccess ? (
            // Success UI
            <View style={tw`bg-green-50 p-4 rounded-lg mb-6 items-center`}>
              <MaterialCommunityIcons
                name="check-circle"
                size={48}
                color="#22c55e"
              />
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Transaction Approved
              </GeistText>
            </View>
          ) : (
            // Error UI
            <>
              <View style={tw`bg-red-50 p-4 rounded-lg mb-6 items-center`}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={48}
                  color="#ef4444"
                />
                <GeistText style={[tw`text-red-700 mt-2`, typography.bodyBold]}>
                  {new Intl.NumberFormat("en-ZA", {
                    style: "currency",
                    currency: "ZAR",
                  }).format(amount)}
                </GeistText>
                <GeistText
                  style={[
                    tw`text-red-600 text-center mb-2`,
                    typography.bodyBold,
                  ]}
                >
                  Payment Not Processed
                </GeistText>
                <GeistText
                  style={[tw`text-gray-600 text-center`, typography.body]}
                >
                  {errorMessage || "Transaction Failed"}
                </GeistText>
              </View>

              <View style={tw`bg-yellow-50 p-4 rounded-lg mb-6`}>
                <GeistText
                  style={[tw`text-yellow-700 mb-1`, typography.bodyBold]}
                >
                  Important Notice
                </GeistText>
                <GeistText style={[tw`text-gray-700`, typography.body]}>
                  No receipt has been generated as the payment was not completed
                  successfully.
                </GeistText>
              </View>

              <View style={tw`flex-row gap-2`}>
                <TouchableOpacity
                  style={tw`bg-blue-100 rounded-lg p-3 items-center justify-center flex-1 mx-1`}
                  onPress={handlePrint}
                >
                  <MaterialCommunityIcons
                    name="printer"
                    size={24}
                    color="#2563eb"
                  />
                  <GeistText style={tw`text-blue-600 mt-1`}>Print</GeistText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={tw`bg-blue-600 rounded-lg p-3 items-center justify-center flex-1 mx-1`}
                  onPress={onClose}
                >
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color="white"
                  />
                  <GeistText style={tw`text-white mt-1`}>Done</GeistText>
                </TouchableOpacity>
              </View>
            </>
          )}

          {isSuccess && (
            <>
              <GeistText style={[tw`text-gray-900 mb-2`, typography.bodyBold]}>
                Receipt Details
              </GeistText>

              <ScrollView
                style={tw`max-h-48 bg-gray-50 rounded-lg p-4 mb-6`}
                showsVerticalScrollIndicator={true}
              >
                {/* Display the formatted receipt data */}
                {getImportantReceiptFields().map((field) => (
                  <View
                    key={field.key}
                    style={tw`flex-row justify-between mb-2 pb-2 border-b border-gray-100`}
                  >
                    <GeistText style={tw`text-gray-600 mr-2`}>
                      {field.label}
                    </GeistText>
                    <GeistText style={tw`text-gray-900 text-right flex-1`}>
                      {field.value}
                    </GeistText>
                  </View>
                ))}

                {/* Customer */}
                {customerName && (
                  <View
                    style={tw`flex-row justify-between mb-2 pb-2 border-b border-gray-100`}
                  >
                    <GeistText style={tw`text-gray-600`}>Customer</GeistText>
                    <GeistText style={tw`text-gray-900 text-right`}>
                      {customerName}
                    </GeistText>
                  </View>
                )}
              </ScrollView>

              <View style={tw`flex-row gap-2`}>
                <TouchableOpacity
                  style={tw`bg-blue-100 rounded-lg p-3 items-center justify-center flex-1 mx-1`}
                  onPress={handlePrint}
                >
                  <MaterialCommunityIcons
                    name="printer"
                    size={24}
                    color="#2563eb"
                  />
                  <GeistText style={tw`text-blue-600 mt-1`}>Print</GeistText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={tw`bg-blue-600 rounded-lg p-3 items-center justify-center flex-1 mx-1`}
                  onPress={onClose}
                >
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color="white"
                  />
                  <GeistText style={tw`text-white mt-1`}>Done</GeistText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// For backward compatibility, keep the ReceiptModal name as an alias
const ReceiptModal = (
  props: Omit<PaymentResultModalProps, "isSuccess"> & { isSuccess?: boolean }
) => {
  // Default to false if isSuccess is not provided - this ensures we don't show success UI by default
  return <PaymentResultModal isSuccess={props.isSuccess ?? false} {...props} />;
};

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  total: number;
  onPaymentComplete: (
    amount: number,
    method: string,
    ecentricDetails?: any
  ) => Promise<any>;
  items?: Array<{
    id?: number;
    name: string;
    quantity: number;
    price: number;
  }>;
  customer?: {
    fullname: string;
    email?: string;
    phone?: string;
  } | null;
  hasZeroPriceItems?: boolean; // Add hasZeroPriceItems prop
}

// Base payment methods - will be filtered based on configuration
const BASE_PAYMENT_METHODS = [
  {
    id: "CASH",
    name: "Cash",
    icon: "cash",
    color: "#22c55e",
  },
  {
    id: "CARD",
    name: "Card",
    icon: "credit-card",
    color: "#0ea5e9",
  },
  {
    id: "EXTERNAL_POS",
    name: "External Payment",
    icon: "cash-register",
    color: "#f59e0b",
  },
];

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

function MobilePaymentModal({
  visible,
  onClose,
  total,
  onPaymentComplete,
  items = [],
  customer = null,
  hasZeroPriceItems,
}: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [change, setChange] = useState(0);
  const [step, setStep] = useState<"method" | "amount">("method");
  const [isOrderSummaryExpanded, setIsOrderSummaryExpanded] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(""); // Add receipt number state
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState(BASE_PAYMENT_METHODS);
  const { currentStaff } = useStaffSession();
  const staffDisplayName = (currentStaff as any)?.displayName || undefined;
  const staffStoreName = (currentStaff as any)?.storeName || undefined;
  const { height: screenHeight } = useWindowDimensions();
  // State for payment result modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [finalAmount, setFinalAmount] = useState(0);
  // Add loading overlay state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(
    "Processing payment..."
  );
  const [saleAmount, setSaleAmount] = useState<number>(0);

  // Add validation for receipt number
  const isExternalPaymentValid =
    selectedMethod === "EXTERNAL_POS" ? !!receiptNumber.trim() : true;

  // Calculate modal height based on screen size
  const modalHeight = screenHeight * 0.85; // 85% of screen height

  useEffect(() => {
    if (visible) {
      setAmount("");
      setChange(0);
      setSelectedMethod(null);
      setStep("method");
      // Reset payment result states
      setPaymentSuccess(false);
      setErrorMessage("");
    }
  }, [visible]);

  // Set default amount for zero-price transactions
  useEffect(() => {
    if (visible && total === 0 && selectedMethod === "CASH") {
      setAmount("0");
      setChange(0);
    }
  }, [visible, total, selectedMethod]);

  const handleNumberPress = (num: string) => {
    if (num === "." && amount.includes(".")) return;
    if (num === "." && amount === "") {
      setAmount("0.");
      return;
    }
    setAmount((prev) => {
      const newAmount = prev + num;
      const parsedAmount = parseFloat(newAmount);
      calculateChange(parsedAmount);
      return newAmount;
    });
  };

  const handleBackspace = () => {
    setAmount((prev) => {
      const newAmount = prev.slice(0, -1);
      const parsedAmount = parseFloat(newAmount || "0");
      calculateChange(parsedAmount);
      return newAmount;
    });
  };

  const calculateChange = (inputAmount: number) => {
    const changeAmount = inputAmount - total;
    setChange(changeAmount >= 0 ? changeAmount : 0);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    calculateChange(value);
  };

  // Determine available payment methods based on configuration
  useEffect(() => {
    const determineAvailableMethods = async () => {
      try {
        const methods = await getAvailablePaymentMethods();
        console.log('🔍 Available payment methods:', methods);
        
        // Filter base payment methods based on available configuration
        const filteredMethods = BASE_PAYMENT_METHODS.filter(method => {
          if (method.id === "CASH" || method.id === "EXTERNAL_POS") {
            return true; // Always available
          }
          
          if (method.id === "CARD") {
            // Show Card option if either Ecentric or Cendroid is available
            return methods.includes('ecentric') || methods.includes('cendroid');
          }
          
          return false;
        });
        
        console.log('🔍 Filtered payment methods:', filteredMethods);
        setAvailablePaymentMethods(filteredMethods);
      } catch (error) {
        console.error('❌ Error determining available payment methods:', error);
        // Fallback to base methods if there's an error
        setAvailablePaymentMethods(BASE_PAYMENT_METHODS);
      }
    };

    if (visible) {
      determineAvailableMethods();
    }
  }, [visible]);

  const handlePayment = async () => {
    // 🚀 COMPREHENSIVE LOGGING: Complete Payment Button Clicked
    console.log("=".repeat(80));
    console.log("🚀 [COMPLETE PAYMENT] ====== BUTTON CLICKED =====");
    console.log("🚀 [COMPLETE PAYMENT] ====== Mobile Payment Modal=====");
    console.log("=".repeat(80));
    
    console.log("👆 [COMPLETE PAYMENT] User clicked 'Complete Payment' button");
    console.log("⏰ [COMPLETE PAYMENT] Click timestamp:", new Date().toISOString());
    console.log("💰 [COMPLETE PAYMENT] Total amount:", total);
    console.log("💳 [COMPLETE PAYMENT] Selected payment method:", selectedMethod);
    console.log("👤 [COMPLETE PAYMENT] Customer data:", customer);
    console.log("🛒 [COMPLETE PAYMENT] Items count:", items.length);
    
    // Log current component state
    console.log("🔍 [COMPLETE PAYMENT] Current component state:", {
      isProcessing: isProcessing,
      showResultModal: showResultModal,
      paymentSuccess: paymentSuccess,
      errorMessage: errorMessage,
      amount: amount,
      change: change
    });
    
    // Log payment method specific details
    if (selectedMethod === "CASH") {
      console.log("💵 [COMPLETE PAYMENT] Processing CASH payment");
      console.log("   • Amount tendered:", amount);
      console.log("   • Change calculated:", change);
    } else if (selectedMethod === "CARD") {
      console.log("💳 [COMPLETE PAYMENT] Processing CARD payment");
      console.log("   • Will call handleCardPayment() function");
    } else if (selectedMethod === "EXTERNAL_POS") {
      console.log("🏪 [COMPLETE PAYMENT] Processing EXTERNAL_POS payment");
      console.log("   • Receipt number:", receiptNumber);
    } else {
      console.log("❓ [COMPLETE PAYMENT] Unknown payment method:", selectedMethod);
    }
    
    console.log("🔄 [COMPLETE PAYMENT] About to start payment processing...");
    console.log("🔄 [COMPLETE PAYMENT] selectedMethod:", selectedMethod);
    console.log("-".repeat(60));

    if (selectedMethod === "CASH") {
      try {
        // Show processing overlay
        setIsProcessing(true);
        setProcessingMessage("Processing cash payment...");

        // Store tendered amount for result modal
        const tenderedAmount = parseFloat(amount || total.toString());
        setFinalAmount(tenderedAmount);
        // Store the actual sale amount for the receipt
        setSaleAmount(total);

        // Complete the payment - this is the API call that can fail
        // Send the actual sale amount (total) to the backend, not the tendered amount
        console.warn(
          "⚠️ BEFORE PAYMENT API CALL - About to execute onPaymentComplete for CASH payment"
        );
        try {
          const result = await onPaymentComplete(total, "CASH");
          console.warn(
            "✅ PAYMENT API CALL SUCCESS - onPaymentComplete executed successfully"
          );

          // ONLY set success state AFTER the API call succeeds
          console.warn("Setting payment success to TRUE");
          setPaymentSuccess(true);

          // Print receipt ONLY after payment is successful
          setProcessingMessage("Printing receipt...");
          
          // Check if any printer is available before attempting to print
          const isPrinterAvailable = await PrinterUtils.isAnyPrinterAvailable();
          if (!isPrinterAvailable) {
            console.log("[PRINT] No printer available, skipping receipt printing");
          } else {
          const receiptItems = items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          }));

          let printSuccess = false;

          try {
            // Try direct printer first
            const SunmiDirectPrinterServiceClass = await loadSunmiDirectPrinterService();
            const directPrinterService =
              SunmiDirectPrinterServiceClass.getInstance();
            const isDirectAvailable =
              await directPrinterService.isPrinterAvailable();
            console.log(
              "[PRINT] Direct printer available for cash sale:",
              isDirectAvailable
            );

            if (isDirectAvailable) {
              try {
                // Generate receipt number for cash sale
                const paddedId = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                const receiptNumber = paddedId ? `NX-CASH-${paddedId}` : `NX-CASH-${Math.floor(1000 + Math.random() * 9000)}`;

                // Print receipt with direct printer - note tendered and change amounts separately
                console.log(
                  "Printing receipt with sale amount:",
                  total,
                  "tendered:",
                  tenderedAmount,
                  "change:",
                  change
                );
                await directPrinterService.printSaleReceipt({
                  paymentType: "CASH",
                  total: total,
                  items: receiptItems,
                  customerName: customer?.fullname || "Guest Customer",
                  receiptNumber,
                  tellerName: staffDisplayName,
                  storeName: staffStoreName,
                });

                console.log("Cash receipt printed successfully (direct mode)");
                printSuccess = true;
              } catch (directError) {
                console.error(
                  "[PRINT] Direct printer error for cash sale:",
                  directError
                );
                // Fall back to legacy printer if direct printing fails
              }
            }

            // If direct printing failed, try legacy printer
            if (!printSuccess) {
              try {
                const SunmiPrinterServiceClass = await loadSunmiPrinterService();
                const printerService = SunmiPrinterServiceClass.getInstance();

                // Generate receipt number for cash sale
                const paddedId = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                const receiptNumber = paddedId ? `NX-CASH-${paddedId}` : `NX-CASH-${Math.floor(1000 + Math.random() * 9000)}`;

                // Print receipt with legacy printer - note tendered and change amounts separately
                console.log(
                  "Printing receipt with sale amount:",
                  total,
                  "tendered:",
                  tenderedAmount,
                  "change:",
                  change
                );
                await printerService.printSaleReceipt({
                  paymentType: "CASH",
                  total: total,
                  items: receiptItems,
                  customerName: customer?.fullname || "Guest Customer",
                  receiptNumber,
                  tellerName: staffDisplayName,
                  storeName: staffStoreName,
                });

                console.log("Cash receipt printed successfully (legacy mode)");
              } catch (legacyError) {
                console.error(
                  "[PRINT] Legacy printer error for cash sale:",
                  legacyError
                );
                // If both printer methods fail, just log the error but continue with the sale
              }
            }
          } catch (error) {
            console.error("[PRINT] General printing error:", error);
            // Continue with result modal even if printing fails
          }
          }

          // Show result modal on success
          console.warn(
            `🚀 SHOWING RESULT MODAL - paymentSuccess: true, errorMessage: ${
              errorMessage || "none"
            }`
          );
          setIsProcessing(false);
          setShowResultModal(true);
        } catch (apiError) {
          console.warn(
            "❌ PAYMENT API CALL FAILED - Error in onPaymentComplete:",
            apiError
          );
          // Set error state
          console.warn("❌ PAYMENT FAILED - Setting payment success to FALSE");
          setPaymentSuccess(false);
          console.warn(
            "❌ PAYMENT FAILED - Setting error message:",
            apiError instanceof Error
              ? apiError.message
              : "Failed to complete cash payment"
          );
          setErrorMessage(
            apiError instanceof Error
              ? apiError.message
              : "Failed to complete cash payment"
          );
          console.warn(
            `❌ SHOWING ERROR RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage set`
          );
          setIsProcessing(false);
          setShowResultModal(true);
        }
      } catch (unexpectedError) {
        // Handle any completely unexpected errors
        console.error("Unexpected error in payment flow:", unexpectedError);
        setPaymentSuccess(false);
        setErrorMessage("An unexpected error occurred");
        setIsProcessing(false);
        setShowResultModal(true);
      }
    } else if (selectedMethod === "CARD") {
      handleCardPayment();
    } else if (selectedMethod === "EXTERNAL_POS") {
      handleExternalPayment();
    } else {
      Alert.alert(
        "Not Implemented",
        "This payment method is not available yet."
      );
    }
  };

  const handleCardPayment = async () => {
    // Determine which payment method to use based on configuration
    try {
      const methods = await getAvailablePaymentMethods();
      console.log('🔍 Available payment methods for card routing:', methods);
      
      if (methods.includes('cendroid')) {
        console.log('💳 Routing to CenDroid payment');
        await handleCendroidPayment({
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
        });
      } else if (methods.includes('ecentric')) {
        console.log('💳 Routing to Ecentric payment');
        await handleEcentricPayment();
      } else {
        console.error("❌ No card payment methods available");
        Alert.alert("Error", "No card payment methods are configured");
      }
    } catch (error) {
      console.error("❌ Error determining payment method:", error);
      Alert.alert("Error", "Failed to determine payment method");
    }
  };

  const handleEcentricPayment = async () => {
    // 🚀 COMPREHENSIVE LOGGING: Card Payment Flow Initiated
    console.log("=".repeat(80));
    console.log("🚀 [CARD PAYMENT FLOW] ====== INITIATED =====");
    console.log("=".repeat(80));
    
    console.log("📱 [CARD PAYMENT] Platform check:", Platform.OS);
    console.log("💰 [CARD PAYMENT] Total amount:", total);
    console.log("👤 [CARD PAYMENT] Customer data:", customer);
    console.log("🛒 [CARD PAYMENT] Items count:", items.length);
    console.log("🏪 [CARD PAYMENT] Selected payment method:", selectedMethod);
    console.log("⏰ [CARD PAYMENT] Timestamp:", new Date().toISOString());
    
    // Log current component state
    console.log("🔍 [CARD PAYMENT] Current component state:", {
      isProcessing: isProcessing,
      showResultModal: showResultModal,
      paymentSuccess: paymentSuccess,
      errorMessage: errorMessage,
      step: step
    });
    
    // Log payment method selection details
    console.log("💳 [CARD PAYMENT] Payment method selection details:", {
      selectedMethod: selectedMethod,
      availableMethods: ["CASH", "ECENTRIC", "EXTERNAL_POS"],
      isCardSelected: selectedMethod === "ECENTRIC"
    });
    
    console.log("🔄 [CARD PAYMENT] About to start Ecentric payment processing...");
    console.log("-".repeat(60));

    if (Platform.OS !== "android") {
      console.error("❌ [CARD PAYMENT] Platform not supported:", Platform.OS);
      Alert.alert(
        "Error",
        "Ecentric Payment is only supported on Android devices"
      );
      return;
    }

    try {
      // Show processing overlay
      console.log("📱 [CARD PAYMENT] Setting processing state to true");
      setIsProcessing(true);
      setProcessingMessage("Initializing card payment...");
      console.log("💬 [CARD PAYMENT] Processing message set to: 'Initializing card payment...'");

      // Get dynamic payment configuration from AsyncStorage
      console.log("💳 [Card Payment] Retrieving dynamic payment configuration...");
      const paymentConfig = await getPaymentConfig();
      
      if (!paymentConfig || Object.keys(paymentConfig).length === 0) {
        console.error("❌ [CARD PAYMENT] No payment configuration found in AsyncStorage");
        throw new Error("Payment configuration not found. Please log in again to refresh configuration.");
      }

      console.log("💳 [Card Payment] Using dynamic payment config:", paymentConfig);

      // Round the amount for testing purposes
      const roundedAmount = Math.round(total);
      console.log(
        "💳 [Card Payment] Starting Ecentric payment process with rounded amount:",
        roundedAmount
      );

      // Generate a transaction ID using our custom function
      const rawTransactionUuid = generateUUID();
      // Ensure the UUID is properly formatted without extra spaces
      const transactionUuid = rawTransactionUuid.trim();
      console.log(
        "💳 [Card Payment] Generated transaction ID:",
        transactionUuid
      );

      // Format amount in cents (multiply by 100) - required format per docs
      const amountInCents = roundedAmount * 100;

      // Generate a unique reference number (max 12 characters)
      const referenceNo = `NX-${Math.floor(1000 + Math.random() * 9000)}`;

      // Sanitize the transaction description
      const transactionDescription = `Nexo sale ${referenceNo}`.replace(
        /[^\w\s\-]/gi,
        ""
      );

      console.log("Initiating card payment flow");

      // Use customer name if available, otherwise use "Guest Customer"
      // BUT since we know anonymous transactions work, fall back to Guest Customer
      // regardless of whether a real customer is provided
      const customerName = "Guest Customer";

      // Use a fixed known-good phone number regardless of customer data
      // since anonymous transactions are working
      const cellNumber = "27823456789";

      // Use a fixed known-good email address
      const emailAddress = "receipt@nexo.com";

      console.log(
        "Customer data: Using anonymous values for maximum compatibility"
      );

      // Log payment preparation details as in the working implementation
      console.log("Preparing payment request with details:", {
        amountInCents,
        customerName,
        originalAmount: total,
        referenceNumber: referenceNo,
        roundedAmount,
        transactionUuid,
      });

      // Payment authentication is now handled by PaymentServiceManager
      // It will clear old auth and get fresh authentication before each payment (matching legacy)
      console.log("Processing payment through PaymentServiceManager...");
      setProcessingMessage("Connecting to payment terminal...");

      console.log("Transaction UUID:", transactionUuid);

      // PaymentServiceManager will build payment params from dynamic config
      // No need to hardcode values here - they come from login response
      console.log("Payment will use dynamic config from PaymentServiceManager");

      console.log("🔄 [PAYMENT] Calling PaymentServiceManager with:", {
        amount: amountInCents,
        reference: referenceNo,
        description: transactionDescription,
        customerName,
        cellNumber,
        emailAddress
      });

      // Use PaymentServiceManager to process the payment
      // This will authenticate with the terminal before processing
      const response = await PaymentServiceManager.processPayment(
        amountInCents,
        referenceNo,
        {
          transactionId: transactionUuid,
          description: transactionDescription,
          customerName,
          cellNumber,
          emailAddress,
        }
      );

      // 🚀 COMPREHENSIVE LOGGING: Native Module Response
      console.log("=".repeat(80));
      console.log("🚀 [NATIVE MODULE RESPONSE] ====== SALE TRANSACTION COMPLETED =====");
      console.log("=".repeat(80));
      
      console.log("✅ [NATIVE RESPONSE] Native module call completed successfully");
      console.log("⏰ [NATIVE RESPONSE] Response timestamp:", new Date().toISOString());
      console.log("📱 [NATIVE RESPONSE] Raw response object:", response);
      
      // Log response structure and key properties
      if (response) {
        console.log("🔍 [NATIVE RESPONSE] Response structure analysis:");
        console.log("   • Response type:", typeof response);
        console.log("   • Response keys:", Object.keys(response || {}));
        console.log("   • isApproved:", response.isApproved);
        console.log("   • resultCode:", response.resultCode);
        console.log("   • resultDescription:", response.resultDescription);
        console.log("   • authenticationKey:", response.authenticationKey);
        console.log("   • transactionUuid:", response.transactionUuid);
        console.log("   • receiptBundle exists:", !!response.receiptBundle);
        console.log("   • isReceiptDataAvailable:", response.isReceiptDataAvailable);
      } else {
        console.warn("⚠️ [NATIVE RESPONSE] Response is null/undefined");
      }
      
      console.log("-".repeat(60));

      console.log("Sale transaction result:", response);

      // Check for receipt data
      if (!response.receiptBundle) {
        console.log("No receipt bundle found in result");
      }

      // Check if payment was successful - in the working logs, resultCode "01" means success
      // and there's an isApproved property set to "true"
      const isApproved =
        response.isApproved === "true" || response.isApproved === true;

      if (isApproved && response.resultCode === "01") {
        console.log("Transaction successful");

        // Format the response as in the working implementation
        const formattedResponse = {
          success: true,
          isApproved: true,
          resultCode: response.resultCode,
          resultDescription: response.resultDescription,
          launchType: response.launchType,
          merchantName: response.merchantName,
          customerName: response.customerName,
          authenticationKey: response.authenticationKey || "N/A",
          transactionDescription:
            response.transactionDescription || `Nexo sale #${referenceNo}`,
          transactionUuid: response.transactionUuid || transactionUuid,
          cellNumberToSMSReceipt: response.cellNumberToSMSReceipt || cellNumber,
          emailAddressToSendReceipt:
            response.emailAddressToSendReceipt || emailAddress,
          isReceiptRequired: response.isReceiptRequired || true,
          isReceiptDataAvailable: response.isReceiptDataAvailable || false,
        };

        console.log("Sale response received:", formattedResponse);

        // Generate a unique auth code if none is provided by response
        const authCode =
          response.authCode || `AUTH-${transactionUuid.substring(0, 6)}`;

        // Prepare Ecentric payment details for backend storage
        const ecentricDetails: any = {
          ecentric_transaction_uuid: transactionUuid,
          ecentric_auth_code: authCode,
          ecentric_result_code: response.resultCode || "01",
          ecentric_result_desc: response.resultDescription || "APPROVED",
          ecentric_is_approved: isApproved,
          ecentric_rrn: response.rrn || transactionUuid.substring(0, 12),
          ecentric_card_type: response.cardType || "CARD",
          ecentric_masked_pan: response.maskedPan || "************1234",
          ecentric_terminal_id:
            response.terminalId || response.pebbleSerialNumber || "74100199",
          ecentric_application_id: response.aid || "A0000000031010",
        };

        // Add receipt details if available
        if (response.isReceiptDataAvailable && response.receiptBundle) {
          console.log("Receipt data available, adding to payment details");
          ecentricDetails.ecentric_receipt_details = response.receiptBundle;
          ecentricDetails.ecentric_receipt_number =
            response.receiptBundle.receiptNumber ||
            response.referenceNumber ||
            "";
        } else if (response.isReceiptDataAvailable) {
          console.log(
            "isReceiptDataAvailable is true but no receiptBundle found"
          );
          ecentricDetails.ecentric_receipt_details = {
            info: "Receipt data flagged as available but no bundle received",
          };
        } else {
          console.log("No receipt data available");
        }

        console.log(
          "Adding Ecentric payment details to sale request - summary:",
          {
            hasCardDetails: !!ecentricDetails.ecentric_masked_pan,
            hasAuthCode: !!ecentricDetails.ecentric_auth_code,
            hasRRN: !!ecentricDetails.ecentric_rrn,
            hasTerminalId: !!ecentricDetails.ecentric_terminal_id,
            cardType: ecentricDetails.ecentric_card_type || "Unknown",
          }
        );

        // Store details for result modal
        setPaymentDetails(ecentricDetails);
        setFinalAmount(roundedAmount);

        console.log("Got validation response:", ecentricDetails);

        // Complete payment with try/catch
        try {
          // Try to complete payment with ECENTRIC details - this is the API call that can fail
          console.warn(
            "⚠️ BEFORE PAYMENT API CALL - About to execute onPaymentComplete for ECENTRIC payment"
          );
          setProcessingMessage("Finalizing payment...");
          try {
            const result = await onPaymentComplete(
              roundedAmount,
              "ECENTRIC",
              ecentricDetails
            );
            console.warn(
              "✅ PAYMENT API CALL SUCCESS - onPaymentComplete executed successfully"
            );

            // ONLY set success state AFTER the API call succeeds
            console.warn("Setting payment success to TRUE");
            setPaymentSuccess(true);

            // Try to print receipt for card payment ONLY after payment is successful
            setProcessingMessage("Printing receipt...");
            
            // Check if any printer is available before attempting to print
            const isPrinterAvailable = await PrinterUtils.isAnyPrinterAvailable();
            if (!isPrinterAvailable) {
              console.log("[PRINT] No printer available, skipping receipt printing");
            } else {
            try {
              // Prepare receipt items
              const receiptItems = items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              }));

              // First try direct printer
              const SunmiDirectPrinterServiceClass = await loadSunmiDirectPrinterService();
              const directPrinterService =
                SunmiDirectPrinterServiceClass.getInstance();
              const isDirectAvailable =
                await directPrinterService.isPrinterAvailable();
              console.log(
                "[PRINT] Direct printer available for card payment:",
                isDirectAvailable
              );

              let printSuccess = false;

              if (isDirectAvailable) {
                try {
                  // Print receipt with direct printer
                  const paddedId = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                  await directPrinterService.printSaleReceipt({
                    paymentType: "CARD",
                    total: roundedAmount,
                    items: receiptItems,
                    customerName:
                      customer?.fullname || customerName || "Guest Customer",
                    cardDetails: ecentricDetails,
                    receiptNumber:
                      paddedId ? `NX-CARD-${paddedId}` : (ecentricDetails.ecentric_receipt_number || referenceNo),
                    tellerName: staffDisplayName,
                    storeName: staffStoreName,
                  });

                  console.log(
                    "Card payment receipt printed successfully (direct mode)"
                  );
                  printSuccess = true;
                } catch (directError) {
                  console.error(
                    "[PRINT] Direct printer error for card payment:",
                    directError
                  );
                  // Fall back to legacy printer if direct printing fails
                }
              }

              // If direct printing failed, try legacy printer
              if (!printSuccess) {
                try {
                  const SunmiPrinterServiceClass = await loadSunmiPrinterService();
                const printerService = SunmiPrinterServiceClass.getInstance();

                  // Print receipt with legacy printer
                  const paddedId2 = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                  await printerService.printSaleReceipt({
                    paymentType: "CARD",
                    total: roundedAmount,
                    items: receiptItems,
                    customerName:
                      customer?.fullname || customerName || "Guest Customer",
                    cardDetails: ecentricDetails,
                    receiptNumber:
                      paddedId2 ? `NX-CARD-${paddedId2}` : (ecentricDetails.ecentric_receipt_number || referenceNo),
                    tellerName: staffDisplayName,
                    storeName: staffStoreName,
                  });

                  console.log(
                    "Card payment receipt printed successfully (legacy mode)"
                  );
                } catch (legacyError) {
                  console.error(
                    "[PRINT] Legacy printer error for card payment:",
                    legacyError
                  );
                }
              }
            } catch (printError) {
              console.error(
                "[PRINT] General printing error for card payment:",
                printError
              );
              // Continue even if printing fails
            }
            }

            // Show result modal on success
            console.warn(
              `🚀 SHOWING RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage: ${
                errorMessage || "none"
              }`
            );
            setIsProcessing(false);
            setShowResultModal(true);
          } catch (apiError) {
            console.warn(
              "❌ PAYMENT API CALL FAILED - Error in onPaymentComplete:",
              apiError
            );
            // Set error state
            console.warn(
              "❌ ECENTRIC PAYMENT FAILED - Setting payment success to FALSE"
            );
            setPaymentSuccess(false);
            console.warn(
              "❌ ECENTRIC PAYMENT FAILED - Setting error message:",
              apiError instanceof Error
                ? apiError.message
                : "Failed to complete card payment"
            );
            setErrorMessage(
              apiError instanceof Error
                ? apiError.message
                : "Failed to complete card payment"
            );
            console.warn(
              `❌ SHOWING ERROR RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage set`
            );
            setIsProcessing(false);
            setShowResultModal(true);
          }
        } catch (unexpectedError) {
          // Handle any completely unexpected errors
          console.error(
            "Unexpected error in card payment flow:",
            unexpectedError
          );
          setPaymentSuccess(false);
          setErrorMessage("An unexpected error occurred with card payment");
          setIsProcessing(false);
          setShowResultModal(true);
        }
      } else {
        // Format the error message based on what's available in the response
        let errorMessage = "";

        switch (response.resultCode) {
          case "02":
            errorMessage = "Transaction declined by bank";
            break;
          case "03":
            errorMessage = "Transaction aborted by user or timeout";
            break;
          case "04":
            errorMessage =
              "Payment device error - Terminal may need to be restarted. Please check the device and try again later.";
            break;
          default:
            errorMessage =
              response.resultDescription || "Unknown payment error";
        }

        console.error(
          `💳 [Card Payment] Payment failed with code ${response.resultCode}: ${errorMessage}`
        );

        // Show result modal with error
        setPaymentSuccess(false);
        setErrorMessage(errorMessage);
        setFinalAmount(roundedAmount);
        setIsProcessing(false);
        setShowResultModal(true);
      }
    } catch (error) {
      console.error("💳 [Card Payment] Error processing payment:", error);
      // Show result modal with error
      setPaymentSuccess(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to process card payment"
      );
      setFinalAmount(total);
      setIsProcessing(false);
      setShowResultModal(true);
    }
  };

  const handleExternalPayment = async () => {
    try {
      if (!receiptNumber.trim()) {
        Alert.alert("Error", "Please enter the receipt number");
        return;
      }

      // Show processing overlay
      setIsProcessing(true);
      setProcessingMessage("Processing external payment...");

      // Prepare external payment details
      const externalPaymentDetails = {
        payment_type: "EXTERNAL_POS",
        external_pos_receipt_number: receiptNumber.trim(),
        total: total,
        productsText: JSON.stringify(
          items.map((item) => ({
            product_id: item.id || 1,
            quantity: item.quantity,
          }))
        ),
        discount: 0,
      };

      // Store details for result modal
      setPaymentDetails(externalPaymentDetails);
      setFinalAmount(total);

      // Complete payment with try/catch
      try {
        console.warn(
          "⚠️ BEFORE PAYMENT API CALL - About to execute onPaymentComplete for EXTERNAL_POS payment"
        );
        setProcessingMessage("Finalizing payment...");
        try {
          const result = await onPaymentComplete(
            total,
            "EXTERNAL_POS",
            externalPaymentDetails
          );
          console.warn(
            "✅ PAYMENT API CALL SUCCESS - onPaymentComplete executed successfully"
          );

          // ONLY set success state AFTER the API call succeeds
          console.warn("Setting payment success to TRUE");
          setPaymentSuccess(true);

          // Try to print receipt for external payment ONLY after payment is successful
          setProcessingMessage("Printing receipt...");
          
          // Check if any printer is available before attempting to print
          const isPrinterAvailable = await PrinterUtils.isAnyPrinterAvailable();
          if (!isPrinterAvailable) {
            console.log("[PRINT] No printer available, skipping receipt printing");
          } else {
          try {
            // Prepare receipt items
            const receiptItems = items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            }));

            // First try direct printer
            const SunmiDirectPrinterServiceClass = await loadSunmiDirectPrinterService();
            const directPrinterService =
              SunmiDirectPrinterServiceClass.getInstance();
            const isDirectAvailable =
              await directPrinterService.isPrinterAvailable();
            console.log(
              "[PRINT] Direct printer available for external payment:",
              isDirectAvailable
            );

            let printSuccess = false;

            if (isDirectAvailable) {
              try {
                // Print receipt with direct printer
                const paddedId = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                await directPrinterService.printSaleReceipt({
                  paymentType: "EXTERNAL_POS",
                  total: total,
                  items: receiptItems,
                  customerName: customer?.fullname || "Guest Customer",
                  receiptNumber: paddedId ? `NX-EXT-${paddedId}` : receiptNumber.trim(),
                  tellerName: staffDisplayName,
                  storeName: staffStoreName,
                });

                console.log(
                  "External payment receipt printed successfully (direct mode)"
                );
                printSuccess = true;
              } catch (directError) {
                console.error(
                  "[PRINT] Direct printer error for external payment:",
                  directError
                );
                // Fall back to legacy printer if direct printing fails
              }
            }

            // If direct printing failed, try legacy printer
            if (!printSuccess) {
              try {
                const SunmiPrinterServiceClass = await loadSunmiPrinterService();
                const printerService = SunmiPrinterServiceClass.getInstance();

                // Print receipt with legacy printer
                const paddedId2 = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                await printerService.printSaleReceipt({
                  paymentType: "EXTERNAL_POS",
                  total: total,
                  items: receiptItems,
                  customerName: customer?.fullname || "Guest Customer",
                  receiptNumber: paddedId2 ? `NX-EXT-${paddedId2}` : receiptNumber.trim(),
                  tellerName: staffDisplayName,
                  storeName: staffStoreName,
                });

                console.log(
                  "External payment receipt printed successfully (legacy mode)"
                );
              } catch (legacyError) {
                console.error(
                  "[PRINT] Legacy printer error for external payment:",
                  legacyError
                );
              }
            }
          } catch (printError) {
            console.error(
              "[PRINT] General printing error for external payment:",
              printError
            );
            // Continue even if printing fails
          }
          }

          // Show result modal on success
          console.warn(
            `🚀 SHOWING RESULT MODAL - paymentSuccess: true, errorMessage: ${
              errorMessage || "none"
            }`
          );
          setIsProcessing(false);
          setShowResultModal(true);
        } catch (apiError) {
          console.warn(
            "❌ PAYMENT API CALL FAILED - Error in onPaymentComplete:",
            apiError
          );
          // Set error state
          console.warn(
            "❌ EXTERNAL PAYMENT FAILED - Setting payment success to FALSE"
          );
          setPaymentSuccess(false);
          console.warn(
            "❌ EXTERNAL PAYMENT FAILED - Setting error message:",
            apiError instanceof Error
              ? apiError.message
              : "Failed to complete external payment"
          );
          setErrorMessage(
            apiError instanceof Error
              ? apiError.message
              : "Failed to complete external payment"
          );
          console.warn(
            `❌ SHOWING ERROR RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage set`
          );
          setIsProcessing(false);
          setShowResultModal(true);
        }
      } catch (unexpectedError) {
        // Handle any completely unexpected errors
        console.error(
          "Unexpected error in external payment flow:",
          unexpectedError
        );
        setPaymentSuccess(false);
        setErrorMessage("An unexpected error occurred with external payment");
        setIsProcessing(false);
        setShowResultModal(true);
      }
    } catch (error) {
      console.error("Error processing external payment:", error);
      // Show result modal with error
      setPaymentSuccess(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to process external payment"
      );
      setFinalAmount(total);
      setIsProcessing(false);
      setShowResultModal(true);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[tw`flex-1 bg-white`, { height: modalHeight }]}>
          {/* Header */}
          <View
            style={tw`p-4 border-b border-gray-100 flex-row items-center justify-between`}
          >
            <View style={tw`flex-row items-center`}>
              {step === "amount" && (
                <TouchableOpacity
                  onPress={() => setStep("method")}
                  style={tw`mr-2`}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              )}
              <GeistText style={[tw`text-gray-900`, typography.h2]}>
                {step === "method" ? "Select Payment Method" : "Enter Amount"}
              </GeistText>
            </View>
            <TouchableOpacity onPress={onClose} style={tw`p-2`}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <View style={tw`flex-1 flex-col`}>
            <ScrollView
              style={tw`flex-1`}
              contentContainerStyle={tw`pb-4`}
              showsVerticalScrollIndicator={true}
            >
              {step === "method" ? (
                <View style={tw`p-4`}>
                  {/* Show warning for zero-price items */}
                  {hasZeroPriceItems && (
                    <View
                      style={tw`mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl`}
                    >
                      <View style={tw`flex-row items-center`}>
                        <MaterialCommunityIcons
                          name="alert-circle-outline"
                          size={20}
                          color="#f97316"
                        />
                        <GeistText
                          style={tw`text-orange-700 ml-2 text-sm font-medium`}
                        >
                          Cash payment only - total amount is R 0.00
                        </GeistText>
                      </View>
                    </View>
                  )}

                  {/* Payment Methods Grid */}
                  <View style={tw`flex-row flex-wrap -mx-2 mb-6`}>
                    {availablePaymentMethods.filter(
                      (method) => !hasZeroPriceItems || method.id === "CASH"
                    ).map((method) => (
                      <TouchableOpacity
                        key={method.id}
                        style={tw`w-1/2 p-2`}
                        onPress={() => {
                          // 🚀 COMPREHENSIVE LOGGING: Payment Method Selection
                          console.log("=".repeat(60));
                          console.log("🚀 [PAYMENT METHOD SELECTION] ====== INITIATED =====");
                          console.log("=".repeat(60));
                          
                          console.log("👆 [METHOD SELECTION] User tapped payment method");
                          console.log("💳 [METHOD SELECTION] Selected method ID:", method.id);
                          console.log("📝 [METHOD SELECTION] Selected method name:", method.name);
                          console.log("🎨 [METHOD SELECTION] Method color:", method.color);
                          console.log("⏰ [METHOD SELECTION] Selection timestamp:", new Date().toISOString());
                          
                          // Log current state before selection
                          console.log("🔍 [METHOD SELECTION] Current state before selection:", {
                            currentSelectedMethod: selectedMethod,
                            currentAmount: amount,
                            total: total
                          });
                          
                          // Reset error state when switching payment methods
                          console.log("🔄 [METHOD SELECTION] Resetting error state for new payment method");
                          setErrorMessage("");
                          setPaymentSuccess(false);
                          setShowResultModal(false);
                          
                          // Log the action being taken
                          if (method.id !== "CASH") {
                            console.log("💰 [METHOD SELECTION] Non-cash method selected - setting amount to total");
                            setAmount(total.toString());
                          } else {
                            console.log("💵 [METHOD SELECTION] Cash method selected - clearing amount");
                            setAmount("");
                          }
                          
                          // Set the selected method
                          console.log("✅ [METHOD SELECTION] Setting selectedMethod to:", method.id);
                          setSelectedMethod(method.id);
                          
                          console.log("🔄 [METHOD SELECTION] Payment method selection completed");
                          console.log("-".repeat(60));
                        }}
                      >
                        <View
                          style={tw`p-4 rounded-xl border-2 ${
                            selectedMethod === method.id
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <View
                            style={[
                              tw`w-12 h-12 rounded-full items-center justify-center mb-3`,
                              { backgroundColor: `${method.color}20` },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={method.icon as IconName}
                              size={24}
                              color={method.color}
                            />
                          </View>
                          <GeistText
                            style={[
                              tw`${
                                selectedMethod === method.id
                                  ? "text-blue-600"
                                  : "text-gray-900"
                              }`,
                              typography.bodyMedium,
                            ]}
                          >
                            {method.name}
                          </GeistText>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Order Summary Section */}
                  <View style={tw`mb-4`}>
                    <TouchableOpacity
                      style={tw`bg-gray-50 rounded-xl p-4`}
                      onPress={() =>
                        setIsOrderSummaryExpanded(!isOrderSummaryExpanded)
                      }
                    >
                      <View style={tw`flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center`}>
                          <MaterialCommunityIcons
                            name="cart-outline"
                            size={20}
                            color="#6b7280"
                            style={tw`mr-2`}
                          />
                          <GeistText
                            style={[tw`text-gray-900`, typography.bodyBold]}
                          >
                            Order Summary
                          </GeistText>
                        </View>
                        <View style={tw`flex-row items-center`}>
                          <GeistText
                            style={[tw`text-gray-500 mr-2`, typography.caption]}
                          >
                            {items.length} item{items.length !== 1 ? "s" : ""}
                          </GeistText>
                          <MaterialCommunityIcons
                            name={
                              isOrderSummaryExpanded
                                ? "chevron-up"
                                : "chevron-down"
                            }
                            size={20}
                            color="#6b7280"
                          />
                        </View>
                      </View>

                      {isOrderSummaryExpanded && (
                        <ScrollView
                          style={tw`max-h-40 mt-3`}
                          showsVerticalScrollIndicator={true}
                        >
                          {items.map((item, index) => (
                            <View
                              key={index}
                              style={tw`flex-row justify-between items-center py-2 ${
                                index !== items.length - 1
                                  ? "border-b border-gray-200"
                                  : ""
                              }`}
                            >
                              <View style={tw`flex-1 mr-2`}>
                                <GeistText
                                  style={[tw`text-gray-900`, typography.body]}
                                  numberOfLines={1}
                                >
                                  {item.name}
                                </GeistText>
                                <GeistText
                                  style={[
                                    tw`text-gray-500`,
                                    typography.caption,
                                  ]}
                                >
                                  {item.quantity} ×{" "}
                                  <CurrencyFormat value={item.price} />
                                </GeistText>
                              </View>
                              <GeistText
                                style={[tw`text-gray-900`, typography.bodyBold]}
                              >
                                <CurrencyFormat
                                  value={item.price * item.quantity}
                                />
                              </GeistText>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={tw`p-4`}>
                  {/* Amount Display */}
                  <View style={tw`bg-gray-50 rounded-xl p-4 mb-4`}>
                    <View
                      style={tw`flex-row justify-between items-center mb-4`}
                    >
                      <View>
                        <GeistText style={[tw`text-gray-500`, typography.caption]}>
                          Amount Due
                        </GeistText>
                        <GeistText style={[tw`text-gray-900`, typography.h2]}>
                          <CurrencyFormat value={total} />
                        </GeistText>
                      </View>
                      <View>
                        <GeistText style={[tw`text-gray-500`, typography.caption]}>
                          Change
                        </GeistText>
                        <GeistText
                          style={[
                            tw`${
                              change >= 0 ? "text-green-600" : "text-red-600"
                            }`,
                            typography.h2,
                          ]}
                        >
                          <CurrencyFormat value={change} />
                        </GeistText>
                      </View>
                    </View>
                    <View style={tw`bg-white rounded-lg p-3`}>
                      <GeistText style={[tw`text-gray-500`, typography.caption]}>
                        Amount Tendered
                      </GeistText>
                      <GeistText style={[tw`text-blue-600`, typography.h2]}>
                        <CurrencyFormat value={parseFloat(amount || "0")} />
                      </GeistText>
                    </View>
                  </View>

                  {selectedMethod === "EXTERNAL_POS" && (
                    <View style={tw`mb-4`}>
                      <View
                        style={tw`bg-white rounded-lg border border-gray-200 p-4`}
                      >
                        <GeistText
                          style={[tw`text-gray-600 mb-2`, typography.caption]}
                        >
                          External POS Receipt Number
                        </GeistText>
                        <TextInput
                          style={[
                            tw`bg-gray-50 rounded-lg p-3 text-gray-900`,
                            typography.body,
                          ]}
                          placeholder="Enter receipt number"
                          value={receiptNumber}
                          onChangeText={setReceiptNumber}
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>
                  )}

                  {selectedMethod === "CASH" ? (
                    <>
                      {/* Quick Amounts */}
                      <View style={tw`mb-4`}>
                        <View style={tw`flex-row flex-wrap -mx-1`}>
                          {QUICK_AMOUNTS.map((value) => (
                            <TouchableOpacity
                              key={value}
                              style={tw`w-1/3 p-1`}
                              onPress={() => handleQuickAmount(value)}
                            >
                              <View
                                style={tw`bg-gray-100 rounded-lg p-3 items-center`}
                              >
                                <GeistText
                                  style={[
                                    tw`text-gray-900`,
                                    typography.bodyMedium,
                                  ]}
                                >
                                  <CurrencyFormat value={value} />
                                </GeistText>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Keypad */}
                      <View style={tw`flex-1`}>
                        <View style={tw`flex-row flex-wrap -mx-1`}>
                          {[
                            "1",
                            "2",
                            "3",
                            "4",
                            "5",
                            "6",
                            "7",
                            "8",
                            "9",
                            ".",
                            "0",
                            "⌫",
                          ].map((key) => (
                            <TouchableOpacity
                              key={key}
                              style={tw`w-1/3 p-1`}
                              onPress={() =>
                                key === "⌫"
                                  ? handleBackspace()
                                  : handleNumberPress(key)
                              }
                            >
                              <View
                                style={tw`bg-gray-100 rounded-lg p-4 items-center justify-center ${
                                  key === "⌫" ? "bg-red-100" : ""
                                }`}
                              >
                                <GeistText
                                  style={[
                                    tw`${
                                      key === "⌫"
                                        ? "text-red-600"
                                        : "text-gray-900"
                                    }`,
                                    typography.h2,
                                  ]}
                                >
                                  {key}
                                </GeistText>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={tw`flex-1 justify-end`}>
                      <TouchableOpacity
                        style={tw`h-16 bg-blue-600 rounded-xl items-center justify-center ${
                          !selectedMethod || !isExternalPaymentValid
                            ? "opacity-50"
                            : ""
                        }`}
                        onPress={handlePayment}
                        disabled={!selectedMethod || !isExternalPaymentValid}
                      >
                        <GeistText style={[tw`text-white`, typography.h2]}>
                          Complete Payment
                        </GeistText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Fixed Bottom Section - Only show on payment method selection screen */}
            {step === "method" ? (
              <View style={tw`bg-white border-t border-gray-100 p-4`}>
                {/* Totals Summary */}
                <View style={tw`mb-4`}>
                  <View style={tw`flex-row justify-between mb-2`}>
                    <GeistText style={[tw`text-gray-600`, typography.body]}>
                      Subtotal
                    </GeistText>
                    <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                      <CurrencyFormat value={total} />
                    </GeistText>
                  </View>
                  <View style={tw`flex-row justify-between mb-2`}>
                    <GeistText style={[tw`text-gray-600`, typography.body]}>
                      Tax (15%)
                    </GeistText>
                    <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                      <CurrencyFormat value={total - total / 1.15} />
                    </GeistText>
                  </View>
                  <View
                    style={tw`flex-row justify-between pt-2 border-t border-gray-200`}
                  >
                    <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                      Total
                    </GeistText>
                    <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                      <CurrencyFormat value={total} />
                    </GeistText>
                  </View>
                </View>

                {/* Complete Payment Button - Show for Card payments only */}
                {selectedMethod === "CARD" && (
                  <TouchableOpacity
                    style={tw`bg-blue-600 p-4 rounded-xl`}
                    onPress={handlePayment}
                  >
                    <GeistText
                      style={[tw`text-white text-center`, typography.bodyBold]}
                    >
                      Complete Payment
                    </GeistText>
                  </TouchableOpacity>
                )}

                {/* Continue Button for Cash and External payments */}
                {(selectedMethod === "CASH" || selectedMethod === "EXTERNAL_POS") && (
                  <TouchableOpacity
                    style={tw`bg-blue-600 p-4 rounded-xl`}
                    onPress={() => setStep("amount")}
                  >
                    <GeistText
                      style={[tw`text-white text-center`, typography.bodyBold]}
                    >
                      Continue
                    </GeistText>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={tw`p-4 border-t border-gray-100`}>
                <TouchableOpacity
                  style={tw`bg-blue-600 p-4 rounded-xl ${
                    (!amount && selectedMethod === "CASH" && total > 0) ||
                    (parseFloat(amount || "0") < total &&
                      selectedMethod === "CASH" &&
                      total > 0) ||
                    !isExternalPaymentValid
                      ? "opacity-50"
                      : ""
                  }`}
                  onPress={handlePayment}
                  disabled={
                    (!amount && selectedMethod === "CASH" && total > 0) ||
                    (parseFloat(amount || "0") < total &&
                      selectedMethod === "CASH" &&
                      total > 0) ||
                    !isExternalPaymentValid
                  }
                >
                  <GeistText
                    style={[tw`text-white text-center`, typography.bodyBold]}
                  >
                    Complete Payment
                  </GeistText>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Processing Payment Overlay */}
          {isProcessing && (
            <View
              style={tw`absolute z-50 flex-1 justify-center items-center bg-black bg-opacity-50 w-full h-full`}
            >
              <View
                style={tw`bg-white p-6 rounded-xl w-4/5 max-w-sm items-center`}
              >
                <ActivityIndicator
                  size="large"
                  color="#3b82f6"
                  style={tw`mb-4`}
                />
                <GeistText
                  style={[
                    tw`text-gray-900 text-center mb-2`,
                    typography.bodyBold,
                  ]}
                >
                  {processingMessage}
                </GeistText>
                <GeistText
                  style={[tw`text-gray-600 text-center`, typography.caption]}
                >
                  Please do not close the app or leave this screen
                </GeistText>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Payment Result Modal */}
      <PaymentResultModal
        visible={showResultModal}
        onClose={() => {
          setShowResultModal(false);
          if (paymentSuccess) {
            onClose();
          }
        }}
        isSuccess={paymentSuccess}
        errorMessage={errorMessage}
        ecentricDetails={paymentDetails}
        amount={saleAmount}
        customerName={customer?.fullname}
        customerEmail={customer?.email}
        items={items}
      />
    </>
  );
}

function TabletPaymentModal({
  visible,
  onClose,
  total,
  onPaymentComplete,
  items = [],
  customer = null,
  hasZeroPriceItems,
}: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [change, setChange] = useState(0);
  const [receiptNumber, setReceiptNumber] = useState(""); // Add receipt number state
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState(BASE_PAYMENT_METHODS);
  const { currentStaff } = useStaffSession();
  const staffDisplayName = (currentStaff as any)?.displayName || undefined;
  const staffStoreName = (currentStaff as any)?.storeName || undefined;
  // State for payment result modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [finalAmount, setFinalAmount] = useState(0);
  // Add loading overlay state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(
    "Processing payment..."
  );
  const [saleAmount, setSaleAmount] = useState<number>(0);

  // Get screen dimensions
  const { height: screenHeight } = useWindowDimensions();

  // Add validation for receipt number
  const isExternalPaymentValid =
    selectedMethod === "EXTERNAL_POS" ? !!receiptNumber.trim() : true;

  // Calculate modal height based on screen size
  const modalHeight = screenHeight * 0.85; // 85% of screen height

  useEffect(() => {
    if (visible) {
      // Reset states when modal opens
      setAmount("");
      setChange(0);
      setSelectedMethod(null);
      setPaymentSuccess(false);
      setErrorMessage("");
      setReceiptNumber(""); // Reset receipt number
    }
  }, [visible]);

  // Set default amount for zero-price transactions
  useEffect(() => {
    if (visible && total === 0 && selectedMethod === "CASH") {
      setAmount("0");
      setChange(0);
    }
  }, [visible, total, selectedMethod]);

  const handleNumberPress = (num: string) => {
    if (num === "." && amount.includes(".")) return;
    if (num === "." && amount === "") {
      setAmount("0.");
      return;
    }
    setAmount((prev) => {
      const newAmount = prev + num;
      const parsedAmount = parseFloat(newAmount);
      calculateChange(parsedAmount);
      return newAmount;
    });
  };

  const handleBackspace = () => {
    setAmount((prev) => {
      const newAmount = prev.slice(0, -1);
      const parsedAmount = parseFloat(newAmount || "0");
      calculateChange(parsedAmount);
      return newAmount;
    });
  };

  const calculateChange = (inputAmount: number) => {
    const changeAmount = inputAmount - total;
    setChange(changeAmount >= 0 ? changeAmount : 0);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    calculateChange(value);
  };

  // Determine available payment methods based on configuration
  useEffect(() => {
    const determineAvailableMethods = async () => {
      try {
        const methods = await getAvailablePaymentMethods();
        console.log('🔍 Available payment methods:', methods);
        
        // Filter base payment methods based on available configuration
        const filteredMethods = BASE_PAYMENT_METHODS.filter(method => {
          if (method.id === "CASH" || method.id === "EXTERNAL_POS") {
            return true; // Always available
          }
          
          if (method.id === "CARD") {
            // Show Card option if either Ecentric or Cendroid is available
            return methods.includes('ecentric') || methods.includes('cendroid');
          }
          
          return false;
        });
        
        console.log('🔍 Filtered payment methods:', filteredMethods);
        setAvailablePaymentMethods(filteredMethods);
      } catch (error) {
        console.error('❌ Error determining available payment methods:', error);
        // Fallback to base methods if there's an error
        setAvailablePaymentMethods(BASE_PAYMENT_METHODS);
      }
    };

    if (visible) {
      determineAvailableMethods();
    }
  }, [visible]);

  const handlePayment = async () => {
    // 🚀 COMPREHENSIVE LOGGING: Complete Payment Button Clicked
    console.log("=".repeat(80));
    console.log("🚀 [COMPLETE PAYMENT] ====== BUTTON CLICKED =====");
    console.log("🚀 [COMPLETE PAYMENT] ====== Tablet Payment Modal=====");
    console.log("=".repeat(80));
    
    console.log("👆 [COMPLETE PAYMENT] User clicked 'Complete Payment' button");
    console.log("⏰ [COMPLETE PAYMENT] Click timestamp:", new Date().toISOString());
    console.log("💰 [COMPLETE PAYMENT] Total amount:", total);
    console.log("💳 [COMPLETE PAYMENT] Selected payment method:", selectedMethod);
    console.log("👤 [COMPLETE PAYMENT] Customer data:", customer);
    console.log("🛒 [COMPLETE PAYMENT] Items count:", items.length);
    
    // Log current component state
    console.log("🔍 [COMPLETE PAYMENT] Current component state:", {
      isProcessing: isProcessing,
      showResultModal: showResultModal,
      paymentSuccess: paymentSuccess,
      errorMessage: errorMessage,
      amount: amount,
      change: change
    });
    
    // Log payment method specific details
    if (selectedMethod === "CASH") {
      console.log("💵 [COMPLETE PAYMENT] Processing CASH payment");
      console.log("   • Amount tendered:", amount);
      console.log("   • Change calculated:", change);
    } else if (selectedMethod === "CARD") {
      console.log("💳 [COMPLETE PAYMENT] Processing CARD payment");
      console.log("   • Will call handleCardPayment() function");
    } else if (selectedMethod === "EXTERNAL_POS") {
      console.log("🏪 [COMPLETE PAYMENT] Processing EXTERNAL_POS payment");
      console.log("   • Receipt number:", receiptNumber);
    } else {
      console.log("❓ [COMPLETE PAYMENT] Unknown payment method:", selectedMethod);
    }
    
    console.log("🔄 [COMPLETE PAYMENT] About to start payment processing...");
    console.log("-".repeat(60));

    if (selectedMethod === "CASH") {
      try {
        // Show processing overlay
        setIsProcessing(true);
        setProcessingMessage("Processing cash payment...");

        // Store tendered amount for result modal
        const tenderedAmount = parseFloat(amount || total.toString());
        setFinalAmount(tenderedAmount);
        // Store the actual sale amount for the receipt
        setSaleAmount(total);

        // Complete the payment - this is the API call that can fail
        // Send the actual sale amount (total) to the backend, not the tendered amount
        console.warn(
          "⚠️ BEFORE PAYMENT API CALL - About to execute onPaymentComplete for CASH payment"
        );
        try {
          const result = await onPaymentComplete(total, "CASH");
          console.warn(
            "✅ PAYMENT API CALL SUCCESS - onPaymentComplete executed successfully"
          );

          // ONLY set success state AFTER the API call succeeds
          console.warn("Setting payment success to TRUE");
          setPaymentSuccess(true);

          // Print receipt ONLY after payment is successful
          setProcessingMessage("Printing receipt...");
          
          // Check if any printer is available before attempting to print
          const isPrinterAvailable = await PrinterUtils.isAnyPrinterAvailable();
          if (!isPrinterAvailable) {
            console.log("[PRINT] No printer available, skipping receipt printing");
          } else {
          const receiptItems = items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          }));

          let printSuccess = false;

          try {
            // Try direct printer first
            const SunmiDirectPrinterServiceClass = await loadSunmiDirectPrinterService();
            const directPrinterService =
              SunmiDirectPrinterServiceClass.getInstance();
            const isDirectAvailable =
              await directPrinterService.isPrinterAvailable();
            console.log(
              "[PRINT] Direct printer available for cash sale:",
              isDirectAvailable
            );

            if (isDirectAvailable) {
              try {
                // Generate receipt number for cash sale
                const paddedId = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                const receiptNumber = paddedId ? `NX-CASH-${paddedId}` : `NX-CASH-${Math.floor(1000 + Math.random() * 9000)}`;

                // Print receipt with direct printer - note tendered and change amounts separately
                console.log(
                  "Printing receipt with sale amount:",
                  total,
                  "tendered:",
                  tenderedAmount,
                  "change:",
                  change
                );
                await directPrinterService.printSaleReceipt({
                  paymentType: "CASH",
                  total: total,
                  items: receiptItems,
                  customerName: customer?.fullname || "Guest Customer",
                  receiptNumber,
                  tellerName: staffDisplayName,
                  storeName: staffStoreName,
                });

                console.log("Cash receipt printed successfully (direct mode)");
                printSuccess = true;
              } catch (directError) {
                console.error(
                  "[PRINT] Direct printer error for cash sale:",
                  directError
                );
                // Fall back to legacy printer if direct printing fails
              }
            }

            // If direct printing failed, try legacy printer
            if (!printSuccess) {
              try {
                const SunmiPrinterServiceClass = await loadSunmiPrinterService();
                const printerService = SunmiPrinterServiceClass.getInstance();

                // Generate receipt number for cash sale
                const paddedId = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                const receiptNumber = paddedId ? `NX-CASH-${paddedId}` : `NX-CASH-${Math.floor(1000 + Math.random() * 9000)}`;

                // Print receipt with legacy printer - note tendered and change amounts separately
                console.log(
                  "Printing receipt with sale amount:",
                  total,
                  "tendered:",
                  tenderedAmount,
                  "change:",
                  change
                );
                await printerService.printSaleReceipt({
                  paymentType: "CASH",
                  total: total,
                  items: receiptItems,
                  customerName: customer?.fullname || "Guest Customer",
                  receiptNumber,
                  tellerName: staffDisplayName,
                  storeName: staffStoreName,
                });

                console.log("Cash receipt printed successfully (legacy mode)");
              } catch (legacyError) {
                console.error(
                  "[PRINT] Legacy printer error for cash sale:",
                  legacyError
                );
                // If both printer methods fail, just log the error but continue with the sale
              }
            }
          } catch (error) {
            console.error("[PRINT] General printing error:", error);
            // Continue with result modal even if printing fails
          }
          }

          // Show result modal on success
          console.warn(
            `🚀 SHOWING RESULT MODAL - paymentSuccess: true, errorMessage: ${
              errorMessage || "none"
            }`
          );
          setIsProcessing(false);
          setShowResultModal(true);
        } catch (apiError) {
          console.warn(
            "❌ PAYMENT API CALL FAILED - Error in onPaymentComplete:",
            apiError
          );
          // Set error state
          console.warn("❌ PAYMENT FAILED - Setting payment success to FALSE");
          setPaymentSuccess(false);
          console.warn(
            "❌ PAYMENT FAILED - Setting error message:",
            apiError instanceof Error
              ? apiError.message
              : "Failed to complete cash payment"
          );
          setErrorMessage(
            apiError instanceof Error
              ? apiError.message
              : "Failed to complete cash payment"
          );
          console.warn(
            `❌ SHOWING ERROR RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage set`
          );
          setIsProcessing(false);
          setShowResultModal(true);
        }
      } catch (unexpectedError) {
        // Handle any completely unexpected errors
        console.error("Unexpected error in payment flow:", unexpectedError);
        setPaymentSuccess(false);
        setErrorMessage("An unexpected error occurred");
        setIsProcessing(false);
        setShowResultModal(true);
      }
    } else if (selectedMethod === "CARD") {
      handleCardPayment();
    }else if (selectedMethod === "ALTRON"){
      // handleAltronPayment();
    } else if (selectedMethod === "EXTERNAL_POS") {
      handleExternalPayment();
    } else {
      Alert.alert(
        "Not Implemented",
        "This payment method is not available yet."
      );
    }
  };

  // const handleEcentricPayment = async () => {
  //   if (Platform.OS !== "android") {
  //     Alert.alert(
  //       "Error",
  //       "Ecentric Payment is only supported on Android devices"
  //     );
  //     return;
  //   }

  //   try {
  //     // Show processing overlay
  //     setIsProcessing(true);
  //     setProcessingMessage("Initializing card payment...");

  //     // Round the amount for testing purposes
  //     const roundedAmount = Math.round(total);
  //     console.log(
  //       "💳 [Card Payment] Starting Ecentric payment process with rounded amount:",
  //       roundedAmount
  //     );

  //     // Generate a transaction ID using our custom function
  //     const rawTransactionUuid = generateUUID();
  //     // Ensure the UUID is properly formatted without extra spaces
  //     const transactionUuid = rawTransactionUuid.trim();
  //     console.log(
  //       "💳 [Card Payment] Generated transaction ID:",
  //       transactionUuid
  //     );

  //     // Format amount in cents (multiply by 100) - required format per docs
  //     const amountInCents = roundedAmount * 100;

  //     // Generate a unique reference number (max 12 characters)
  //     const referenceNo = `NX-${Math.floor(1000 + Math.random() * 9000)}`;

  //     // Sanitize the transaction description
  //     const transactionDescription = `Nexo sale ${referenceNo}`.replace(
  //       /[^\w\s\-]/gi,
  //       ""
  //     );

  //     console.log("Initiating card payment flow");

  //     // Use customer name if available, otherwise use "Guest Customer"
  //     // BUT since we know anonymous transactions work, fall back to Guest Customer
  //     // regardless of whether a real customer is provided
  //     const customerName = "Guest Customer";

  //     // Use a fixed known-good phone number regardless of customer data
  //     // since anonymous transactions are working
  //     const cellNumber = "27823456789";

  //     // Use a fixed known-good email address
  //     const emailAddress = "receipt@nexo.com";

  //     console.log(
  //       "Customer data: Using anonymous values for maximum compatibility"
  //     );

  //     // Log payment preparation details as in the working implementation
  //     console.log("Preparing payment request with details:", {
  //       amountInCents,
  //       customerName,
  //       originalAmount: total,
  //       referenceNumber: referenceNo,
  //       roundedAmount,
  //       transactionUuid,
  //     });

  //     // Always get a fresh authentication token before payment
  //     console.log("Authenticating with Ecentric terminal before payment");
  //     setProcessingMessage("Connecting to payment terminal...");

  //     // For now, we'll proceed directly to the sale transaction since the authentication flow
  //     // might be handled differently or might not be required for the current implementation
  //     // TODO: Implement proper authentication flow when the native module supports it
  //     console.log("Proceeding directly to sale transaction (authentication handled by native module)");
  //     
  //     let authToken = "AUTH-" + transactionUuid.substring(0, 8); // Generate a temporary auth token
  //     let authToken = null;

  //     if (authResponse) {
  //       console.log("Authentication successful, proceeding with payment");
  //       authToken = authResponse;
  //     } else {
  //       console.log("Authentication failed, cannot proceed with payment");
  //       throw new Error("Authentication failed. Cannot proceed with payment.");
  //     }

  //     console.log("Using auth token:", authToken);
  //     console.log("Transaction UUID:", transactionUuid);

  //     // Set up payment parameters to match exactly what the working implementation expects
  //     const paymentParams = {
  //       // App configuration
  //       appURL: "ecentric.thumbzup.com",
  //       appClass: "payment.thumbzup.com.IntentActivity",
  //       merchantID: "910000000008000",
  //       applicationKey: "NEXO_APP",

  //       // Transaction identifiers
  //       authToken,
  //       transactionUuid,
  //       transactionReferenceNo: referenceNo,

  //       // Transaction details
  //       transactionAmount: amountInCents,
  //       description: transactionDescription,

  //       // Customer information
  //       customerName,
  //       cellNumber,
  //       emailAddress,

  //       // Receipt settings
  //       isReceiptRequired: false,
  //       alwaysShowTransactionStatusScreen: false,

  //       // Required Mastercard merchantInfo formatting exactly as per SDK example
  //       merchantInfoJson: JSON.stringify({
  //         Phone_No: "",
  //         Street: "",
  //         URL: "",
  //         Support_Phone_No: "",
  //         City: "",
  //         Province: "",
  //         Country_Code: "ZA",
  //         Currency_Code: "ZAR",
  //         Postal_Code: "",
  //       }),
  //     };

  //     console.log("Launching sale transaction with params:", paymentParams);
  //     setProcessingMessage("Processing card payment...");

  //     // Use the correct method to launch the sale transaction with dynamic config
  //     const response = await EcentricPaymentModule.launchSaleTransaction(
  //       paymentParams.appURL,
  //       paymentParams.appClass,
  //       paymentParams.merchantID,
  //       paymentParams.authToken,
  //       paymentParams.transactionAmount,
  //       paymentParams.transactionUuid,
  //       paymentParams.description,
  //       paymentParams.customerName,
  //       paymentParams.transactionReferenceNo,
  //       paymentParams.cellNumber,
  //       paymentParams.emailAddress,
  //       paymentParams.isReceiptRequired,
  //       paymentParams.alwaysShowTransactionStatusScreen,
  //       paymentParams.merchantInfoJson,
  //       undefined, // externalSTAN
  //       undefined, // externalRRN
  //       undefined, // externalTransactionGUID
  //       undefined, // externalInvoiceGUID
  //       undefined, // externalTransactionDateTime
  //       undefined, // externalTerminalId
  //       undefined, // latitude
  //       undefined, // longitude
  //       undefined, // accuracy
  //       paymentParams.applicationKey
  //     );

  //     console.log("Sale transaction result:", response);

  //     // Check for receipt data
  //     if (!response.receiptBundle) {
  //       console.log("No receipt bundle found in result");
  //     }

  //     // Check if payment was successful - in the working logs, resultCode "01" means success
  //     // and there's an isApproved property set to "true"
  //     const isApproved =
  //       response.isApproved === "true" || response.isApproved === true;

  //     if (isApproved && response.resultCode === "01") {
  //       console.log("Transaction successful");

  //       // Format the response as in the working implementation
  //       const formattedResponse = {
  //         success: true,
  //         isApproved: true,
  //         resultCode: response.resultCode,
  //         resultDescription: response.resultDescription,
  //         launchType: response.launchType,
  //         merchantName: response.merchantName,
  //         customerName: response.customerName,
  //         authenticationKey: response.authenticationKey || authToken,
  //         transactionDescription:
  //           response.transactionDescription || `Nexo sale #${referenceNo}`,
  //         transactionUuid: response.transactionUuid || transactionUuid,
  //         cellNumberToSMSReceipt: response.cellNumberToSMSReceipt || cellNumber,
  //         emailAddressToSendReceipt:
  //           response.emailAddressToSendReceipt || emailAddress,
  //         isReceiptRequired: response.isReceiptRequired || true,
  //         isReceiptDataAvailable: response.isReceiptDataAvailable || false,
  //       };

  //       console.log("Sale response received:", formattedResponse);

  //       // Generate a unique auth code if none is provided by response
  //       const authCode =
  //         response.authCode || `AUTH-${transactionUuid.substring(0, 6)}`;

  //       // Prepare Ecentric payment details for backend storage
  //       const ecentricDetails: any = {
  //         ecentric_transaction_uuid: transactionUuid,
  //         ecentric_auth_code: authCode,
  //         ecentric_result_code: response.resultCode || "01",
  //         ecentric_result_desc: response.resultDescription || "APPROVED",
  //         ecentric_is_approved: isApproved,
  //         ecentric_rrn: response.rrn || transactionUuid.substring(0, 12),
  //         ecentric_card_type: response.cardType || "CARD",
  //         ecentric_masked_pan: response.maskedPan || "************1234",
  //         ecentric_terminal_id:
  //           response.terminalId || response.pebbleSerialNumber || "74100199",
  //         ecentric_application_id: response.aid || "A0000000031010",
  //       };

  //       // Add receipt details if available
  //       if (response.isReceiptDataAvailable && response.receiptBundle) {
  //         console.log("Receipt data available, adding to payment details");
  //         ecentricDetails.ecentric_receipt_details = response.receiptBundle;
  //         ecentricDetails.ecentric_receipt_number =
  //           response.receiptBundle.receiptNumber ||
  //           response.referenceNumber ||
  //           "";
  //       } else if (response.isReceiptDataAvailable) {
  //         console.log(
  //           "isReceiptDataAvailable is true but no receiptBundle found"
  //         );
  //         ecentricDetails.ecentric_receipt_details = {
  //           info: "Receipt data flagged as available but no bundle received",
  //         };
  //       } else {
  //         console.log("No receipt data available");
  //       }

  //       console.log(
  //         "Adding Ecentric payment details to sale request - summary:",
  //         {
  //           hasCardDetails: !!ecentricDetails.ecentric_masked_pan,
  //           hasAuthCode: !!ecentricDetails.ecentric_auth_code,
  //           hasRRN: !!ecentricDetails.ecentric_rrn,
  //           hasTerminalId: !!ecentricDetails.ecentric_terminal_id,
  //           cardType: ecentricDetails.ecentric_card_type || "Unknown",
  //         }
  //       );

  //       // Store details for result modal
  //       setPaymentDetails(ecentricDetails);
  //       setFinalAmount(roundedAmount);

  //       console.log("Got validation response:", ecentricDetails);

  //       // Complete payment with try/catch
  //       try {
  //         // Try to complete payment with ECENTRIC details - this is the API call that can fail
  //         console.warn(
  //           "⚠️ BEFORE PAYMENT API CALL - About to execute onPaymentComplete for ECENTRIC payment"
  //         );
  //         setProcessingMessage("Finalizing payment...");
  //         try {
  //           const result = await onPaymentComplete(
  //             roundedAmount,
  //             "ECENTRIC",
  //             ecentricDetails
  //           );
  //           console.warn(
  //             "✅ PAYMENT API CALL SUCCESS - onPaymentComplete executed successfully"
  //           );

  //           // ONLY set success state AFTER the API call succeeds
  //           console.warn("Setting payment success to TRUE");
  //           setPaymentSuccess(true);

  //           // Try to print receipt for card payment ONLY after payment is successful
  //           setProcessingMessage("Printing receipt...");
  //           try {
  //             // Prepare receipt items
  //             const receiptItems = items.map((item) => ({
  //               name: item.name,
  //               quantity: item.quantity,
  //               price: item.price,
  //             }));

  //             // First try direct printer
  //             const SunmiDirectPrinterServiceClass = await loadSunmiDirectPrinterService();
  //             const directPrinterService =
  //               SunmiDirectPrinterServiceClass.getInstance();
  //             const isDirectAvailable =
  //               await directPrinterService.isPrinterAvailable();
  //             console.log(
  //               "[PRINT] Direct printer available for card payment:",
  //               isDirectAvailable
  //             );

  //             let printSuccess = false;

  //             if (isDirectAvailable) {
  //               try {
  //                 // Print receipt with direct printer
  //                 await directPrinterService.printSaleReceipt({
  //                   paymentType: "CARD",
  //                   total: roundedAmount,
  //                   items: receiptItems,
  //                   customerName:
  //                     customer?.fullname || customerName || "Guest Customer",
  //                   cardDetails: ecentricDetails,
  //                   receiptNumber:
  //                     ecentricDetails.ecentric_receipt_number || referenceNo,
  //                 });

  //                 console.log(
  //                   "Card payment receipt printed successfully (direct mode)"
  //                 );
  //                 printSuccess = true;
  //               } catch (directError) {
  //                 console.error(
  //                   "[PRINT] Direct printer error for card payment:",
  //                   directError
  //                 );
  //                 // Fall back to legacy printer if direct printing fails
  //               }
  //             }

  //             // If direct printing failed, try legacy printer
  //             if (!printSuccess) {
  //               try {
  //                 const SunmiPrinterServiceClass = await loadSunmiPrinterService();
  //                 const printerService = SunmiPrinterServiceClass.getInstance();

  //                 // Print receipt with legacy printer
  //                 await printerService.printSaleReceipt({
  //                   paymentType: "CARD",
  //                   total: roundedAmount,
  //                   items: receiptItems,
  //                   customerName:
  //                     customer?.fullname || customerName || "Guest Customer",
  //                   cardDetails: ecentricDetails,
  //                   receiptNumber:
  //                     ecentricDetails.ecentric_receipt_number || referenceNo,
  //                 });

  //                 console.log(
  //                   "Card payment receipt printed successfully (legacy mode)"
  //                 );
  //               } catch (legacyError) {
  //                 console.error(
  //                   "[PRINT] Legacy printer error for card payment:",
  //                   legacyError
  //                 );
  //               }
  //             }
  //           } catch (printError) {
  //             console.error(
  //               "[PRINT] General printing error for card payment:",
  //               printError
  //             );
  //             // Continue even if printing fails
  //           }

  //           // Show result modal on success
  //           console.warn(
  //             `🚀 SHOWING RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage: ${
  //               errorMessage || "none"
  //             }`
  //           );
  //           setIsProcessing(false);
  //           setShowResultModal(true);
  //         } catch (apiError) {
  //           console.warn(
  //             "❌ PAYMENT API CALL FAILED - Error in onPaymentComplete:",
  //             apiError
  //           );
  //           // Set error state
  //           console.warn(
  //             "❌ ECENTRIC PAYMENT FAILED - Setting payment success to FALSE"
  //           );
  //           setPaymentSuccess(false);
  //           console.warn(
  //             "❌ ECENTRIC PAYMENT FAILED - Setting error message:",
  //             apiError instanceof Error
  //               ? apiError.message
  //               : "Failed to complete card payment"
  //           );
  //           setErrorMessage(
  //             apiError instanceof Error
  //               ? apiError.message
  //               : "Failed to complete card payment"
  //           );
  //           console.warn(
  //             `❌ SHOWING ERROR RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage set`
  //           );
  //           setIsProcessing(false);
  //           setShowResultModal(true);
  //         }
  //       } catch (unexpectedError) {
  //         // Handle any completely unexpected errors
  //         console.error(
  //           "Unexpected error in card payment flow:",
  //           unexpectedError
  //         );
  //         setPaymentSuccess(false);
  //         setErrorMessage("An unexpected error occurred with card payment");
  //         setIsProcessing(false);
  //         setShowResultModal(true);
  //       }
  //     } else {
  //       // Format the error message based on what's available in the response
  //       let errorMessage = "";

  //       switch (response.resultCode) {
  //         case "02":
  //           errorMessage = "Transaction declined by bank";
  //           break;
  //         case "03":
  //           errorMessage = "Transaction aborted by user or timeout";
  //           break;
  //         case "04":
  //           errorMessage =
  //             "Payment device error - Terminal may need to be restarted. Please check the device and try again later.";
  //           break;
  //         default:
  //           errorMessage =
  //             response.resultDescription || "Unknown payment error";
  //       }

  //       console.error(
  //         `💳 [Card Payment] Payment failed with code ${response.resultCode}: ${errorMessage}`
  //       );

  //       // Show result modal with error
  //       setPaymentSuccess(false);
  //       setErrorMessage(errorMessage);
  //       setFinalAmount(roundedAmount);
  //       setIsProcessing(false);
  //       setShowResultModal(true);
  //     }
  //   } catch (error) {
  //     console.error("💳 [Card Payment] Error processing payment:", error);
  //     // Show result modal with error
  //     setPaymentSuccess(false);
  //     setErrorMessage(
  //       error instanceof Error
  //         ? error.message
  //         : "Failed to process card payment"
  //     );
  //     setFinalAmount(total);
  //     setIsProcessing(false);
  //     setShowResultModal(true);
  //   }
  // };

  const handleCardPayment = async () => {
    // Determine which payment method to use based on configuration
    try {
      const methods = await getAvailablePaymentMethods();
      console.log('🔍 Available payment methods for card routing:', methods);
      
      if (methods.includes('cendroid')) {
        console.log('💳 Routing to CenDroid payment');
        await handleCendroidPayment({
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
        });
      } else if (methods.includes('ecentric')) {
        console.log('💳 Routing to Ecentric payment');
        await handleEcentricPayment();
      } else {
        console.error("❌ No card payment methods available");
        Alert.alert("Error", "No card payment methods are configured");
      }
    } catch (error) {
      console.error("❌ Error determining payment method:", error);
      Alert.alert("Error", "Failed to determine payment method");
    }
  };

  const handleEcentricPayment = async () => {
    // 🔍 [CARD PAYMENT] Function for handling Ecentric card payments with dynamic config
    if (Platform.OS !== "android") {
      Alert.alert(
        "Error",
        "Ecentric Payment is only supported on Android devices"
      );
      return;
    }

    try {
      // Show processing overlay
      setIsProcessing(true);
      setProcessingMessage("Initializing card payment...");

      // Round the amount for testing purposes
      const roundedAmount = Math.round(total);
      console.log(
        "💳 [Card Payment] Starting Ecentric payment process with rounded amount:",
        roundedAmount
      );

      // Generate a transaction ID using our custom function
      const rawTransactionUuid = generateUUID();
      // Ensure the UUID is properly formatted without extra spaces
      const transactionUuid = rawTransactionUuid.trim();
      console.log(
        "💳 [Card Payment] Generated transaction ID:",
        transactionUuid
      );

      // Format amount in cents (multiply by 100) - required format per docs
      const amountInCents = roundedAmount * 100;

      // Generate a unique reference number (max 12 characters)
      const referenceNo = `NX-${Math.floor(1000 + Math.random() * 9000)}`;

      // Sanitize the transaction description
      const transactionDescription = `Nexo sale ${referenceNo}`.replace(
        /[^\w\s\-]/gi,
        ""
      );

      console.log("Initiating card payment flow");

      // 🔍 [CARD PAYMENT] Check if payment services are available
      console.log("🔍 [CARD PAYMENT] Checking available payment services...");
      const availableServices = PaymentServiceManager.getInitializedServices();
      console.log("🔍 [CARD PAYMENT] Available payment services:", availableServices);
      
      if (availableServices.length === 0) {
        throw new Error("No payment services are available. Please ensure payment configuration is loaded after login.");
      }

      // Use customer name if available, otherwise use "Guest Customer"
      // BUT since we know anonymous transactions work, fall back to Guest Customer
      // regardless of whether a real customer is provided
      const customerName = "Guest Customer";

      // Use a fixed known-good phone number regardless of customer data
      // since anonymous transactions are working
      const cellNumber = "27823456789";

      // Use a fixed known-good email address
      const emailAddress = "receipt@nexo.com";

      console.log(
        "Customer data: Using anonymous values for maximum compatibility"
      );

      // Log payment preparation details as in the working implementation
      console.log("Preparing payment request with details:", {
        amountInCents,
        customerName,
        originalAmount: total,
        referenceNumber: referenceNo,
        roundedAmount,
        transactionUuid,
      });

      // Payment authentication is now handled by PaymentServiceManager
      // It will clear old auth and get fresh authentication before each payment (matching legacy)
      console.log("🔍 [CARD PAYMENT] Processing payment using PaymentServiceManager...");
      setProcessingMessage("Connecting to payment terminal...");

      console.log("🔍 [CARD PAYMENT] PaymentServiceManager will authenticate before processing payment");

      // Process payment using PaymentServiceManager
      // This will authenticate with the terminal before processing
      const response = await PaymentServiceManager.processPayment(
        amountInCents,
        referenceNo,
        {
          transactionId: transactionUuid,
          description: transactionDescription,
          customerName,
          cellNumber,
          emailAddress,
        }
      );

      console.log("Sale transaction result:", response);

      // Check for receipt data
      if (!response.receiptBundle) {
        console.log("No receipt bundle found in result");
      }

      // Check if payment was successful - in the working logs, resultCode "01" means success
      // and there's an isApproved property set to "true"
      const isApproved =
        response.isApproved === "true" || response.isApproved === true;

      if (isApproved && response.resultCode === "01") {
        console.log("Transaction successful");

        // Format the response as in the working implementation
        const formattedResponse = {
          success: true,
          isApproved: true,
          resultCode: response.resultCode,
          resultDescription: response.resultDescription,
          launchType: response.launchType,
          merchantName: response.merchantName,
          customerName: response.customerName,
          authenticationKey: response.authenticationKey || "N/A",
          transactionDescription:
            response.transactionDescription || `Nexo sale #${referenceNo}`,
          transactionUuid: response.transactionUuid || transactionUuid,
          cellNumberToSMSReceipt: response.cellNumberToSMSReceipt || cellNumber,
          emailAddressToSendReceipt:
            response.emailAddressToSendReceipt || emailAddress,
          isReceiptRequired: response.isReceiptRequired || true,
          isReceiptDataAvailable: response.isReceiptDataAvailable || false,
        };

        console.log("Sale response received:", formattedResponse);

        // Generate a unique auth code if none is provided by response
        const authCode =
          response.authCode || `AUTH-${transactionUuid.substring(0, 6)}`;

        // Prepare Ecentric payment details for backend storage
        const ecentricDetails: any = {
          ecentric_transaction_uuid: transactionUuid,
          ecentric_auth_code: authCode,
          ecentric_result_code: response.resultCode || "01",
          ecentric_result_desc: response.resultDescription || "APPROVED",
          ecentric_is_approved: isApproved,
          ecentric_rrn: response.rrn || transactionUuid.substring(0, 12),
          ecentric_card_type: response.cardType || "CARD",
          ecentric_masked_pan: response.maskedPan || "************1234",
          ecentric_terminal_id:
            response.terminalId || response.pebbleSerialNumber || "74100199",
          ecentric_application_id: response.aid || "A0000000031010",
        };

        // Add receipt details if available
        if (response.isReceiptDataAvailable && response.receiptBundle) {
          console.log("Receipt data available, adding to payment details");
          ecentricDetails.ecentric_receipt_details = response.receiptBundle;
          ecentricDetails.ecentric_receipt_number =
            response.receiptBundle.receiptNumber ||
            response.referenceNumber ||
            "";
        } else if (response.isReceiptDataAvailable) {
          console.log(
            "isReceiptDataAvailable is true but no receiptBundle found"
          );
          ecentricDetails.ecentric_receipt_details = {
            info: "Receipt data flagged as available but no bundle received",
          };
        } else {
          console.log("No receipt data available");
        }

        console.log(
          "Adding Ecentric payment details to sale request - summary:",
          {
            hasCardDetails: !!ecentricDetails.ecentric_masked_pan,
            hasAuthCode: !!ecentricDetails.ecentric_auth_code,
            hasRRN: !!ecentricDetails.ecentric_rrn,
            hasTerminalId: !!ecentricDetails.ecentric_terminal_id,
            cardType: ecentricDetails.ecentric_card_type || "Unknown",
          }
        );

        // Store details for result modal
        setPaymentDetails(ecentricDetails);
        setFinalAmount(roundedAmount);

        console.log("Got validation response:", ecentricDetails);

        // Complete payment with try/catch
        try {
          // Try to complete payment with ECENTRIC details - this is the API call that can fail
          console.warn(
            "⚠️ BEFORE PAYMENT API CALL - About to execute onPaymentComplete for ECENTRIC payment"
          );
          setProcessingMessage("Finalizing payment...");
          try {
            const result = await onPaymentComplete(
              roundedAmount,
              "ECENTRIC",
              ecentricDetails
            );
            console.warn(
              "✅ PAYMENT API CALL SUCCESS - onPaymentComplete executed successfully"
            );

            // ONLY set success state AFTER the API call succeeds
            console.warn("Setting payment success to TRUE");
            setPaymentSuccess(true);

            // Try to print receipt for card payment ONLY after payment is successful
            setProcessingMessage("Printing receipt...");
            
            // Check if any printer is available before attempting to print
            const isPrinterAvailable = await PrinterUtils.isAnyPrinterAvailable();
            if (!isPrinterAvailable) {
              console.log("[PRINT] No printer available, skipping receipt printing");
            } else {
            try {
              // Prepare receipt items
              const receiptItems = items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              }));

              // First try direct printer
              const SunmiDirectPrinterServiceClass = await loadSunmiDirectPrinterService();
              const directPrinterService =
                SunmiDirectPrinterServiceClass.getInstance();
              const isDirectAvailable =
                await directPrinterService.isPrinterAvailable();
              console.log(
                "[PRINT] Direct printer available for card payment:",
                isDirectAvailable
              );

              let printSuccess = false;

              if (isDirectAvailable) {
                try {
                  // Print receipt with direct printer
                  const paddedId = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                  await directPrinterService.printSaleReceipt({
                    paymentType: "CARD",
                    total: roundedAmount,
                    items: receiptItems,
                    customerName:
                      customer?.fullname || customerName || "Guest Customer",
                    cardDetails: ecentricDetails,
                    receiptNumber:
                      paddedId ? `NX-CARD-${paddedId}` : (ecentricDetails.ecentric_receipt_number || referenceNo),
                    tellerName: staffDisplayName,
                    storeName: staffStoreName,
                  });

                  console.log(
                    "Card payment receipt printed successfully (direct mode)"
                  );
                  printSuccess = true;
                } catch (directError) {
                  console.error(
                    "[PRINT] Direct printer error for card payment:",
                    directError
                  );
                  // Fall back to legacy printer if direct printing fails
                }
              }

              // If direct printing failed, try legacy printer
              if (!printSuccess) {
                try {
                  const SunmiPrinterServiceClass = await loadSunmiPrinterService();
                const printerService = SunmiPrinterServiceClass.getInstance();

                  // Print receipt with legacy printer
                  const paddedId2 = (result as any) ? String(result as any).padStart(4, "0") : undefined;
                  await printerService.printSaleReceipt({
                    paymentType: "CARD",
                    total: roundedAmount,
                    items: receiptItems,
                    customerName:
                      customer?.fullname || customerName || "Guest Customer",
                    cardDetails: ecentricDetails,
                    receiptNumber:
                      paddedId2 ? `NX-CARD-${paddedId2}` : (ecentricDetails.ecentric_receipt_number || referenceNo),
                    tellerName: staffDisplayName,
                    storeName: staffStoreName,
                  });

                  console.log(
                    "Card payment receipt printed successfully (legacy mode)"
                  );
                } catch (legacyError) {
                  console.error(
                    "[PRINT] Legacy printer error for card payment:",
                    legacyError
                  );
                }
              }
            } catch (printError) {
              console.error(
                "[PRINT] General printing error for card payment:",
                printError
              );
              // Continue even if printing fails
            }
            }

            // Show result modal on success
            console.warn(
              `🚀 SHOWING RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage: ${
                errorMessage || "none"
              }`
            );
            setIsProcessing(false);
            setShowResultModal(true);
          } catch (apiError) {
            console.warn(
              "❌ PAYMENT API CALL FAILED - Error in onPaymentComplete:",
              apiError
            );
            // Set error state
            console.warn(
              "❌ ECENTRIC PAYMENT FAILED - Setting payment success to FALSE"
            );
            setPaymentSuccess(false);
            console.warn(
              "❌ ECENTRIC PAYMENT FAILED - Setting error message:",
              apiError instanceof Error
                ? apiError.message
                : "Failed to complete card payment"
            );
            setErrorMessage(
              apiError instanceof Error
                ? apiError.message
                : "Failed to complete card payment"
            );

            console.warn(
              `❌ SHOWING ERROR RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage set`
            );
            setIsProcessing(false);
            setShowResultModal(true);
          }
        } catch (unexpectedError) {
          // Handle any completely unexpected errors
          console.error(
            "Unexpected error in card payment flow:",
            unexpectedError
          );
          setPaymentSuccess(false);
          setErrorMessage("An unexpected error occurred with card payment");
          setIsProcessing(false);
          setShowResultModal(true);
        }
      } else {
        // Format the error message based on what's available in the response
        let errorMessage = "";

        switch (response.resultCode) {
          case "02":
            errorMessage = "Transaction declined by bank";
            break;
          case "03":
            errorMessage = "Transaction aborted by user or timeout";
            break;
          case "04":
            errorMessage =
              "Payment device error - Terminal may need to be restarted. Please check the device and try again later.";
            break;
          default:
            errorMessage =
              response.resultDescription || "Unknown payment error";
        }

        console.error(
          `💳 [Card Payment] Payment failed with code ${response.resultCode}: ${errorMessage}`
        );

        // Show result modal with error
        setPaymentSuccess(false);
        setErrorMessage(errorMessage);
        setFinalAmount(roundedAmount);
        setIsProcessing(false);
        setShowResultModal(true);
      }
    } catch (error) {
      console.error("💳 [Card Payment] Error processing payment:", error);
      // Show result modal with error
      setPaymentSuccess(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to process card payment"
      );
      setFinalAmount(total);
      setIsProcessing(false);
      setShowResultModal(true);
    }
  };

  const handleExternalPayment = async () => {
    try {
      if (!receiptNumber.trim()) {
        Alert.alert("Error", "Please enter the receipt number");
        return;
      }

      // Show processing overlay
      setIsProcessing(true);
      setProcessingMessage("Processing external payment...");

      // Prepare external payment details
      const externalPaymentDetails = {
        payment_type: "EXTERNAL_POS",
        external_pos_receipt_number: receiptNumber.trim(),
        total: total,
        productsText: JSON.stringify(
          items.map((item) => ({
            product_id: item.id || 1,
            quantity: item.quantity,
          }))
        ),
        discount: 0,
      };

      // Store details for result modal
      setPaymentDetails(externalPaymentDetails);
      setFinalAmount(total);

      // Complete payment with try/catch
      try {
        console.warn(
          "⚠️ BEFORE PAYMENT API CALL - About to execute onPaymentComplete for EXTERNAL_POS payment"
        );
        setProcessingMessage("Finalizing payment...");
        try {
          const result = await onPaymentComplete(
            total,
            "EXTERNAL_POS",
            externalPaymentDetails
          );
          console.warn(
            "✅ PAYMENT API CALL SUCCESS - onPaymentComplete executed successfully"
          );

          // ONLY set success state AFTER the API call succeeds
          console.warn("Setting payment success to TRUE");
          setPaymentSuccess(true);

          // Try to print receipt for external payment ONLY after payment is successful
          setProcessingMessage("Printing receipt...");
          
          // Check if any printer is available before attempting to print
          const isPrinterAvailable = await PrinterUtils.isAnyPrinterAvailable();
          if (!isPrinterAvailable) {
            console.log("[PRINT] No printer available, skipping receipt printing");
          } else {
          try {
            // Prepare receipt items
            const receiptItems = items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            }));

            // First try direct printer
            const SunmiDirectPrinterServiceClass = await loadSunmiDirectPrinterService();
            const directPrinterService =
              SunmiDirectPrinterServiceClass.getInstance();
            const isDirectAvailable =
              await directPrinterService.isPrinterAvailable();
            console.log(
              "[PRINT] Direct printer available for external payment:",
              isDirectAvailable
            );

            let printSuccess = false;

            if (isDirectAvailable) {
              try {
                // Print receipt with direct printer
                await directPrinterService.printSaleReceipt({
                  paymentType: "EXTERNAL_POS",
                  total: total,
                  items: receiptItems,
                  customerName: customer?.fullname || "Guest Customer",
                  receiptNumber: receiptNumber.trim(),
                  tellerName: staffDisplayName,
                  storeName: staffStoreName,
                });

                console.log(
                  "External payment receipt printed successfully (direct mode)"
                );
                printSuccess = true;
              } catch (directError) {
                console.error(
                  "[PRINT] Direct printer error for external payment:",
                  directError
                );
                // Fall back to legacy printer if direct printing fails
              }
            }

            // If direct printing failed, try legacy printer
            if (!printSuccess) {
              try {
                const SunmiPrinterServiceClass = await loadSunmiPrinterService();
                const printerService = SunmiPrinterServiceClass.getInstance();

                // Print receipt with legacy printer
                await printerService.printSaleReceipt({
                  paymentType: "EXTERNAL_POS",
                  total: total,
                  items: receiptItems,
                  customerName: customer?.fullname || "Guest Customer",
                  receiptNumber: receiptNumber.trim(),
                  tellerName: staffDisplayName,
                  storeName: staffStoreName,
                });

                console.log(
                  "External payment receipt printed successfully (legacy mode)"
                );
              } catch (legacyError) {
                console.error(
                  "[PRINT] Legacy printer error for external payment:",
                  legacyError
                );
              }
            }
          } catch (printError) {
            console.error(
              "[PRINT] General printing error for external payment:",
              printError
            );
            // Continue even if printing fails
          }
          }

          // Show result modal on success
          console.warn(
            `🚀 SHOWING RESULT MODAL - paymentSuccess: true, errorMessage: ${
              errorMessage || "none"
            }`
          );
          setIsProcessing(false);
          setShowResultModal(true);
        } catch (apiError) {
          console.warn(
            "❌ PAYMENT API CALL FAILED - Error in onPaymentComplete:",
            apiError
          );
          // Set error state
          console.warn(
            "❌ EXTERNAL PAYMENT FAILED - Setting payment success to FALSE"
          );
          setPaymentSuccess(false);
          console.warn(
            "❌ EXTERNAL PAYMENT FAILED - Setting error message:",
            apiError instanceof Error
              ? apiError.message
              : "Failed to complete external payment"
          );
          setErrorMessage(
            apiError instanceof Error
              ? apiError.message
              : "Failed to complete external payment"
          );
          console.warn(
            `❌ SHOWING ERROR RESULT MODAL - paymentSuccess: ${paymentSuccess}, errorMessage set`
          );
          setIsProcessing(false);
          setShowResultModal(true);
        }
      } catch (unexpectedError) {
        // Handle any completely unexpected errors
        console.error(
          "Unexpected error in external payment flow:",
          unexpectedError
        );
        setPaymentSuccess(false);
        setErrorMessage("An unexpected error occurred with external payment");
        setIsProcessing(false);
        setShowResultModal(true);
      }
    } catch (error) {
      console.error("Error processing external payment:", error);
      // Show result modal with error
      setPaymentSuccess(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to process external payment"
      );
      setFinalAmount(total);
      setIsProcessing(false);
      setShowResultModal(true);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[tw`flex-1 bg-gray-100`]}>
          {/* Header */}
          <View
            style={tw`bg-white px-6 py-4 flex-row justify-between items-center border-b border-gray-200`}
          >
            <GeistText style={[tw`text-gray-900`, typography.h1]}>
              Payment
            </GeistText>
            <TouchableOpacity onPress={onClose} style={tw`p-2`}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={tw`flex-1 flex-row`}>
            {/* Left Side - Order Details */}
            <View style={tw`w-1/2 p-6 border-r border-gray-200 bg-white`}>
              <View style={tw`flex-1`}>
                {/* Order Items */}
                <View style={tw`flex-1`}>
                  <GeistText style={[tw`text-gray-900 mb-4`, typography.h2]}>
                    Order Details
                  </GeistText>
                  {items.map((item, index) => (
                    <View
                      key={index}
                      style={tw`flex-row justify-between py-2 border-b border-gray-100`}
                    >
                      <View style={tw`flex-1`}>
                        <GeistText style={[tw`text-gray-900`, typography.body]}>
                          {item.name}
                        </GeistText>
                        <GeistText
                          style={[tw`text-gray-500`, typography.caption]}
                        >
                          x{item.quantity}
                        </GeistText>
                      </View>
                      <GeistText style={[tw`text-gray-900`, typography.body]}>
                        <CurrencyFormat value={item.price * item.quantity} />
                      </GeistText>
                    </View>
                  ))}
                </View>

                {/* Order Summary */}
                <View style={tw`mt-auto pt-4 border-t border-gray-200`}>
                  <View style={tw`flex-row justify-between py-2`}>
                    <GeistText style={[tw`text-gray-600`, typography.body]}>
                      Subtotal
                    </GeistText>
                    <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                      <CurrencyFormat value={total} />
                    </GeistText>
                  </View>
                  <View style={tw`flex-row justify-between py-2`}>
                    <GeistText style={[tw`text-gray-600`, typography.body]}>
                      Tax (15%)
                    </GeistText>
                    <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                      <CurrencyFormat value={total - total / 1.15} />
                    </GeistText>
                  </View>
                  <View style={tw`flex-row justify-between py-2`}>
                    <GeistText style={[tw`text-gray-900`, typography.h2]}>
                      Total
                    </GeistText>
                    <GeistText style={[tw`text-gray-900`, typography.h2]}>
                      <CurrencyFormat value={total} />
                    </GeistText>
                  </View>
                </View>

                {/* Payment Methods */}
                <View style={tw`mt-4`}>
                  <GeistText style={[tw`text-gray-900 mb-4`, typography.h2]}>
                    Payment Method
                  </GeistText>

                  {/* Show warning for zero-price items */}
                  {hasZeroPriceItems && (
                    <View
                      style={tw`mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl`}
                    >
                      <View style={tw`flex-row items-center`}>
                        <MaterialCommunityIcons
                          name="alert-circle-outline"
                          size={20}
                          color="#f97316"
                        />
                        <GeistText
                          style={tw`text-orange-700 ml-2 text-sm font-medium`}
                        >
                          Cash payment only - total amount is R 0.00
                        </GeistText>
                      </View>
                    </View>
                  )}

                  <View style={tw`flex-row -mx-1`}>
                    {availablePaymentMethods.filter(
                      (method) => !hasZeroPriceItems || method.id === "CASH"
                    ).map((method) => (
                      <TouchableOpacity
                        key={method.id}
                        style={tw`flex-1 mx-1 p-4 rounded-xl ${
                          selectedMethod === method.id
                            ? "bg-blue-50 border-2 border-blue-600"
                            : "bg-gray-50"
                        }`}
                        onPress={() => {
                          // 🚀 COMPREHENSIVE LOGGING: Payment Method Selection
                          console.log("=".repeat(60));
                          console.log("🚀 [PAYMENT METHOD SELECTION] ====== INITIATED =====");
                          console.log("=".repeat(60));
                          
                          console.log("👆 [METHOD SELECTION] User tapped payment method");
                          console.log("💳 [METHOD SELECTION] Selected method ID:", method.id);
                          console.log("📝 [METHOD SELECTION] Selected method name:", method.name);
                          console.log("🎨 [METHOD SELECTION] Method color:", method.color);
                          console.log("⏰ [METHOD SELECTION] Selection timestamp:", new Date().toISOString());
                          
                          // Log current state before selection
                          console.log("🔍 [METHOD SELECTION] Current state before selection:", {
                            currentSelectedMethod: selectedMethod,
                            currentAmount: amount,
                            total: total
                          });
                          
                          // Reset error state when switching payment methods
                          console.log("🔄 [METHOD SELECTION] Resetting error state for new payment method");
                          setErrorMessage("");
                          setPaymentSuccess(false);
                          setShowResultModal(false);
                          
                          // Log the action being taken
                          if (method.id !== "CASH") {
                            console.log("💰 [METHOD SELECTION] Non-cash method selected - setting amount to total");
                            setAmount(total.toString());
                          } else {
                            console.log("💵 [METHOD SELECTION] Cash method selected - clearing amount");
                            setAmount("");
                          }
                          
                          // Set the selected method
                          console.log("✅ [METHOD SELECTION] Setting selectedMethod to:", method.id);
                          setSelectedMethod(method.id);
                          
                          console.log("🔄 [METHOD SELECTION] Payment method selection completed");
                          console.log("-".repeat(60));
                        }}
                      >
                        <View style={tw`items-center`}>
                          <View
                            style={[
                              tw`w-12 h-12 rounded-full items-center justify-center mb-2`,
                              { backgroundColor: `${method.color}20` },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={method.icon as IconName}
                              size={28}
                              color={method.color}
                            />
                          </View>
                          <GeistText
                            style={[
                              tw`${
                                selectedMethod === method.id
                                  ? "text-blue-600"
                                  : "text-gray-900"
                              }`,
                              typography.bodyMedium,
                            ]}
                          >
                            {method.name}
                          </GeistText>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Right Side - Payment Interface */}
            <View style={tw`w-1/2 p-4 bg-white`}>
              {/* Amount Display */}
              <View style={tw`bg-gray-50 rounded-xl p-4 mb-2`}>
                <View style={tw`flex-row justify-between items-center mb-4`}>
                  <View>
                    <GeistText style={[tw`text-gray-500`, typography.caption]}>
                      Amount Due
                    </GeistText>
                    <GeistText style={[tw`text-gray-900`, typography.h1]}>
                      <CurrencyFormat value={total} />
                    </GeistText>
                  </View>
                  <View>
                    <GeistText style={[tw`text-gray-500`, typography.caption]}>
                      Change
                    </GeistText>
                    <GeistText
                      style={[
                        tw`${change >= 0 ? "text-green-600" : "text-red-600"}`,
                        typography.h1,
                      ]}
                    >
                      <CurrencyFormat value={change} />
                    </GeistText>
                  </View>
                </View>
                <View style={tw`bg-white rounded-lg p-3`}>
                  <GeistText style={[tw`text-gray-500`, typography.caption]}>
                    Amount Tendered
                  </GeistText>
                  <GeistText style={[tw`text-blue-600`, typography.h1]}>
                    <CurrencyFormat value={parseFloat(amount || "0")} />
                  </GeistText>
                </View>
              </View>

              {selectedMethod === "EXTERNAL_POS" && (
                <View style={tw`mb-4`}>
                  <View
                    style={tw`bg-white rounded-lg border border-gray-200 p-4`}
                  >
                    <GeistText
                      style={[tw`text-gray-600 mb-2`, typography.caption]}
                    >
                      External POS Receipt Number
                    </GeistText>
                    <TextInput
                      style={[
                        tw`bg-gray-50 rounded-lg p-3 text-gray-900`,
                        typography.body,
                      ]}
                      placeholder="Enter receipt number"
                      value={receiptNumber}
                      onChangeText={setReceiptNumber}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              )}

              {selectedMethod === "CASH" ? (
                <View style={tw`flex-1`}>
                  {/* Quick Amounts */}
                  <View style={tw`mb-1`}>
                    <View style={tw`flex-row flex-wrap -mx-0.5`}>
                      {QUICK_AMOUNTS.map((value) => (
                        <TouchableOpacity
                          key={value}
                          style={tw`w-1/3 p-0.5`}
                          onPress={() => handleQuickAmount(value)}
                        >
                          <View
                            style={tw`bg-gray-100 rounded-lg p-1.5 items-center`}
                          >
                            <GeistText
                              style={[tw`text-gray-900`, typography.bodyMedium]}
                            >
                              <CurrencyFormat value={value} />
                            </GeistText>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Keypad */}
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row flex-wrap h-full -mx-0.5`}>
                      {[
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9",
                        ".",
                        "0",
                        "⌫",
                      ].map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={tw`w-1/3 h-[70px] p-0.5`}
                          onPress={() =>
                            key === "⌫"
                              ? handleBackspace()
                              : handleNumberPress(key)
                          }
                        >
                          <View
                            style={tw`flex-1 bg-gray-100 rounded-lg items-center justify-center ${
                              key === "⌫" ? "bg-red-100" : ""
                            }`}
                          >
                            <GeistText
                              style={[
                                tw`${
                                  key === "⌫" ? "text-red-600" : "text-gray-900"
                                }`,
                                typography.h1,
                              ]}
                            >
                              {key}
                            </GeistText>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Complete Sale Button */}
                  <View style={tw`mt-4`}>
                    <TouchableOpacity
                      style={tw`h-16 bg-blue-600 rounded-xl items-center justify-center ${
                        (!amount && total > 0) ||
                        (parseFloat(amount) < total && total > 0)
                          ? "opacity-50"
                          : ""
                      }`}
                      onPress={handlePayment}
                      disabled={
                        (!amount && total > 0) ||
                        (parseFloat(amount) < total && total > 0)
                      }
                    >
                      <GeistText style={[tw`text-white`, typography.h2]}>
                        Complete Sale
                      </GeistText>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={tw`flex-1 justify-end`}>
                  <TouchableOpacity
                    style={tw`h-16 bg-blue-600 rounded-xl items-center justify-center ${
                      !selectedMethod || !isExternalPaymentValid
                        ? "opacity-50"
                        : ""
                    }`}
                    onPress={handlePayment}
                    disabled={!selectedMethod || !isExternalPaymentValid}
                  >
                    <GeistText style={[tw`text-white`, typography.h2]}>
                      Complete Payment
                    </GeistText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Processing Payment Overlay */}
          {isProcessing && (
            <View
              style={tw`absolute z-50 flex-1 justify-center items-center bg-black bg-opacity-50 w-full h-full`}
            >
              <View
                style={tw`bg-white p-8 rounded-xl w-1/3 max-w-md items-center`}
              >
                <ActivityIndicator
                  size="large"
                  color="#3b82f6"
                  style={tw`mb-4`}
                />
                <GeistText
                  style={[tw`text-gray-900 text-center mb-2`, typography.h3]}
                >
                  {processingMessage}
                </GeistText>
                <GeistText
                  style={[tw`text-gray-600 text-center`, typography.body]}
                >
                  Please do not close the app or leave this screen
                </GeistText>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Payment Result Modal */}
      <PaymentResultModal
        visible={showResultModal}
        onClose={() => {
          setShowResultModal(false);
          if (paymentSuccess) {
            onClose();
          }
        }}
        isSuccess={paymentSuccess}
        errorMessage={errorMessage}
        ecentricDetails={paymentDetails}
        amount={saleAmount}
        customerName={customer?.fullname}
        customerEmail={customer?.email}
        items={items}
      />
    </>
  );
}

export function PaymentModal(props: PaymentModalProps) {
  // Check if we need mobile or tablet layout
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return isTablet ? (
    <TabletPaymentModal {...props} />
  ) : (
    <MobilePaymentModal {...props} />
  );
}

export default PaymentModal;
