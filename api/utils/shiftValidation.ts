/**
 * Validation utilities for shift management operations
 * Provides comprehensive validation for shift and inventory operations
 */

import {
  OpenShiftRequest,
  CloseShiftRequest,
  InventoryCountRequest,
  ProductCount,
  ERROR_CODES,
} from "../types/shift";

// ============================================================================
// VALIDATION ERROR CLASS
// ============================================================================

export class ShiftValidationError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly details?: any;

  constructor(message: string, code: string = "VALIDATION_ERROR", field?: string, details?: any) {
    super(message);
    this.name = "ShiftValidationError";
    this.code = code;
    this.field = field;
    this.details = details;
  }
}

// ============================================================================
// SHIFT VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate open shift request data
 * @param data Open shift request data
 * @throws ShiftValidationError if validation fails
 */
export function validateOpenShiftRequest(data: OpenShiftRequest): void {
  // User ID validation
  if (!data.user_id) {
    throw new ShiftValidationError(
      "User ID is required", 
      ERROR_CODES.MISSING_COMMENTS, 
      "user_id"
    );
  }

  if (typeof data.user_id !== "number" || data.user_id <= 0) {
    throw new ShiftValidationError(
      "User ID must be a positive number", 
      ERROR_CODES.INVALID_TIMESTAMP, 
      "user_id"
    );
  }

  // Staff ID validation
  if (!data.staff_id) {
    throw new ShiftValidationError(
      "Staff ID is required", 
      ERROR_CODES.MISSING_COMMENTS, 
      "staff_id"
    );
  }

  if (typeof data.staff_id !== "string" || data.staff_id.trim().length === 0) {
    throw new ShiftValidationError(
      "Staff ID must be a non-empty string", 
      ERROR_CODES.MISSING_COMMENTS, 
      "staff_id"
    );
  }

  // Date/time validation
  if (!data.date_time) {
    throw new ShiftValidationError(
      "Date/time is required", 
      ERROR_CODES.INVALID_TIMESTAMP, 
      "date_time"
    );
  }

  if (!isValidISODateTime(data.date_time)) {
    throw new ShiftValidationError(
      "Date/time must be in valid ISO format", 
      ERROR_CODES.INVALID_TIMESTAMP, 
      "date_time"
    );
  }

  // Validate timestamp is not too far in past or future (24 hours)
  const shiftTime = new Date(data.date_time);
  const now = new Date();
  const timeDiff = Math.abs(shiftTime.getTime() - now.getTime());
  const maxDiff = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  if (timeDiff > maxDiff) {
    throw new ShiftValidationError(
      "Shift time cannot be more than 24 hours in the past or future", 
      ERROR_CODES.INVALID_TIMESTAMP, 
      "date_time",
      { provided: data.date_time, maxHours: 24 }
    );
  }

  // Starting cash validation
  if (data.starting_cash === undefined || data.starting_cash === null) {
    throw new ShiftValidationError(
      "Starting cash amount is required", 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      "starting_cash"
    );
  }

  if (typeof data.starting_cash !== "number") {
    throw new ShiftValidationError(
      "Starting cash must be a number", 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      "starting_cash"
    );
  }

  if (data.starting_cash < 0) {
    throw new ShiftValidationError(
      "Starting cash cannot be negative", 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      "starting_cash"
    );
  }

  // Comments validation (optional but if provided, should not be too long)
  if (data.comments && data.comments.length > 500) {
    throw new ShiftValidationError(
      "Comments cannot exceed 500 characters", 
      ERROR_CODES.MISSING_COMMENTS, 
      "comments",
      { maxLength: 500, provided: data.comments.length }
    );
  }
}

/**
 * Validate close shift request data
 * @param data Close shift request data
 * @throws ShiftValidationError if validation fails
 */
