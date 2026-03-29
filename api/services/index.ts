/**
 * Shift Management Services Export Index
 * Provides centralized access to all shift-related services and utilities
 */

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

// New comprehensive shift management service
import { shiftManagementService } from "./shiftManagementService";
export { shiftManagementService };

// Inventory management service  
import { inventoryManagementService } from "./inventoryManagementService";
export { inventoryManagementService };

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Shift management types
export type {
  // Request types
  CanStartShiftRequest,
  OpenShiftRequest,
  CloseShiftRequest,
  GetActiveShiftRequest,
  GetShiftRequest,
  InventoryCountRequest,
  GetInventoryRequest,
  GetSalesByShiftRequest,
  
  // Response types
  CanStartShiftResponse,
  OpenShiftResponse,
  CloseShiftResponse,
  GetActiveShiftResponse,
  GetShiftResponse,
  InventoryCountResponse,
  GetInventoryResponse,
  GetSalesByShiftResponse,
  
  // Data types
  ShiftData,
  ActiveShift,
  ShiftWorkflow as ShiftWorkflowType,
  StoreProduct,
  ProductCount,
  InventoryVariance,
  ShiftSale,
  SaleItem,
  SalesSummary,
  
  // Error types
  ShiftApiError,
  ShiftValidationError,
  CashContinuityError,
  InventoryVarianceError,
  
  // Base types
  BaseApiResponse,
  SuccessResponse,
  ErrorResponse,
  
  // Utility types
  ShiftStatus,
} from "../types/shift";

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

// Validation utilities
export {
  validateOpenShiftRequest,
  validateCloseShiftRequest,
  validateInventoryCountRequest,
  validateProductCount,
  validateNumberRange,
  validateStringLength,
  isCashAmountValid,
  sanitizeComments,
  ShiftValidationError as ValidationError,
} from "../utils/shiftValidation";

// Error handling utilities
export {
  ShiftErrorHandler,
  logShiftError,
  createErrorReport,
  extractErrorInfo,
} from "../utils/shiftErrorHandler";

// ============================================================================
// CONSTANTS EXPORTS
// ============================================================================

export {
  SHIFT_STATUS,
  ERROR_CODES,
  VARIANCE_TYPES,
} from "../types/shift";

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Main shift management service instance
 * Use this for all new shift operations
 */
export const ShiftAPI = {
  // Shift operations
  canStartShift: shiftManagementService.canStartShift.bind(shiftManagementService),
  openShift: shiftManagementService.openShift.bind(shiftManagementService),
  closeShift: shiftManagementService.closeShift.bind(shiftManagementService),
  getActiveShift: shiftManagementService.getActiveShift.bind(shiftManagementService),
  getShiftDetails: shiftManagementService.getShiftDetails.bind(shiftManagementService),
  getShiftWorkflow: shiftManagementService.getShiftWorkflow.bind(shiftManagementService),
  
  // Inventory operations
  recordOpeningInventory: shiftManagementService.recordOpeningInventory.bind(shiftManagementService),
  recordClosingInventory: shiftManagementService.recordClosingInventory.bind(shiftManagementService),
  getStoreInventory: shiftManagementService.getStoreInventory.bind(shiftManagementService),
  
  // Sales operations
  getSalesByShift: shiftManagementService.getSalesByShift.bind(shiftManagementService),
};

/**
 * Inventory management service instance
 * Use this for detailed inventory operations
 */
export const InventoryAPI = {
  // Counting operations
  recordOpeningCount: inventoryManagementService.recordOpeningCount.bind(inventoryManagementService),
  recordClosingCount: inventoryManagementService.recordClosingCount.bind(inventoryManagementService),
  
  // Product operations
  getStoreProducts: inventoryManagementService.getStoreProducts.bind(inventoryManagementService),
  searchProducts: inventoryManagementService.searchProducts.bind(inventoryManagementService),
  getLowStockProducts: inventoryManagementService.getLowStockProducts.bind(inventoryManagementService),
  
  // Analysis operations
  analyzeVariances: inventoryManagementService.analyzeVariances.bind(inventoryManagementService),
  calculateVarianceValue: inventoryManagementService.calculateVarianceValue.bind(inventoryManagementService),
};



// ============================================================================
// WORKFLOW HELPERS
// ============================================================================

/**
 * Complete shift workflow helper
 * Provides high-level functions for common shift workflows
 */
export const ShiftWorkflow = {
  /**
   * Start a complete shift workflow (check, validate, and open)
   * @param userId User ID
   * @param staffId Staff ID
   * @param startingCash Starting cash amount
   * @param comments Optional comments
   * @returns Opened shift data
   */
  async startShift(
    userId: number, 
    staffId: string, 
    startingCash: number, 
    comments?: string
  ) {
    // Check if user can start shift
    const canStart = await shiftManagementService.canStartShift({ user_id: userId });
    
    if (!canStart.can_start) {
      throw new Error(canStart.reason || "Cannot start shift");
    }

    // Open the shift
    return await shiftManagementService.openShift({
      user_id: userId,
      staff_id: staffId,
      date_time: new Date().toISOString(),
      starting_cash: startingCash,
      comments,
    });
  },

  /**
   * Complete shift workflow (validate, close)
   * @param userId User ID
   * @param shiftId Shift ID
   * @param closingCash Closing cash amount
   * @param comments Optional comments
   * @returns Closed shift data
   */
  async endShift(
    userId: number, 
    shiftId: number, 
    closingCash: number, 
    comments?: string
  ) {
    // Get active shift to validate
    const activeShift = await shiftManagementService.getActiveShift({ user_id: userId });
    
    if (!activeShift.has_active_shift || !activeShift.active_shift) {
      throw new Error("No active shift found to close");
    }

    if (activeShift.active_shift.shift_id !== shiftId) {
      throw new Error("Shift ID does not match active shift");
    }

    // Close the shift
    return await shiftManagementService.closeShift({
      user_id: userId,
      shift_id: shiftId,
      closing_cash: closingCash,
      comments,
    });
  },

  /**
   * Get current shift status and recommended actions
   * @param userId User ID
   * @returns Current workflow state
   */
  async getStatus(userId: number) {
    return await shiftManagementService.getShiftWorkflow(userId);
  },
};
