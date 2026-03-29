import { SplitPayment, PaymentType } from "@/types/api";

/**
 * Validates split payments according to API requirements
 */
export interface SplitPaymentValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that the sum of payments matches the total amount
 * Tolerance: ±0.01 for floating-point precision
 */
export function validatePaymentSum(
  payments: SplitPayment[],
  total: number
): SplitPaymentValidationResult {
  if (!payments || payments.length === 0) {
    return {
      valid: false,
      error: "At least one payment is required",
    };
  }

  const sum = payments.reduce((acc, payment) => acc + payment.amount, 0);
  const difference = Math.abs(sum - total);

  if (difference > 0.01) {
    return {
      valid: false,
      error: `Sum of payments (${sum.toFixed(2)}) does not match sale total (${total.toFixed(2)})`,
    };
  }

  return { valid: true };
}

/**
 * Validates that each payment has required fields
 */
export function validatePaymentFields(
  payments: SplitPayment[]
): SplitPaymentValidationResult {
  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];

    // Check required fields
    if (!payment.type) {
      return {
        valid: false,
        error: `Payment ${i + 1}: Payment type is required`,
      };
    }

    if (!payment.amount || payment.amount <= 0) {
      return {
        valid: false,
        error: `Payment ${i + 1}: Amount must be positive`,
      };
    }

    // Validate payment type
    const validTypes: PaymentType[] = ["CASH", "CENDROID", "ECENTRIC", "EXTERNAL_POS"];
    if (!validTypes.includes(payment.type)) {
      return {
        valid: false,
        error: `Payment ${i + 1}: Invalid payment type "${payment.type}"`,
      };
    }

    // Validate ECENTRIC payment required fields
    if (payment.type === "ECENTRIC") {
      if (!payment.ecentric_transaction_uuid) {
        return {
          valid: false,
          error: `Payment ${i + 1}: ECENTRIC payment requires ecentric_transaction_uuid`,
        };
      }
      if (!payment.ecentric_auth_code) {
        return {
          valid: false,
          error: `Payment ${i + 1}: ECENTRIC payment requires ecentric_auth_code`,
        };
      }
      if (!payment.ecentric_result_code) {
        return {
          valid: false,
          error: `Payment ${i + 1}: ECENTRIC payment requires ecentric_result_code`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Comprehensive validation for split payments
 */
export function validateSplitPayments(
  payments: SplitPayment[],
  total: number
): SplitPaymentValidationResult {
  // Validate payment fields
  const fieldsValidation = validatePaymentFields(payments);
  if (!fieldsValidation.valid) {
    return fieldsValidation;
  }

  // Validate payment sum
  const sumValidation = validatePaymentSum(payments, total);
  if (!sumValidation.valid) {
    return sumValidation;
  }

  return { valid: true };
}

/**
 * Calculates the remaining amount needed to complete the payment
 */
export function calculateRemainingAmount(
  payments: SplitPayment[],
  total: number
): number {
  const sum = payments.reduce((acc, payment) => acc + payment.amount, 0);
  return Math.max(0, total - sum);
}

/**
 * Checks if payments array is complete (sum equals total)
 */
export function isPaymentComplete(
  payments: SplitPayment[],
  total: number
): boolean {
  const sum = payments.reduce((acc, payment) => acc + payment.amount, 0);
  return Math.abs(sum - total) <= 0.01;
}