export function validateCloseShiftRequest(data: CloseShiftRequest): void {
  // User ID validation
  if (!data.user_id) {
    throw new ShiftValidationError(
      "User ID is required", 
      ERROR_CODES.MISSING_COMMENTS, 
      "user_id"
    );
  }

  if (typeof data.user_id !== "number" || data.user_id <= 0) {
    throw new ShiftValidationError(
      "User ID must be a positive number", 
      ERROR_CODES.INVALID_TIMESTAMP, 
      "user_id"
    );
  }

  // Shift ID validation
  if (!data.shift_id) {
    throw new ShiftValidationError(
      "Shift ID is required", 
      ERROR_CODES.MISSING_COMMENTS, 
      "shift_id"
    );
  }

  if (typeof data.shift_id !== "number" || data.shift_id <= 0) {
    throw new ShiftValidationError(
      "Shift ID must be a positive number", 
      ERROR_CODES.INVALID_TIMESTAMP, 
      "shift_id"
    );
  }

  // Closing cash validation
  if (data.closing_cash === undefined || data.closing_cash === null) {
    throw new ShiftValidationError(
      "Closing cash amount is required", 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      "closing_cash"
    );
  }

  if (typeof data.closing_cash !== "number") {
    throw new ShiftValidationError(
      "Closing cash must be a number", 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      "closing_cash"
    );
  }

  if (data.closing_cash < 0) {
    throw new ShiftValidationError(
      "Closing cash cannot be negative", 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      "closing_cash"
    );
  }

  // Comments validation (optional but if provided, should not be too long)
  if (data.comments && data.comments.length > 500) {
    throw new ShiftValidationError(
      "Comments cannot exceed 500 characters", 
      ERROR_CODES.MISSING_COMMENTS, 
      "comments",
      { maxLength: 500, provided: data.comments.length }
    );
  }
}

// ============================================================================
// INVENTORY VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate inventory count request data
 * @param data Inventory count request data
 * @param type Type of inventory count (opening or closing)
 * @throws ShiftValidationError if validation fails
 */
export function validateInventoryCountRequest(
  data: InventoryCountRequest, 
  type: "opening" | "closing" = "opening"
): void {
  // User ID validation
  if (!data.user_id) {
    throw new ShiftValidationError(
      "User ID is required for inventory counting", 
      ERROR_CODES.MISSING_COMMENTS, 
      "user_id"
    );
  }

  if (typeof data.user_id !== "number" || data.user_id <= 0) {
    throw new ShiftValidationError(
      "User ID must be a positive number", 
      ERROR_CODES.INVALID_TIMESTAMP, 
      "user_id"
    );
  }

  // Shift ID validation
  if (!data.shift_id) {
    throw new ShiftValidationError(
      "Shift ID is required for inventory counting", 
      ERROR_CODES.MISSING_COMMENTS, 
      "shift_id"
    );
  }

  if (typeof data.shift_id !== "number" || data.shift_id <= 0) {
    throw new ShiftValidationError(
      "Shift ID must be a positive number", 
      ERROR_CODES.INVALID_TIMESTAMP, 
      "shift_id"
    );
  }

  // Products validation
  if (!Array.isArray(data.products)) {
    throw new ShiftValidationError(
      "Products must be an array", 
      ERROR_CODES.PRODUCT_NOT_FOUND, 
      "products"
    );
  }

  if (data.products.length === 0) {
    throw new ShiftValidationError(
      "Products array cannot be empty", 
      ERROR_CODES.PRODUCT_NOT_FOUND, 
      "products"
    );
  }

  if (data.products.length > 1000) {
    throw new ShiftValidationError(
      "Cannot process more than 1000 products at once", 
      ERROR_CODES.PRODUCT_NOT_FOUND, 
      "products",
      { maxProducts: 1000, provided: data.products.length }
    );
  }

  // Validate each product
  data.products.forEach((product, index) => {
    validateProductCount(product, index, type);
  });

  // Comments validation
  if (data.comments && data.comments.length > 1000) {
    throw new ShiftValidationError(
      "Comments cannot exceed 1000 characters", 
      ERROR_CODES.MISSING_COMMENTS, 
      "comments",
      { maxLength: 1000, provided: data.comments.length }
    );
  }
}

/**
 * Validate individual product count data
 * @param product Product count data
 * @param index Index in the products array (for error reporting)
 * @param type Type of inventory count
 * @throws ShiftValidationError if validation fails
 */
