/**
 * Error handling utilities for shift management operations
 * Provides standardized error processing and user-friendly error messages
 */

import {
  ShiftApiError,
  ShiftValidationError,
  CashContinuityError,
  InventoryVarianceError,
  ERROR_CODES,
} from "../types/shift";

// ============================================================================
// ERROR PROCESSING CLASS
// ============================================================================

export class ShiftErrorHandler {
  
  /**
   * Process and standardize API errors from shift operations
   * @param error Raw error from API call
   * @param operation Operation that failed (for context)
   * @returns Standardized error object
   */
  static processApiError(error: any, operation: string): ShiftApiError {
    console.error(`[ShiftErrorHandler] Processing error for ${operation}:`, error);

    // If it's already a structured shift error, return as-is
    if (error.error_code && error.status === "error") {
      return error as ShiftApiError;
    }

    // Extract error information from axios response
    if (error.response?.data) {
      const errorData = error.response.data;
      
      return this.createStructuredError(
        errorData.message || `${operation} failed`,
        errorData.error_code || "UNKNOWN_ERROR",
        errorData,
        operation
      );
    }

    // Handle network errors
    if (error.request && !error.response) {
      return this.createStructuredError(
        "Network error - please check your connection",
        "NETWORK_ERROR",
        { originalError: error.message },
        operation
      );
    }

    // Handle other errors
    return this.createStructuredError(
      error.message || `Unexpected error during ${operation}`,
      "UNKNOWN_ERROR",
      { originalError: error.message },
      operation
    );
  }

  /**
   * Create a standardized error object
   * @param message Error message
   * @param errorCode Error code
   * @param additionalData Additional error data
   * @param operation Operation context
   * @returns Structured error object
   */
  private static createStructuredError(
    message: string,
    errorCode: string,
    additionalData: any = {},
    operation: string
  ): ShiftApiError {
    const baseError = {
      status: "error" as const,
      message,
      error_code: errorCode,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
      operation,
    };

    // Add specific error data based on error code
    switch (errorCode) {
      case ERROR_CODES.SHIFT_VALIDATION_FAILED:
        return {
          ...baseError,
          active_shift: additionalData.active_shift,
          suggested_action: additionalData.suggested_action || "Close your current shift before starting a new one",
        } as ShiftValidationError;

      case ERROR_CODES.CASH_CONTINUITY_ERROR:
        return {
          ...baseError,
          expected_amount: additionalData.expected_amount || 0,
          provided_amount: additionalData.provided_amount || 0,
        } as CashContinuityError;

      case ERROR_CODES.INVENTORY_VARIANCE_ERROR:
        return {
          ...baseError,
          variances: additionalData.variances || [],
        } as InventoryVarianceError;

      default:
        return {
          ...baseError,
          ...additionalData,
        };
    }
  }

  /**
   * Get user-friendly error message for display
   * @param error Shift API error
   * @returns User-friendly error message
   */
  static getUserFriendlyMessage(error: ShiftApiError): string {
    switch (error.error_code) {
      case ERROR_CODES.SHIFT_VALIDATION_FAILED:
        return "You have an active shift that must be closed before starting a new one.";

      case ERROR_CODES.CASH_CONTINUITY_ERROR:
        const cashError = error as CashContinuityError;
        return `Starting cash (${cashError.provided_amount}) doesn't match the expected amount (${cashError.expected_amount}) from your previous shift.`;

      case ERROR_CODES.INVENTORY_VARIANCE_ERROR:
        return "Significant inventory discrepancies were detected. Please review and provide explanations for the variances.";

      case ERROR_CODES.INVALID_TIMESTAMP:
        return "The shift time is invalid. Please ensure the time is within 24 hours of the current time.";

      case ERROR_CODES.NEGATIVE_AMOUNT:
        return "Cash amounts cannot be negative. Please enter a valid positive amount.";

      case ERROR_CODES.MISSING_COMMENTS:
        return "Comments are required for this operation. Please provide an explanation.";

      case ERROR_CODES.PRODUCT_NOT_FOUND:
        return "One or more products could not be found. Please verify the product information.";

      case ERROR_CODES.DUPLICATE_COUNT:
        return "Inventory count has already been recorded for this shift phase.";

      case "NETWORK_ERROR":
        return "Unable to connect to the server. Please check your internet connection and try again.";

      case "UNAUTHORIZED":
        return "Your session has expired. Please log in again.";

      case "FORBIDDEN":
        return "You don't have permission to perform this action.";

      default:
        return error.message || "An unexpected error occurred. Please try again.";
    }
  }

  /**
   * Get suggested action for resolving the error
   * @param error Shift API error
   * @returns Suggested action or null if no suggestion available
   */
  static getSuggestedAction(error: ShiftApiError): string | null {
    switch (error.error_code) {
      case ERROR_CODES.SHIFT_VALIDATION_FAILED:
        const shiftError = error as ShiftValidationError;
        return shiftError.suggested_action || "Close your current shift first";

      case ERROR_CODES.CASH_CONTINUITY_ERROR:
        return "Verify the cash amount from your previous shift and adjust accordingly";

      case ERROR_CODES.INVENTORY_VARIANCE_ERROR:
        return "Review the flagged products and provide explanations for any discrepancies";

      case ERROR_CODES.INVALID_TIMESTAMP:
        return "Use the current date and time or a recent timestamp";

      case ERROR_CODES.NEGATIVE_AMOUNT:
        return "Enter a positive cash amount";

      case ERROR_CODES.MISSING_COMMENTS:
        return "Add explanatory comments for this operation";

      case ERROR_CODES.PRODUCT_NOT_FOUND:
        return "Verify product IDs and try again";

      case ERROR_CODES.DUPLICATE_COUNT:
        return "Check if inventory has already been counted for this shift";

      case "NETWORK_ERROR":
        return "Check your internet connection and retry";

      case "UNAUTHORIZED":
        return "Log in again to continue";

      case "FORBIDDEN":
        return "Contact your supervisor for assistance";

      default:
        return null;
    }
  }

