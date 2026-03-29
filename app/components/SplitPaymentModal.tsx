import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";
import { SplitPayment, PaymentType } from "@/types/api";
import {
  validateSplitPayments,
  calculateRemainingAmount,
  isPaymentComplete,
} from "@/utils/splitPaymentValidation";
import { getPaymentConfig } from "@/config/dynamicAppConfig";
import PaymentServiceManager from "@/utils/PaymentServiceManager";
import CendroidPayment from "@/utils/CendroidPayment";
import { getAvailablePaymentMethods } from "@/utils/paymentConfig";
import PrinterUtils from "@/utils/PrinterUtils";
import { NativeModules } from "react-native";

const { EcentricPaymentModule } = NativeModules;

// Helper function to safely print split payment receipts
const safePrintSplitReceipt = async (printData: {
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  payments: Array<{
    type: string;
    amount: number;
    cardDetails?: any;
  }>;
  customerName?: string;
  receiptNumber: string;
  tellerName?: string;
  storeName?: string;
}) => {
  try {
    // Check if any printer is available before attempting to print
    const isPrinterAvailable = await PrinterUtils.isAnyPrinterAvailable();
    
    if (!isPrinterAvailable) {
      console.log("[PRINT] No printer available, skipping split receipt printing");
      return;
    }

    // Get available printer service
    const printerInfo = await PrinterUtils.getAvailablePrinterService();
    
    if (!printerInfo) {
      console.log("[PRINT] No printer service available");
      return;
    }

    console.log(`[PRINT] Printing split payment receipt with ${printerInfo.isDirect ? 'direct' : 'legacy'} printer`);

    if (printerInfo.isDirect) {
      await printerInfo.service.printSplitPaymentReceipt(printData);
      console.log("Split payment receipt printed successfully (direct mode)");
    } else {
      await printerInfo.service.printSplitPaymentReceipt(printData);
      console.log("Split payment receipt printed successfully (legacy mode)");
    }
  } catch (error) {
    console.error("[PRINT] Error printing split payment receipt:", error);
    // Continue even if printing fails
  }
};

interface SplitPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  total: number;
  onPaymentComplete: (payments: SplitPayment[]) => void;
  items?: Array<{ name: string; quantity: number; price: number }>;
  customer?: any;
  hasZeroPriceItems?: boolean;
}

interface PaymentEntry {
  id: string;
  type: PaymentType | null;
  amount: string;
  notes?: string;
  isProcessing?: boolean;
  ecentricDetails?: any;
  cendroidDetails?: any;
  externalPosReceipt?: string;
  cardPending?: boolean; // Track if waiting for card payment
  isCompleted?: boolean; // Track if payment is successfully completed and locked
}

const PAYMENT_METHODS: Array<{
  id: string; // Use string for display, will map to PaymentType when selected
  name: string;
  icon: string;
  color: string;
  paymentType?: PaymentType; // Optional PaymentType for card (will be determined dynamically)
}> = [
  { id: "CASH", name: "Cash", icon: "cash", color: "#22c55e", paymentType: "CASH" },
  { id: "CARD", name: "Card", icon: "credit-card", color: "#0ea5e9" }, // Will determine ECENTRIC or CENDROID dynamically
  { id: "EXTERNAL_POS", name: "External POS", icon: "cash-register", color: "#f59e0b", paymentType: "EXTERNAL_POS" },
];