export function validateProductCount(
  product: ProductCount, 
  index: number, 
  type: "opening" | "closing" = "opening"
): void {
  // Product ID validation
  if (!product.product_id) {
    throw new ShiftValidationError(
      `Product ID is required for product at index ${index}`, 
      ERROR_CODES.PRODUCT_NOT_FOUND, 
      `products[${index}].product_id`
    );
  }

  if (typeof product.product_id !== "number" || product.product_id <= 0) {
    throw new ShiftValidationError(
      `Product ID must be a positive number for product at index ${index}`, 
      ERROR_CODES.PRODUCT_NOT_FOUND, 
      `products[${index}].product_id`
    );
  }

  // Actual quantity validation
  if (product.actual_qty === undefined || product.actual_qty === null) {
    throw new ShiftValidationError(
      `Actual quantity is required for product at index ${index}`, 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      `products[${index}].actual_qty`
    );
  }

  if (typeof product.actual_qty !== "number") {
    throw new ShiftValidationError(
      `Actual quantity must be a number for product at index ${index}`, 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      `products[${index}].actual_qty`
    );
  }

  if (product.actual_qty < 0) {
    throw new ShiftValidationError(
      `Actual quantity cannot be negative for product at index ${index}`, 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      `products[${index}].actual_qty`
    );
  }

  // Expected quantity validation (mainly for closing counts)
  if (product.expected_qty !== undefined) {
    if (typeof product.expected_qty !== "number") {
      throw new ShiftValidationError(
        `Expected quantity must be a number for product at index ${index}`, 
        ERROR_CODES.NEGATIVE_AMOUNT, 
        `products[${index}].expected_qty`
      );
    }

    if (product.expected_qty < 0) {
      throw new ShiftValidationError(
        `Expected quantity cannot be negative for product at index ${index}`, 
        ERROR_CODES.NEGATIVE_AMOUNT, 
        `products[${index}].expected_qty`
      );
    }
  }

  // For closing counts, warn if expected quantity is not provided
  if (type === "closing" && (product.expected_qty === undefined || product.expected_qty === null)) {
    console.warn(
      `[Validation] Expected quantity not provided for product ${product.product_id} in closing count. ` +
      "This may affect variance calculations."
    );
  }

  // Comments validation
  if (product.comments && product.comments.length > 250) {
    throw new ShiftValidationError(
      `Product comments cannot exceed 250 characters for product at index ${index}`, 
      ERROR_CODES.MISSING_COMMENTS, 
      `products[${index}].comments`,
      { maxLength: 250, provided: product.comments.length }
    );
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a string is a valid ISO 8601 datetime
 * @param dateString Date string to validate
 * @returns True if valid ISO datetime
 */
function isValidISODateTime(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date instanceof Date && 
           !isNaN(date.getTime()) && 
           date.toISOString() === dateString;
  } catch {
    return false;
  }
}

/**
 * Validate that a number is within acceptable range
 * @param value Number to validate
 * @param min Minimum acceptable value
 * @param max Maximum acceptable value
 * @param fieldName Field name for error reporting
 * @throws ShiftValidationError if out of range
 */
export function validateNumberRange(
  value: number, 
  min: number, 
  max: number, 
  fieldName: string
): void {
  if (value < min || value > max) {
    throw new ShiftValidationError(
      `${fieldName} must be between ${min} and ${max}`, 
      ERROR_CODES.NEGATIVE_AMOUNT, 
      fieldName,
      { min, max, provided: value }
    );
  }
}

/**
 * Validate that a string meets length requirements
 * @param value String to validate
 * @param minLength Minimum length
 * @param maxLength Maximum length
 * @param fieldName Field name for error reporting
 * @param required Whether the field is required
 * @throws ShiftValidationError if validation fails
 */
export function validateStringLength(
  value: string | undefined, 
  minLength: number, 
  maxLength: number, 
  fieldName: string,
  required: boolean = false
): void {
  if (required && (!value || value.trim().length === 0)) {
    throw new ShiftValidationError(
      `${fieldName} is required`, 
      ERROR_CODES.MISSING_COMMENTS, 
      fieldName
    );
  }

  if (value) {
    const trimmedLength = value.trim().length;
    if (trimmedLength < minLength || trimmedLength > maxLength) {
      throw new ShiftValidationError(
        `${fieldName} must be between ${minLength} and ${maxLength} characters`, 
        ERROR_CODES.MISSING_COMMENTS, 
        fieldName,
        { minLength, maxLength, provided: trimmedLength }
      );
    }
  }
}

/**
 * Check if two cash amounts are within acceptable tolerance
 * @param expected Expected cash amount
 * @param actual Actual cash amount
 * @param tolerance Acceptable difference (default: 0.01)
 * @returns True if within tolerance
 */
export function isCashAmountValid(
  expected: number, 
  actual: number, 
  tolerance: number = 0.01
): boolean {
  return Math.abs(expected - actual) <= tolerance;
}

/**
 * Sanitize comments by removing unwanted characters and limiting length
 * @param comments Raw comments string
 * @param maxLength Maximum allowed length
 * @returns Sanitized comments
 */
export function sanitizeComments(comments: string | undefined, maxLength: number = 500): string {
  if (!comments) return "";
  
  // Remove potentially harmful characters and excessive whitespace
  return comments
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim()
    .substring(0, maxLength);
}
