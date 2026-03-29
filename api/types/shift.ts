/**
 * Shift Management API Types
 * Based on the Frontliner Guide API documentation
 */

// ============================================================================
// BASE RESPONSE TYPES
// ============================================================================

export interface BaseApiResponse {
  status: "success" | "error";
  timestamp: string;
  requestId: string;
}

export interface SuccessResponse<T = any> extends BaseApiResponse {
  status: "success";
  data?: T;
}

export interface ErrorResponse extends BaseApiResponse {
  status: "error";
  message: string;
  error_code?: string;
  path?: string;
}

// ============================================================================
// SHIFT TYPES
// ============================================================================

export interface ShiftData {
  shift_id: number;
  user_id: number;
  store_id: number;
  store_name: string;
  staff_id: string;
  staff_name: string;
  start_time: string; // Unix timestamp as string
  end_time?: string; // Unix timestamp as string
  starting_cash: number;
  ending_cash?: number;
  status: "OPEN" | "CLOSED" | "APPROVED" | "PENDING" | "FLAGGED";
  comments?: string;
  closing_comments?: string;
  organization_id: number;
  duration_hours?: number;
}

export interface ActiveShift extends ShiftData {
  status: "OPEN";
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface CanStartShiftRequest {
  user_id?: number; // Optional - defaults to authenticated user
}

export interface OpenShiftRequest {
  user_id: number;
  staff_id: string;
  date_time: string; // ISO format
  starting_cash: number;
  comments?: string;
}

export interface CloseShiftRequest {
  user_id: number;
  shift_id: number;
  closing_cash: number;
  comments?: string;
}

export interface GetActiveShiftRequest {
  user_id?: number; // Optional - defaults to authenticated user
}

export interface GetShiftRequest {
  shift_id: number;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface CanStartShiftResponse extends BaseApiResponse {
  can_start: boolean;
  reason?: string;
  active_shift?: ActiveShift | null;
  suggested_action?: string;
}

export interface OpenShiftResponse extends SuccessResponse<ShiftData> {
  data: ShiftData;
}

export interface CloseShiftResponse extends SuccessResponse<ShiftData> {
  data: ShiftData;
}

export interface GetActiveShiftResponse extends BaseApiResponse {
  has_active_shift: boolean;
  active_shift: ActiveShift | null;
}

export interface GetShiftResponse extends SuccessResponse<ShiftData> {
  data: ShiftData;
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export interface ProductCount {
  product_id: number;
  expected_qty?: number; // Auto-calculated for closing
  actual_qty: number;
  comments?: string;
}

export interface InventoryCountRequest {
  user_id: number;
  shift_id: number;
  products: ProductCount[];
  comments?: string;
}

export interface InventoryVariance {
  product_id: number;
  expected_qty: number;
  actual_qty: number;
  variance: number;
  variance_type: "INVENTORY_SHORTAGE" | "INVENTORY_OVERAGE";
}

export interface InventoryCountResponse extends SuccessResponse {
  data: {
    shift_id: number;
    variances_detected: boolean;
    flagged_products: InventoryVariance[];
    requires_approval: boolean;
  };
}

export interface StoreProduct {
  product_id: number;
  item_name: string;
  category: string;
  qty_on_hand: number;
  price: number;
  wholesale_price?: number | null;
  sku: string;
  image_url: string;
  updated_at: string;
}

export interface GetInventoryRequest {
  user_id?: number;
  store_id?: number;
  search?: string;
  page?: number;
  limit?: number;
  no_pagination?: boolean;
}

export interface GetSalesByShiftRequest {
  shift_id: number;
  page?: number;
  limit?: number;
}

export interface GetInventoryResponse extends SuccessResponse {
  data: StoreProduct[];
  results: number;
  total_inventory_value: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface SaleItem {
  product_name: string;
  category: string;
  quantity: number;
  unit_price: number;
}

export interface ShiftSale {
  sales_id: number;
  created_date: string;
  consumer_id: number;
  fullname: string;
  total_amount: number;
  payment_type: "CASH" | "CARD" | "OTHER";
  status: "COMPLETED" | "PENDING" | "CANCELLED" | "REFUNDED";
  shift_id: number;
  user_id: number;
  region_name: string;
  store_name: string;
  items: SaleItem[];
}

export interface SalesSummary {
  total_sales: number;
  total_transactions: number;
  cash_sales: number;
  card_sales: number;
  average_transaction: number;
}

export interface GetSalesByShiftResponse extends SuccessResponse {
  data: ShiftSale[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  summary: SalesSummary;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ShiftValidationError extends ErrorResponse {
  error_code: "SHIFT_VALIDATION_FAILED";
  active_shift: {
    shift_id: number;
    start_time: string;
  };
  suggested_action: string;
}

export interface CashContinuityError extends ErrorResponse {
  error_code: "CASH_CONTINUITY_ERROR";
  expected_amount: number;
  provided_amount: number;
}

export interface InventoryVarianceError extends ErrorResponse {
  error_code: "INVENTORY_VARIANCE_ERROR";
  variances: InventoryVariance[];
}

// ============================================================================
// UNION TYPES FOR ERROR HANDLING
// ============================================================================

export type ShiftApiError = 
  | ShiftValidationError 
  | CashContinuityError 
  | InventoryVarianceError 
  | ErrorResponse;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ShiftStatus = "OPEN" | "CLOSED" | "APPROVED" | "PENDING" | "FLAGGED";

export interface ShiftWorkflow {
  canStart: boolean;
  activeShift: ActiveShift | null;
  nextAction: "START_SHIFT" | "CLOSE_SHIFT" | "WAIT_FOR_APPROVAL" | "NONE";
  reason?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SHIFT_STATUS = {
  OPEN: "OPEN" as const,
  CLOSED: "CLOSED" as const,
  APPROVED: "APPROVED" as const,
  PENDING: "PENDING" as const,
  FLAGGED: "FLAGGED" as const,
} as const;

export const ERROR_CODES = {
  SHIFT_VALIDATION_FAILED: "SHIFT_VALIDATION_FAILED" as const,
  CASH_CONTINUITY_ERROR: "CASH_CONTINUITY_ERROR" as const,
  INVALID_TIMESTAMP: "INVALID_TIMESTAMP" as const,
  NEGATIVE_AMOUNT: "NEGATIVE_AMOUNT" as const,
  MISSING_COMMENTS: "MISSING_COMMENTS" as const,
  INVENTORY_VARIANCE_ERROR: "INVENTORY_VARIANCE_ERROR" as const,
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND" as const,
  DUPLICATE_COUNT: "DUPLICATE_COUNT" as const,
} as const;

export const VARIANCE_TYPES = {
  INVENTORY_SHORTAGE: "INVENTORY_SHORTAGE" as const,
  INVENTORY_OVERAGE: "INVENTORY_OVERAGE" as const,
} as const;