const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function SplitPaymentModal({
  visible,
  onClose,
  total,
  onPaymentComplete,
  items = [],
  customer = null,
  hasZeroPriceItems,
}: SplitPaymentModalProps) {
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setPayments([
        {
          id: generateUUID(),
          type: null,
          amount: "",
          notes: "",
        },
      ]);
      setIsProcessing(false);
      setProcessingMessage("");
      setProcessingPaymentId(null);
    }
  }, [visible]);

  const addPayment = () => {
    if (isProcessing) return; // Prevent adding during processing
    
    setPayments([
      ...payments,
      {
        id: generateUUID(),
        type: null,
        amount: "",
        notes: "",
      },
    ]);
  };

  const removePayment = (id: string) => {
    if (isProcessing) return; // Prevent removal during processing
    
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    } else {
      Alert.alert("Notice", "You must have at least one payment method.");
    }
  };

  const updatePayment = (id: string, updates: Partial<PaymentEntry>) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const getTotalPaid = (): number => {
    return payments.reduce((sum, p) => {
      const amount = parseFloat(p.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const getRemaining = (): number => {
    return calculateRemainingAmount(
      payments.map((p) => ({
        type: p.type!,
        amount: parseFloat(p.amount) || 0,
        notes: p.notes,
      })),
      total
    );
  };

  const handleCardPayment = async (paymentId: string, amount: number) => {
    if (Platform.OS !== "android") {
      Alert.alert("Error", "Card payment is only supported on Android devices");
      return;
    }

    try {
      setProcessingPaymentId(paymentId);
      setIsProcessing(true);
      setProcessingMessage("Initializing card payment...");

      const paymentConfig = await getPaymentConfig();
      if (!paymentConfig || Object.keys(paymentConfig).length === 0) {
        throw new Error("Payment configuration not found");
      }

      const roundedAmount = Math.round(amount);
      const amountInCents = roundedAmount * 100;
      const transactionUuid = generateUUID().trim();
      const referenceNo = `NX-${Math.floor(1000 + Math.random() * 9000)}`;
      const transactionDescription = `Nexo sale ${referenceNo}`.replace(
        /[^\w\s\-]/gi,
        ""
      );

      const customerName = customer?.fullname || "Guest Customer";
      const cellNumber = customer?.phone || "27823456789";
      const emailAddress = customer?.email || "receipt@nexo.com";

      // Check available payment methods - same as main PaymentModal
      const methods = await getAvailablePaymentMethods();
      console.log('🔍 [Split Payment] Available payment methods for card routing:', methods);

      let paymentMethod: "ECENTRIC" | "CENDROID" | null = null;

      // Priority: CenDroid first, then Ecentric (same as main PaymentModal)
      if (methods.includes('cendroid')) {
        paymentMethod = "CENDROID";
        console.log('💳 [Split Payment] Routing to CenDroid payment');
      } else if (methods.includes('ecentric')) {
        paymentMethod = "ECENTRIC";
        console.log('💳 [Split Payment] Routing to Ecentric payment');
      }

      if (!paymentMethod) {
        console.error("❌ [Split Payment] No card payment methods available");
        throw new Error("No card payment service available");
      }

      setProcessingMessage(`Processing ${paymentMethod} payment...`);

      if (paymentMethod === "CENDROID") {
        // Handle Cendroid payment
        console.log('💳 [Split Payment] Initializing CenDroid service...');
        await CendroidPayment.initializeWithDynamicConfig();
        const cendroidResult = await CendroidPayment.processPayment(roundedAmount, referenceNo);

        console.log('💳 [Split Payment] CenDroid payment result:', cendroidResult);

        if (cendroidResult.success && cendroidResult.approved && cendroidResult.cendroidResponse) {
          const payload = cendroidResult.cendroidResponse.payload || {};
          updatePayment(paymentId, {
            type: "CENDROID",
            cardPending: false,
            isCompleted: true, // Mark as completed and locked
            cendroidDetails: {
              UUID: cendroidResult.uuid,
              PANHash: cendroidResult.panHash || payload.PANHash,
              AuthCode: cendroidResult.authCode || payload.AuthCode,
              ARC: payload.ARC,
              Approved: cendroidResult.approved,
              Amount: cendroidResult.amount || roundedAmount,
              EcrHostResponse: cendroidResult.ecrHostResponse || payload.EcrHostResponse,
              TransactionResultCode: cendroidResult.transactionResultCode,
              resultCode: cendroidResult.cendroidResponse.resultCode,
            },
            isProcessing: false,
          });
          
          // Auto-add next payment if there's remaining balance
          setTimeout(() => {
            const currentRemaining = calculateRemainingAmount(
              payments
                .filter(p => p.type && parseFloat(p.amount) > 0)
                .map(p => ({
                  type: p.type!,
                  amount: parseFloat(p.amount) || 0,
                })),
              total
            );
            
            if (currentRemaining > 0) {
              console.log(`💡 Auto-adding next payment. Remaining: R${currentRemaining.toFixed(2)}`);
              setPayments(prev => [
                ...prev,
                {
                  id: generateUUID(),
                  type: null,
                  amount: "",
                  notes: "",
                },
              ]);
            }
          }, 300);
        } else {
          throw new Error(cendroidResult.errorMessage || "Cendroid payment failed");
        }
      } else {
        // Handle Ecentric payment - use PaymentServiceManager for proper authentication
        console.log('💳 [Split Payment] Processing Ecentric payment using PaymentServiceManager...');
        console.log('💳 [Split Payment] PaymentServiceManager will authenticate before processing payment');
        
        setProcessingMessage("Connecting to payment terminal...");

        // Use PaymentServiceManager which handles authentication properly (same as main PaymentModal)
        const response = await PaymentServiceManager.processPayment(
          amountInCents,
          referenceNo,
          {
            transactionId: transactionUuid,
            description: transactionDescription,
            customerName,
            cellNumber,
            emailAddress,
            isReceiptRequired: false,
            alwaysShowTransactionStatusScreen: false,
            merchantInfoJson: JSON.stringify({
              Phone_No: "",
              Street: "",
              URL: "",
              Support_Phone_No: "",
              City: "",
              Province: "",
              Country_Code: "ZA",
              Currency_Code: "ZAR",
              Postal_Code: "",
            }),
          }
        );

        console.log('💳 [Split Payment] Ecentric payment result:', response);

        if (response.isApproved === "true" && response.resultCode === "01") {
          // Extract data from receiptBundle if available
          const receiptBundle = response.receiptBundle || {};
          const authCode = receiptBundle.AUTH_CODE || response.authCode || "";
          const rrn = receiptBundle.RRN || response.rrn || "";
          const maskedPan = receiptBundle.PAN || response.maskedPan || "";
          const aid = receiptBundle.AID || response.aid || "";
          const terminalId = receiptBundle.TERMINAL_ID || response.terminalId || "";
          const posEntryMode = receiptBundle.POS_ENTRY || response.posEntryMode || "";
          const cardType = receiptBundle.APP_LABEL || receiptBundle.APPLICATION_LABEL || response.cardType || "";
          const batchNumber = receiptBundle.BATCH_NO || receiptBundle.BATCH_NUMBER || response.batchNumber || "";
          
          console.log('💳 [Split Payment] Extracted payment details:', {
            authCode,
            rrn,
            maskedPan,
            terminalId,
            hasReceiptBundle: !!response.receiptBundle
          });

          updatePayment(paymentId, {
            type: "ECENTRIC",
            cardPending: false,
            isCompleted: true, // Mark as completed and locked
            ecentricDetails: {
              ecentric_transaction_uuid: transactionUuid,
              ecentric_auth_code: authCode,
              ecentric_result_code: response.resultCode || "01",
              ecentric_result_desc: response.resultDescription || "Approved",
              ecentric_rrn: rrn,
              ecentric_card_type: cardType,
              ecentric_masked_pan: maskedPan,
              ecentric_aid: aid,
              ecentric_terminal_id: terminalId,
              ecentric_pos_entry_mode: posEntryMode,
              ecentric_transaction_type: "PURCHASE",
              ecentric_approval_status: "APPROVED",
              ecentric_receipt_number: receiptBundle.RECEIPT_NUMBER || response.receiptNumber || "",
              ecentric_receipt_details: response.receiptBundle || {},
              ecentric_latitude: response.latitude || "",
              ecentric_longitude: response.longitude || "",
              ecentric_accuracy: response.accuracy || "",
              ecentric_bank_name: receiptBundle.MERCHANT_NAME || response.bankName || "",
              ecentric_merchant_id: receiptBundle.MERCHANT_ID || response.merchantId || "",
              ecentric_batch_number: batchNumber,
            },
            isProcessing: false,
          });
          
          // Auto-add next payment if there's remaining balance
          setTimeout(() => {
            const currentRemaining = calculateRemainingAmount(
              payments
                .filter(p => p.type && parseFloat(p.amount) > 0)
                .map(p => ({
                  type: p.type!,
                  amount: parseFloat(p.amount) || 0,
                })),
              total
            );
            
            if (currentRemaining > 0) {
              console.log(`💡 Auto-adding next payment. Remaining: R${currentRemaining.toFixed(2)}`);
              setPayments(prev => [
                ...prev,
                {
                  id: generateUUID(),
                  type: null,
                  amount: "",
                  notes: "",
                },
              ]);
            }
          }, 300);
        } else {
          throw new Error(response.resultDescription || "Payment declined");
        }
      }
    } catch (error: any) {
      console.error("❌ [Split Payment] Card payment error:", error);
      Alert.alert("Payment Failed", error.message || "Card payment failed. Please try again.");
      updatePayment(paymentId, { isProcessing: false, cardPending: false });
    } finally {
      setIsProcessing(false);
      setProcessingPaymentId(null);
      setProcessingMessage("");
    }
  };

  const handleComplete = async () => {
    // Prevent double-clicking
    if (isProcessing) return;
    
    setIsProcessing(true);
    setProcessingMessage("Validating payments...");
    
    try {
      // Convert payment entries to SplitPayment format
      const splitPayments: SplitPayment[] = payments
        .filter((p) => {
          // Must have a type and valid amount
          if (!p.type) return false;
          const amount = parseFloat(p.amount);
          return !isNaN(amount) && amount > 0;
        })
        .map((p) => {
        const payment: SplitPayment = {
          type: p.type!,
          amount: parseFloat(p.amount),
          notes: p.notes,
        };

        // Add ECENTRIC details if present
        if (p.type === "ECENTRIC" && p.ecentricDetails) {
          Object.assign(payment, p.ecentricDetails);
        }

        // Add CENDROID details if present
        if (p.type === "CENDROID" && p.cendroidDetails) {
          Object.assign(payment, {
            cendroid_transaction_uuid: p.cendroidDetails.UUID,
            cendroid_pan_hash: p.cendroidDetails.PANHash,
            cendroid_auth_code: p.cendroidDetails.AuthCode,
            cendroid_arc: p.cendroidDetails.ARC,
            cendroid_is_approved: p.cendroidDetails.Approved,
            cendroid_amount: p.cendroidDetails.Amount,
            cendroid_ecr_host_response: p.cendroidDetails.EcrHostResponse,
            cendroid_transaction_result_code: p.cendroidDetails.TransactionResultCode,
            cendroid_result_code: p.cendroidDetails.resultCode,
          });
        }

        // Add EXTERNAL_POS receipt number if present
        if (p.type === "EXTERNAL_POS" && p.externalPosReceipt) {
          payment.external_pos_receipt_number = p.externalPosReceipt;
        }

          return payment;
        });

      // Validate payments
      const validation = validateSplitPayments(splitPayments, total);
      if (!validation.valid) {
        setIsProcessing(false);
        setProcessingMessage("");
        Alert.alert("Payment Error", validation.error || "Please check your payment details and try again.");
        return;
      }

      setProcessingMessage("Processing payment...");
      
      // Minimum display time for loading state
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 800));
      
      // Process payment and wait for completion
      await Promise.all([
        minLoadingTime,
        onPaymentComplete(splitPayments)
      ]);
      
      // Print split payment receipt
      setProcessingMessage("Printing receipt...");
      try {
        // Prepare payment data for receipt
        const receiptPayments = payments
          .filter((p) => p.type && parseFloat(p.amount) > 0)
          .map((p) => ({
            type: p.type!,
            amount: parseFloat(p.amount),
            cardDetails: p.type === "ECENTRIC" ? p.ecentricDetails : 
                        p.type === "CENDROID" ? p.cendroidDetails : undefined,
          }));

        await safePrintSplitReceipt({
          total,
          items,
          payments: receiptPayments,
          customerName: customer?.fullname || "Guest Customer",
          receiptNumber: `NX-${Math.floor(1000 + Math.random() * 9000)}`,
          tellerName: "Staff", // You can pass this from context if available
          storeName: "Nexo",   // You can pass this from context if available
        });
        console.log("✅ Split payment receipt printed successfully");
      } catch (printError) {
        console.error("❌ Failed to print split payment receipt:", printError);
        // Don't fail the payment if printing fails
      }
      
      // Only reset state after everything is complete
      setIsProcessing(false);
      setProcessingMessage("");
    } catch (error) {
      setIsProcessing(false);
      setProcessingMessage("");
      Alert.alert("Payment Error", "Failed to process payment. Please verify and try again.");
    }
  };

  const totalPaid = getTotalPaid();
  const remaining = getRemaining();
  
  // Filter valid payments: must have type and valid amount
  const validPayments = payments.filter((p) => {
    // Must have a type (not null and not cardPending without completion)
    if (!p.type) return false;
    // Must have a valid numeric amount
    const amount = parseFloat(p.amount);
    if (isNaN(amount) || amount <= 0) return false;
    return true;
  });
  
  const isComplete = isPaymentComplete(
    validPayments.map((p) => ({
      type: p.type!,
      amount: parseFloat(p.amount),
    })),
    total
  );

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black/50 justify-end`}>
        <View style={tw`bg-white rounded-t-3xl h-[90%]`}>
          {/* Header */}
          <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
            <GeistText style={[tw`text-xl font-bold`, typography.h2]}>
              Split Payment
            </GeistText>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4`} showsVerticalScrollIndicator={true}>
            {/* Total and Summary with Progress Bar */}
            <View style={tw`bg-blue-50 rounded-2xl p-5 mb-4 shadow-sm border border-blue-100`}>
              {/* Progress Bar */}
              <View style={tw`mb-4`}>
                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <GeistText style={[tw`text-gray-700 font-semibold`, typography.caption]}>
                    PAYMENT PROGRESS
                  </GeistText>
                  <GeistText style={[tw`text-gray-700 font-bold`, typography.caption]}>
                    {Math.min(100, Math.round((totalPaid / total) * 100))}%
                  </GeistText>
                </View>
                <View style={tw`h-3 bg-gray-200 rounded-full overflow-hidden`}>
                  <View 
                    style={[
                      tw`h-full rounded-full`,
                      { 
                        width: `${Math.min(100, (totalPaid / total) * 100)}%`,
                        backgroundColor: remaining <= 0 ? '#22c55e' : '#3b82f6'
                      }
                    ]} 
                  />
                </View>
              </View>

              {/* Amounts */}
              <View style={tw`flex-row justify-between items-center mb-3`}>
                <GeistText style={[tw`text-gray-600`, typography.bodyMedium]}>
                  Total Due
                </GeistText>
                <GeistText style={[tw`text-gray-900 font-bold text-xl`, typography.h2]}>
                  <CurrencyFormat value={total} />
                </GeistText>
              </View>
              <View style={tw`flex-row justify-between items-center mb-3`}>
                <GeistText style={[tw`text-gray-600`, typography.bodyMedium]}>
                  Total Paid
                </GeistText>
                <GeistText style={[tw`text-blue-700 font-semibold text-lg`, typography.bodyBold]}>
                  <CurrencyFormat value={totalPaid} />
                </GeistText>
              </View>
              
              {/* Remaining Amount - Prominent Display */}
              <View style={tw`pt-3 border-t border-gray-300`}>
                <View style={tw`flex-row justify-between items-center`}>
                  <GeistText style={[tw`text-gray-700 font-bold`, typography.bodyBold]}>
                    Remaining
                  </GeistText>
                  <View style={tw`${remaining <= 0 ? "bg-green-100" : remaining < total ? "bg-yellow-100" : "bg-red-100"} px-4 py-2 rounded-xl`}>
                    <GeistText
                      style={[
                        tw`${remaining <= 0 ? "text-green-700" : remaining < total ? "text-yellow-700" : "text-red-700"} font-bold text-xl`,
                        typography.bodyBold,
                      ]}
                    >
                      <CurrencyFormat value={Math.max(0, remaining)} />
                    </GeistText>
                  </View>
                </View>
                {remaining <= 0 && totalPaid > 0 && (
                  <View style={tw`mt-2 bg-green-500 rounded-lg px-3 py-2`}>
                    <GeistText style={[tw`text-white text-center font-semibold`, typography.bodyMedium]}>
                      ✓ Payment Complete! Ready to finalize.
                    </GeistText>
                  </View>
                )}
              </View>
            </View>

            {/* Payment Entries */}
            {payments.map((payment, index) => (
              <View
                key={payment.id}
                style={tw`${payment.isCompleted ? 'bg-green-50 border-2 border-green-300' : 'bg-white border border-gray-200'} rounded-xl p-4 mb-4 ${payment.isCompleted ? 'shadow-sm' : ''}`}
              >
                <View style={tw`flex-row items-center justify-between mb-3`}>
                  <View style={tw`flex-row items-center gap-2`}>
                    <GeistText style={[tw`text-gray-900 font-bold`, typography.bodyMedium]}>
                      Payment {index + 1}
                    </GeistText>
                    {payment.isCompleted && (
                      <View style={tw`bg-green-600 px-3 py-1 rounded-full`}>
                        <GeistText style={[tw`text-white text-xs font-bold`, typography.caption]}>
                          ✓ COMPLETED
                        </GeistText>
                      </View>
                    )}
                  </View>
                  {payments.length > 1 && !payment.isCompleted && (
                    <TouchableOpacity 
                      onPress={() => removePayment(payment.id)}
                      disabled={isProcessing}
                    >
                      <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Payment Method Selection */}
                <View style={tw`mb-3`}>
                  <GeistText style={[tw`${payment.isCompleted ? 'text-gray-500' : 'text-gray-600'} mb-2`, typography.caption]}>
                    Payment Method {payment.isCompleted ? '(Locked)' : ''}
                  </GeistText>
                  <View style={tw`flex-row flex-wrap -mx-1 ${payment.isCompleted ? 'opacity-60' : ''}`}>
                    {PAYMENT_METHODS.filter(
                      (m) => !hasZeroPriceItems || m.id === "CASH"
                    ).map((method) => {
                      const isCard = method.id === "CARD";
                      const isSelected = isCard 
                        ? (payment.type === "ECENTRIC" || payment.type === "CENDROID" || payment.cardPending)
                        : (payment.type === method.paymentType);
                      
                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={tw`flex-1 mx-1 mb-2 p-3 rounded-lg border-2 ${
                            isSelected 
                              ? payment.isCompleted 
                                ? "border-green-500 bg-green-100" 
                                : "border-blue-500 bg-blue-50" 
                              : "border-gray-200 bg-gray-50"
                          }`}
                          onPress={() => {
                            if (payment.isCompleted) return; // Prevent changes to completed payments
                            if (method.id === "CARD") {
                              // Mark as card pending - user needs to enter amount first
                              updatePayment(payment.id, { type: null, cardPending: true });
                            } else if (method.paymentType) {
                              updatePayment(payment.id, { type: method.paymentType, cardPending: false });
                            }
                          }}
                          disabled={payment.isProcessing || payment.isCompleted}
                        >
                          <View style={tw`items-center`}>
                            <MaterialCommunityIcons
                              name={method.icon as any}
                              size={24}
                              color={isSelected ? (payment.isCompleted ? "#22c55e" : method.color) : "#6b7280"}
                            />
                            <GeistText
                              style={[
                                tw`mt-1 text-xs ${
                                  isSelected 
                                    ? payment.isCompleted 
                                      ? "text-green-700 font-semibold" 
                                      : "text-blue-600" 
                                    : "text-gray-600"
                                }`,
                                typography.caption,
                              ]}
                            >
                              {method.name}
                            </GeistText>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Amount Input */}
                <View style={tw`mb-3`}>
                  <GeistText style={[tw`${payment.isCompleted ? 'text-gray-500' : 'text-gray-600'} mb-2`, typography.caption]}>
                    Amount {payment.isCompleted ? '(Locked)' : ''}
                  </GeistText>
                  <View style={tw`${payment.isCompleted ? 'bg-green-100 border-2 border-green-300' : 'bg-white border border-gray-300'} rounded-lg p-3`}>
                    {payment.isCompleted ? (
                      <GeistText style={[tw`text-green-900 font-bold text-lg`, typography.bodyBold]}>
                        R {parseFloat(payment.amount).toFixed(2)}
                      </GeistText>
                    ) : (
                      <TextInput
                        style={tw`text-lg text-gray-900`}
                        value={payment.amount}
                        onChangeText={(text) => {
                          // Allow only numbers and one decimal point
                          const cleaned = text.replace(/[^0-9.]/g, "");
                          const parts = cleaned.split(".");
                          if (parts.length > 2) return;
                          updatePayment(payment.id, { amount: cleaned });
                        }}
                        placeholder="0.00"
                        placeholderTextColor="#9ca3af"
                        keyboardType="decimal-pad"
                        editable={!payment.isProcessing && !payment.isCompleted}
                      />
                    )}
                  </View>
                </View>

                {/* Card Payment Instructions - Show when card is selected but no amount entered */}
                {payment.cardPending && !payment.amount && !payment.isCompleted && (
                  <View style={tw`bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-3`}>
                    <View style={tw`flex-row items-center`}>
                      <View style={tw`bg-blue-500 p-2 rounded-full mr-3`}>
                        <MaterialCommunityIcons name="credit-card" size={20} color="#fff" />
                      </View>
                      <View style={tw`flex-1`}>
                        <GeistText style={[tw`text-blue-900 font-semibold mb-1`, typography.bodyMedium]}>
                          Card Payment Selected
                        </GeistText>
                        <GeistText style={[tw`text-blue-700`, typography.caption]}>
                          Enter the amount above, then click the button below to process
                        </GeistText>
                      </View>
                    </View>
                  </View>
                )}

                {/* Card Payment Button - Show when amount is entered and card is pending */}
                {payment.cardPending && payment.amount && parseFloat(payment.amount) > 0 && !payment.isCompleted && (
                  <TouchableOpacity
                    style={[
                      tw`rounded-xl p-4 mb-3 ${payment.isProcessing || isProcessing ? 'opacity-60' : ''}`,
                      { backgroundColor: '#2563eb', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 }
                    ]}
                    onPress={() => handleCardPayment(payment.id, parseFloat(payment.amount))}
                    disabled={payment.isProcessing || isProcessing}
                    activeOpacity={0.8}
                  >
                    {payment.isProcessing ? (
                      <View style={tw`flex-row items-center justify-center`}>
                        <ActivityIndicator color="#fff" size="small" />
                        <GeistText style={[tw`text-white ml-3 font-bold`, typography.bodyMedium]}>
                          Processing...
                        </GeistText>
                      </View>
                    ) : (
                      <View style={tw`flex-row items-center justify-center`}>
                        <MaterialCommunityIcons name="credit-card-check" size={24} color="#fff" />
                        <GeistText style={[tw`text-white ml-3 font-bold`, typography.bodyBold]}>
                          Process Card Payment - R{parseFloat(payment.amount).toFixed(2)}
                        </GeistText>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* Payment Status - Success Indicator */}
                {payment.type === "ECENTRIC" && payment.ecentricDetails && payment.isCompleted && (
                  <View style={tw`bg-green-100 border-2 border-green-400 rounded-xl p-3 mb-3`}>
                    <View style={tw`flex-row items-center`}>
                      <View style={tw`bg-green-600 p-2 rounded-full mr-3`}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                      </View>
                      <View style={tw`flex-1`}>
                        <GeistText style={[tw`text-green-900 font-bold`, typography.bodyMedium]}>
                          ✓ Card Payment Approved
                        </GeistText>
                        <GeistText style={[tw`text-green-700 text-xs`, typography.caption]}>
                          This payment has been processed successfully
                        </GeistText>
                      </View>
                    </View>
                  </View>
                )}

                {payment.type === "CENDROID" && payment.cendroidDetails && payment.isCompleted && (
                  <View style={tw`bg-green-100 border-2 border-green-400 rounded-xl p-3 mb-3`}>
                    <View style={tw`flex-row items-center`}>
                      <View style={tw`bg-green-600 p-2 rounded-full mr-3`}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                      </View>
                      <View style={tw`flex-1`}>
                        <GeistText style={[tw`text-green-900 font-bold`, typography.bodyMedium]}>
                          ✓ Card Payment Approved
                        </GeistText>
                        <GeistText style={[tw`text-green-700 text-xs`, typography.caption]}>
                          This payment has been processed successfully
                        </GeistText>
                      </View>
                    </View>
                  </View>
                )}

                {/* External POS Receipt */}
                {payment.type === "EXTERNAL_POS" && (
                  <View style={tw`mb-3`}>
                    <GeistText style={[tw`text-gray-600 mb-2`, typography.caption]}>
                      Receipt Number
                    </GeistText>
                    <TextInput
                      style={tw`border border-gray-300 rounded-lg p-3`}
                      value={payment.externalPosReceipt}
                      onChangeText={(text) =>
                        updatePayment(payment.id, { externalPosReceipt: text })
                      }
                      placeholder="Enter receipt number"
                    />
                  </View>
                )}

                {/* Notes */}
                <View>
                  <GeistText style={[tw`${payment.isCompleted ? 'text-gray-500' : 'text-gray-600'} mb-2`, typography.caption]}>
                    Notes (Optional) {payment.isCompleted ? '(Locked)' : ''}
                  </GeistText>
                  <TextInput
                    style={tw`${payment.isCompleted ? 'bg-gray-100' : 'bg-white'} border border-gray-300 rounded-lg p-3 ${payment.isCompleted ? 'text-gray-600' : 'text-gray-900'}`}
                    value={payment.notes}
                    onChangeText={(text) => updatePayment(payment.id, { notes: text })}
                    placeholder="Add notes..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    editable={!payment.isCompleted && !payment.isProcessing}
                  />
                </View>
              </View>
            ))}

            {/* Add Payment Button */}
            {remaining > 0 && !isProcessing && (
              <TouchableOpacity
                style={tw`bg-gray-50 border-2 border-dashed border-gray-400 rounded-xl p-5 items-center mb-4 ${
                  payments.some(p => p.cardPending && !p.isCompleted) ? "opacity-40" : ""
                }`}
                onPress={addPayment}
                disabled={isProcessing || payments.some(p => p.cardPending && !p.isCompleted)}
                activeOpacity={0.7}
              >
                <View style={tw`flex-row items-center`}>
                  <View style={tw`bg-gray-300 p-2 rounded-full mr-3`}>
                    <MaterialCommunityIcons name="plus" size={24} color="#374151" />
                  </View>
                  <View>
                    <GeistText style={[tw`text-gray-800 font-semibold`, typography.bodyMedium]}>
                      Add Another Payment Method
                    </GeistText>
                    <GeistText style={[tw`text-gray-600 text-xs`, typography.caption]}>
                      Remaining: R{remaining.toFixed(2)}
                    </GeistText>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Helper message when card payment is pending */}
            {payments.some(p => p.cardPending && !p.isCompleted) && remaining > 0 && !isProcessing && (
              <View style={tw`bg-yellow-50 border border-yellow-300 rounded-xl p-4 mb-4`}>
                <View style={tw`flex-row items-center`}>
                  <MaterialCommunityIcons name="information" size={20} color="#f59e0b" />
                  <GeistText style={[tw`text-yellow-800 ml-2 flex-1`, typography.caption]}>
                    Complete or cancel the pending card payment before adding another payment method
                  </GeistText>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={tw`border-t-2 border-gray-200 p-4 bg-gray-50`}>
            {!isComplete && validPayments.length > 0 && !isProcessing && (
              <View style={tw`bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-3`}>
                <View style={tw`flex-row items-center`}>
                  <View style={tw`bg-yellow-500 p-2 rounded-full mr-3`}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color="#fff" />
                  </View>
                  <View style={tw`flex-1`}>
                    <GeistText style={[tw`text-yellow-900 font-semibold mb-1`, typography.bodyMedium]}>
                      Payment Incomplete
                    </GeistText>
                    <GeistText style={[tw`text-yellow-800 text-xs`, typography.caption]}>
                      {remaining > 0 
                        ? `You still need to pay R${remaining.toFixed(2)}`
                        : remaining < 0
                        ? `Payment exceeds total by R${Math.abs(remaining).toFixed(2)}`
                        : "Please complete all payment details"
                      }
                    </GeistText>
                  </View>
                </View>
              </View>
            )}
            
            {isComplete && !isProcessing && (
              <View style={tw`bg-green-50 border-2 border-green-400 rounded-xl p-3 mb-3`}>
                <View style={tw`flex-row items-center justify-center`}>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#22c55e" />
                  <GeistText style={[tw`text-green-800 font-bold ml-2`, typography.bodyMedium]}>
                    Ready to Complete Payment!
                  </GeistText>
                </View>
              </View>
            )}
            
            <TouchableOpacity
              style={[
                tw`rounded-xl p-4 items-center`,
                isComplete && !isProcessing 
                  ? { backgroundColor: '#16a34a', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 }
                  : tw`bg-gray-400`
              ]}
              onPress={handleComplete}
              disabled={!isComplete || isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <View style={tw`flex-row items-center`}>
                  <ActivityIndicator color="#fff" size="small" />
                  <GeistText style={[tw`text-white ml-3 font-bold`, typography.bodyBold]}>
                    Processing...
                  </GeistText>
                </View>
              ) : (
                <View style={tw`flex-row items-center`}>
                  <MaterialCommunityIcons 
                    name={isComplete ? "check-circle-outline" : "lock"} 
                    size={24} 
                    color="#fff" 
                  />
                  <GeistText style={[tw`text-white font-bold ml-2`, typography.bodyBold]}>
                    {isComplete ? "Complete Payment" : "Complete All Payments First"}
                  </GeistText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Processing Overlay */}
        {isProcessing && (
          <View style={tw`absolute inset-0 bg-black/50 items-center justify-center`}>
            <View style={tw`bg-white rounded-xl p-6 items-center`}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <GeistText style={[tw`mt-4 text-gray-900`, typography.bodyMedium]}>
                {processingMessage || "Processing..."}
              </GeistText>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