  /**
   * Check if an error is recoverable (user can retry)
   * @param error Shift API error
   * @returns True if the operation can be retried
   */
  static isRecoverable(error: ShiftApiError): boolean {
    const recoverableErrors = [
      "NETWORK_ERROR",
      ERROR_CODES.INVALID_TIMESTAMP,
      ERROR_CODES.NEGATIVE_AMOUNT,
      ERROR_CODES.MISSING_COMMENTS,
    ];

    return recoverableErrors.includes(error.error_code);
  }

  /**
   * Check if an error requires immediate attention (critical)
   * @param error Shift API error
   * @returns True if the error is critical
   */
  static isCritical(error: ShiftApiError): boolean {
    const criticalErrors = [
      ERROR_CODES.CASH_CONTINUITY_ERROR,
      ERROR_CODES.INVENTORY_VARIANCE_ERROR,
      ERROR_CODES.SHIFT_VALIDATION_FAILED,
    ];

    return criticalErrors.includes(error.error_code);
  }

  /**
   * Get the appropriate logging level for an error
   * @param error Shift API error
   * @returns Logging level (error, warn, info)
   */
  static getLogLevel(error: ShiftApiError): "error" | "warn" | "info" {
    if (this.isCritical(error)) {
      return "error";
    }

    if (this.isRecoverable(error)) {
      return "warn";
    }

    return "info";
  }

  /**
   * Generate a unique request ID for error tracking
   * @returns Unique request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// ERROR REPORTING UTILITIES
// ============================================================================

/**
 * Log error with appropriate level and context
 * @param error Shift API error
 * @param context Additional context for logging
 */
export function logShiftError(error: ShiftApiError, context: any = {}): void {
  const logLevel = ShiftErrorHandler.getLogLevel(error);
  const logMessage = `[ShiftError] ${error.operation || "Unknown operation"}: ${error.message}`;
  
  const logData = {
    error_code: error.error_code,
    message: error.message,
    operation: error.operation,
    timestamp: error.timestamp,
    requestId: error.requestId,
    isCritical: ShiftErrorHandler.isCritical(error),
    isRecoverable: ShiftErrorHandler.isRecoverable(error),
    context,
  };

  switch (logLevel) {
    case "error":
      console.error(logMessage, logData);
      break;
    case "warn":
      console.warn(logMessage, logData);
      break;
    case "info":
      console.info(logMessage, logData);
      break;
  }
}

/**
 * Create an error report for debugging and support
 * @param error Shift API error
 * @param userContext User context (user ID, shift ID, etc.)
 * @returns Formatted error report
 */
export function createErrorReport(error: ShiftApiError, userContext: any = {}): string {
  const report = [
    "=== SHIFT OPERATION ERROR REPORT ===",
    `Timestamp: ${error.timestamp}`,
    `Request ID: ${error.requestId}`,
    `Operation: ${error.operation || "Unknown"}`,
    `Error Code: ${error.error_code}`,
    `Message: ${error.message}`,
    `Critical: ${ShiftErrorHandler.isCritical(error) ? "Yes" : "No"}`,
    `Recoverable: ${ShiftErrorHandler.isRecoverable(error) ? "Yes" : "No"}`,
    "",
    "User Context:",
    JSON.stringify(userContext, null, 2),
    "",
    "Error Details:",
    JSON.stringify(error, null, 2),
    "",
    "Suggested Action:",
    ShiftErrorHandler.getSuggestedAction(error) || "No specific action suggested",
    "=== END REPORT ===",
  ];

  return report.join("\n");
}

/**
 * Extract actionable information from an error for UI display
 * @param error Shift API error
 * @returns UI-friendly error information
 */
export function extractErrorInfo(error: ShiftApiError): {
  title: string;
  message: string;
  action?: string;
  canRetry: boolean;
  isCritical: boolean;
} {
  return {
    title: getErrorTitle(error.error_code),
    message: ShiftErrorHandler.getUserFriendlyMessage(error),
    action: ShiftErrorHandler.getSuggestedAction(error) || undefined,
    canRetry: ShiftErrorHandler.isRecoverable(error),
    isCritical: ShiftErrorHandler.isCritical(error),
  };
}

/**
 * Get a user-friendly error title based on error code
 * @param errorCode Error code
 * @returns User-friendly title
 */
function getErrorTitle(errorCode: string): string {
  switch (errorCode) {
    case ERROR_CODES.SHIFT_VALIDATION_FAILED:
      return "Active Shift Detected";
    case ERROR_CODES.CASH_CONTINUITY_ERROR:
      return "Cash Amount Mismatch";
    case ERROR_CODES.INVENTORY_VARIANCE_ERROR:
      return "Inventory Discrepancy";
    case ERROR_CODES.INVALID_TIMESTAMP:
      return "Invalid Time";
    case ERROR_CODES.NEGATIVE_AMOUNT:
      return "Invalid Amount";
    case ERROR_CODES.MISSING_COMMENTS:
      return "Comments Required";
    case ERROR_CODES.PRODUCT_NOT_FOUND:
      return "Product Not Found";
    case ERROR_CODES.DUPLICATE_COUNT:
      return "Duplicate Count";
    case "NETWORK_ERROR":
      return "Connection Error";
    case "UNAUTHORIZED":
      return "Session Expired";
    case "FORBIDDEN":
      return "Access Denied";
    default:
      return "Operation Failed";
  }
}
