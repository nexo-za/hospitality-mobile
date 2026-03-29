/**
 * Comprehensive Shift Management Service
 * Routes all shift operations through the hospitality API (/shifts/*).
 */

import api from "../api";
import { HOSPITALITY_ENDPOINTS } from "../endpoints.hospitality";
import {
  CanStartShiftRequest,
  OpenShiftRequest,
  CloseShiftRequest,
  GetActiveShiftRequest,
  GetShiftRequest,
  InventoryCountRequest,
  GetInventoryRequest,
  GetSalesByShiftRequest,
  CanStartShiftResponse,
  OpenShiftResponse,
  CloseShiftResponse,
  GetActiveShiftResponse,
  GetShiftResponse,
  InventoryCountResponse,
  GetInventoryResponse,
  GetSalesByShiftResponse,
  ShiftData,
  ActiveShift,
  ShiftWorkflow,
} from "../types/shift";

/**
 * Comprehensive Shift Management Service
 * Handles all shift-related operations according to the API specification
 */
class ShiftManagementService {
  
  // ============================================================================
  // SHIFT VALIDATION & STATUS
  // ============================================================================

  /**
   * Check if the authenticated user can start a new shift.
   * Derived from the active-shift check — if there is already an open shift the
   * user cannot start another one.
   */
  async canStartShift(params: CanStartShiftRequest = {}): Promise<CanStartShiftResponse> {
    try {
      console.log("[ShiftService] Checking if user can start shift:", params);

      const activeResp = await this.getActiveShift(params);

      const normalized: CanStartShiftResponse = {
        status: "success",
        timestamp: new Date().toISOString(),
        requestId: "",
        can_start: !activeResp.has_active_shift,
        reason: activeResp.has_active_shift
          ? "You already have an active shift. Close it before starting a new one."
          : undefined,
        active_shift: activeResp.active_shift,
        suggested_action: activeResp.has_active_shift ? "CLOSE_SHIFT" : "START_SHIFT",
      };

      console.log("[ShiftService] Can start shift result:", {
        can_start: normalized.can_start,
        reason: normalized.reason,
      });

      return normalized;
    } catch (error: any) {
      console.error("[ShiftService] Error checking if user can start shift:", error);
      throw this.handleShiftError(error);
    }
  }

  /**
   * Get the currently active shift for the authenticated user.
   * Uses the hospitality endpoint GET /shifts/active.
   */
  async getActiveShift(params: GetActiveShiftRequest = {}): Promise<GetActiveShiftResponse> {
    try {
      console.log("[ShiftService] Getting active shift:", params);

      const queryParams = new URLSearchParams();
      if (params.user_id) {
        queryParams.append("user_id", params.user_id.toString());
      }

      const { data: response } = await api.get<any>(
        HOSPITALITY_ENDPOINTS.SHIFTS.ACTIVE,
        { params: Object.fromEntries(queryParams) }
      );

      // The hospitality API wraps data in { status, data: { ... } }.
      // Support both the new camelCase shape (hasActiveShift / shift) and the
      // legacy snake_case shape (has_active_shift / active_shift) so the service
      // stays forward- and backward-compatible.
      const payload = response?.data ?? response;

      const rawShift = payload?.shift ?? payload?.active_shift ?? null;
      const hasActive =
        Boolean(payload?.hasActiveShift) ||
        Boolean(payload?.has_active_shift) ||
        Boolean(rawShift);

      const activeShift = rawShift
        ? (this.normalizeShiftData(rawShift) as unknown as ActiveShift)
        : null;

      const normalized: GetActiveShiftResponse = {
        status: response?.status || "success",
        timestamp: response?.timestamp || new Date().toISOString(),
        requestId: response?.requestId || payload?.requestId || "",
        has_active_shift: hasActive,
        active_shift: activeShift,
      };

      console.log("[ShiftService] Active shift response:", {
        has_active_shift: normalized.has_active_shift,
        shift_id: normalized.active_shift?.shift_id,
        status: normalized.active_shift?.status,
      });

      return normalized;
    } catch (error: any) {
      console.error("[ShiftService] Error getting active shift:", error);
      throw this.handleShiftError(error);
    }
  }

  // ============================================================================
  // SHIFT OPERATIONS
  // ============================================================================

  /**
   * Open a new shift for the authenticated user.
   * Uses the hospitality endpoint POST /shifts/open.
   */
  async openShift(data: OpenShiftRequest): Promise<OpenShiftResponse> {
    try {
      console.log("[ShiftService] Opening shift:", {
        user_id: data.user_id,
        staff_id: data.staff_id,
        starting_cash: data.starting_cash,
        date_time: data.date_time,
      });

      this.validateOpenShiftRequest(data);

      const { data: response } = await api.post<any>(HOSPITALITY_ENDPOINTS.SHIFTS.OPEN, {
        user_id: data.user_id,
        staff_id: data.staff_id,
        date_time: data.date_time,
        starting_cash: data.starting_cash,
        comments: data.comments || "",
      });

      // Normalize: the hospitality backend may return the shift nested under
      // data.shift (new) or directly in data (legacy).
      const rawData = response?.data ?? response;
      const rawShift = rawData?.shift ?? rawData;
      const shiftData: ShiftData = this.normalizeShiftData(rawShift);

      const normalized: OpenShiftResponse = {
        status: response?.status || "success",
        timestamp: response?.timestamp || new Date().toISOString(),
        requestId: response?.requestId || "",
        data: shiftData,
      };

      console.log("[ShiftService] Shift opened successfully:", {
        shift_id: normalized.data.shift_id,
        store_name: normalized.data.store_name,
        starting_cash: normalized.data.starting_cash,
      });

      return normalized;
    } catch (error: any) {
      console.error("[ShiftService] Error opening shift:", error);
      throw this.handleShiftError(error);
    }
  }

  /**
   * Close an active shift.
   * Uses the hospitality endpoint POST /shifts/close-complete.
   */
  async closeShift(data: CloseShiftRequest): Promise<CloseShiftResponse> {
    try {
      console.log("[ShiftService] Closing shift:", {
        user_id: data.user_id,
        shift_id: data.shift_id,
        closing_cash: data.closing_cash,
      });

      this.validateCloseShiftRequest(data);

      const { data: response } = await api.post<any>(HOSPITALITY_ENDPOINTS.SHIFTS.CLOSE_COMPLETE, {
        user_id: data.user_id,
        shift_id: data.shift_id,
        closing_cash: data.closing_cash,
        comments: data.comments || "",
      });

      const rawData = response?.data ?? response;
      const rawShift = rawData?.shift ?? rawData;
      const shiftData: ShiftData = this.normalizeShiftData(rawShift);

      const normalized: CloseShiftResponse = {
        status: response?.status || "success",
        timestamp: response?.timestamp || new Date().toISOString(),
        requestId: response?.requestId || "",
        data: shiftData,
      };

      console.log("[ShiftService] Shift closed successfully:", {
        shift_id: normalized.data.shift_id,
        duration_hours: normalized.data.duration_hours,
        starting_cash: normalized.data.starting_cash,
        ending_cash: normalized.data.ending_cash,
      });

      return normalized;
    } catch (error: any) {
      console.error("[ShiftService] Error closing shift:", error);
      throw this.handleShiftError(error);
    }
  }

  /**
   * Get details of a specific shift by ID.
   * Uses the hospitality endpoint GET /shifts/:id.
   */
  async getShiftDetails(params: GetShiftRequest): Promise<GetShiftResponse> {
    try {
      console.log("[ShiftService] Getting shift details:", params);

      const { data: response } = await api.get<any>(HOSPITALITY_ENDPOINTS.SHIFTS.GET(params.shift_id));

      const rawData = response?.data ?? response;
      const rawShift = rawData?.shift ?? rawData;
      const shiftData: ShiftData = this.normalizeShiftData(rawShift);

      const normalized: GetShiftResponse = {
        status: response?.status || "success",
        timestamp: response?.timestamp || new Date().toISOString(),
        requestId: response?.requestId || "",
        data: shiftData,
      };

      console.log("[ShiftService] Shift details retrieved:", {
        shift_id: normalized.data.shift_id,
        status: normalized.data.status,
        staff_name: normalized.data.staff_name,
      });

      return normalized;
    } catch (error: any) {
      console.error("[ShiftService] Error getting shift details:", error);
      throw this.handleShiftError(error);
    }
  }

  // ============================================================================
  // RESPONSE NORMALIZATION
  // ============================================================================

  /**
   * Normalizes a raw shift object from the hospitality API (camelCase) or the
   * legacy retail API (snake_case) into the canonical ShiftData shape used
   * throughout the app.
   */
  private normalizeShiftData(raw: any): ShiftData {
    if (!raw) return {} as ShiftData;

    return {
      // Prefer snake_case (legacy) fields; fall back to camelCase (hospitality)
      shift_id:       raw.shift_id      ?? raw.id                ?? 0,
      user_id:        raw.user_id       ?? raw.userId            ?? 0,
      store_id:       raw.store_id      ?? raw.storeId           ?? 0,
      store_name:     raw.store_name    ?? raw.storeName         ?? "",
      staff_id:       raw.staff_id      ?? raw.staffId           ?? "",
      staff_name:     raw.staff_name    ?? raw.staffName         ?? "",
      start_time:     raw.start_time    ?? raw.shiftStartDate    ?? raw.createdAt ?? "",
      end_time:       raw.end_time      ?? raw.shiftEndDate,
      starting_cash:  raw.starting_cash ?? raw.startingCash      ?? 0,
      ending_cash:    raw.ending_cash   ?? raw.endCash,
      status:         (raw.status as ShiftData["status"]) ?? "OPEN",
      comments:       raw.comments      ?? "",
      closing_comments: raw.closing_comments ?? raw.closingComments,
      organization_id: raw.organization_id ?? raw.organizationId ?? 0,
      duration_hours: raw.duration_hours ?? raw.durationHours,
    };
  }

  // ============================================================================
  // INVENTORY OPERATIONS
  // ============================================================================

  /**
   * Record opening inventory count during shift start
   * @param data Opening inventory count data
   * @returns Inventory count result with variance information
   */
  async recordOpeningInventory(data: InventoryCountRequest): Promise<InventoryCountResponse> {
    try {
      console.log("[ShiftService] Recording opening inventory:", {
        user_id: data.user_id,
        shift_id: data.shift_id,
        product_count: data.products.length,
      });

      // Validate inventory request
      this.validateInventoryRequest(data);

      const { data: response } = await api.post<InventoryCountResponse>(HOSPITALITY_ENDPOINTS.INVENTORY.OPEN, {
        user_id: data.user_id,
        shift_id: data.shift_id,
        products: data.products.map(product => ({
          product_id: product.product_id,
          actual_qty: product.actual_qty,
          comments: product.comments || "",
        })),
        comments: data.comments || "",
      });

      console.log("[ShiftService] Opening inventory recorded:", {
        variances_detected: response.data.variances_detected,
        flagged_products: response.data.flagged_products.length,
        requires_approval: response.data.requires_approval,
      });

      return response;
    } catch (error: any) {
      console.error("[ShiftService] Error recording opening inventory:", error);
      throw this.handleShiftError(error);
    }
  }

  /**
   * Record closing inventory count during shift end
   * @param data Closing inventory count data
   * @returns Inventory count result with variance information
   */
  async recordClosingInventory(data: InventoryCountRequest): Promise<InventoryCountResponse> {
    try {
      console.log("[ShiftService] Recording closing inventory:", {
        user_id: data.user_id,
        shift_id: data.shift_id,
        product_count: Array.isArray(data.products) ? data.products.length : 0,
      });

      // Validate inventory request
      this.validateInventoryRequest(data);

      const { data: response } = await api.post<InventoryCountResponse>(HOSPITALITY_ENDPOINTS.INVENTORY.CLOSE, {
        user_id: data.user_id,
        shift_id: data.shift_id,
        products: data.products.map(product => ({
          product_id: product.product_id,
          expected_qty: product.expected_qty,
          actual_qty: product.actual_qty,
          comments: product.comments || "",
        })),
        comments: data.comments || "",
      });

      // Backend now returns { status, data: { shift, flagged, flagReasons }, ... }
      const respAny: any = response as any;
      const flagged = respAny?.data?.flagged ?? respAny?.flagged ?? false;
      const flagReasons = respAny?.data?.flagReasons ?? respAny?.flagReasons ?? [];
      console.log("[ShiftService] Closing inventory recorded (normalized):", {
        flagged,
        flag_reason_count: Array.isArray(flagReasons) ? flagReasons.length : 0,
      });

      return response;
    } catch (error: any) {
      console.error("[ShiftService] Error recording closing inventory:", error);
      throw this.handleShiftError(error);
    }
  }

  /**
   * Get store inventory products for counting
   * @param params Inventory retrieval parameters
   * @returns Store products available for counting
   */
  async getStoreInventory(params: GetInventoryRequest = {}): Promise<GetInventoryResponse> {
    try {
      console.log("[ShiftService] Getting store inventory:", params);
      console.log("[ShiftService] Getting user id:", params.user_id);
      console.log("[ShiftService] Getting store id:", params.store_id);
      console.log("[ShiftService] Getting search:", params.search);
      console.log("[ShiftService] Getting page:", params.page);
      console.log("[ShiftService] Getting limit:", params.limit);
      console.log("[ShiftService] Getting no pagination:", params.no_pagination);

      const queryParams = new URLSearchParams();
      if (params.user_id) queryParams.append("user_id", params.user_id.toString());
      if (params.store_id) queryParams.append("store_id", params.store_id.toString());
      if (params.search) queryParams.append("search", params.search);
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());
      if (params.no_pagination) queryParams.append("no_pagination", params.no_pagination.toString());

      const { data: response } = await api.get<GetInventoryResponse>(
        HOSPITALITY_ENDPOINTS.INVENTORY.BASE,
        { params: Object.fromEntries(queryParams) }
      );

      console.log("[ShiftService] Store inventory retrieved:", {
        product_count: response.data.length,
        total_value: response.total_inventory_value,
        pagination: response.pagination,
      });

      return response;
    } catch (error: any) {
      console.error("[ShiftService] Error getting store inventory:", error);
      throw this.handleShiftError(error);
    }
  }

  // ============================================================================
  // SALES OPERATIONS
  // ============================================================================

  /**
   * Get sales for a specific shift
   * @param params Sales by shift parameters
   * @returns Sales data with pagination and summary
   */
  async getSalesByShift(params: GetSalesByShiftRequest): Promise<GetSalesByShiftResponse> {
    try {
      console.log("[ShiftService] Getting sales by shift:", params);

      const queryParams = new URLSearchParams();
      queryParams.append("shift_id", params.shift_id.toString());
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", Math.min(params.limit, 100).toString());

      const { data: response } = await api.get<GetSalesByShiftResponse>(
        HOSPITALITY_ENDPOINTS.SALES_BY_SHIFT,
        { params: Object.fromEntries(queryParams) }
      );

      console.log("[ShiftService] Sales by shift retrieved:", {
        shift_id: params.shift_id,
        sales_count: response.data.length,
        total_sales: response.summary.total_sales,
        total_transactions: response.summary.total_transactions,
      });

      return response;
    } catch (error: any) {
      console.error("[ShiftService] Error getting sales by shift:", error);
      throw this.handleShiftError(error);
    }
  }

  // ============================================================================
  // WORKFLOW HELPERS
  // ============================================================================

  /**
   * Get comprehensive shift workflow status for the user
   * @param userId User ID to check workflow for
   * @returns Current workflow state and next recommended action
   */
  async getShiftWorkflow(userId: number): Promise<ShiftWorkflow> {
    try {
      console.log("[ShiftService] Getting shift workflow for user:", userId);

      // Check if user can start a shift
      const canStartResponse = await this.canStartShift({ user_id: userId });
      
      // Get active shift if available
      const activeShiftResponse = await this.getActiveShift({ user_id: userId });

      const workflow: ShiftWorkflow = {
        canStart: canStartResponse.can_start,
        activeShift: activeShiftResponse.active_shift,
        nextAction: this.determineNextAction(canStartResponse, activeShiftResponse),
        reason: canStartResponse.reason,
      };

      console.log("[ShiftService] Shift workflow determined:", {
        canStart: workflow.canStart,
        hasActiveShift: !!workflow.activeShift,
        nextAction: workflow.nextAction,
      });

      return workflow;
    } catch (error: any) {
      console.error("[ShiftService] Error getting shift workflow:", error);
      throw this.handleShiftError(error);
    }
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  private validateOpenShiftRequest(data: OpenShiftRequest): void {
    if (!data.user_id) {
      throw new Error("User ID is required");
    }
    if (!data.staff_id) {
      throw new Error("Staff ID is required");
    }
    if (!data.date_time) {
      throw new Error("Date/time is required");
    }
    if (data.starting_cash === undefined || data.starting_cash === null) {
      throw new Error("Starting cash amount is required");
    }
    if (data.starting_cash < 0) {
      throw new Error("Starting cash cannot be negative");
    }
  }

  private validateCloseShiftRequest(data: CloseShiftRequest): void {
    if (!data.user_id) {
      throw new Error("User ID is required");
    }
    if (!data.shift_id) {
      throw new Error("Shift ID is required");
    }
    if (data.closing_cash === undefined || data.closing_cash === null) {
      throw new Error("Closing cash amount is required");
    }
    if (data.closing_cash < 0) {
      throw new Error("Closing cash cannot be negative");
    }
  }

  private validateInventoryRequest(data: InventoryCountRequest): void {
    if (!data.user_id) {
      throw new Error("User ID is required");
    }
    if (!data.shift_id) {
      throw new Error("Shift ID is required");
    }
    if (!Array.isArray(data.products) || data.products.length === 0) {
      throw new Error("Products array is required and cannot be empty");
    }
    
    data.products.forEach((product, index) => {
      if (!product.product_id) {
        throw new Error(`Product ID is required for product at index ${index}`);
      }
      if (product.actual_qty === undefined || product.actual_qty === null) {
        throw new Error(`Actual quantity is required for product at index ${index}`);
      }
      if (product.actual_qty < 0) {
        throw new Error(`Actual quantity cannot be negative for product at index ${index}`);
      }
    });
  }

  // ============================================================================
  // WORKFLOW LOGIC
  // ============================================================================

  private determineNextAction(
    canStartResponse: CanStartShiftResponse,
    activeShiftResponse: GetActiveShiftResponse
  ): ShiftWorkflow["nextAction"] {
    // If user has an active shift, they should close it
    if (activeShiftResponse.has_active_shift && activeShiftResponse.active_shift) {
      return "CLOSE_SHIFT";
    }

    // If user can start a shift, they should start one
    if (canStartResponse.can_start) {
      return "START_SHIFT";
    }

    // If there's a reason preventing start (e.g., approval needed)
    if (canStartResponse.reason) {
      return "WAIT_FOR_APPROVAL";
    }

    return "NONE";
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private handleShiftError(error: any): Error {
    // If it's already a structured error with error_code, pass it through
    if (error.error_code) {
      const err = new Error(error.message || "Shift API error");
      Object.assign(err, error);
      return err;
    }

    // If it's a response error, try to extract meaningful information
    if (error.response?.data) {
      const errorData = error.response.data;
      
      // Create a structured error based on the response
      const err = new Error(errorData.message || "Unknown error occurred");
      Object.assign(err, {
        error_code: errorData.error_code || "UNKNOWN_ERROR",
        status: "error",
        timestamp: new Date().toISOString(),
        requestId: errorData.requestId || "unknown",
        active_shift: errorData.active_shift,
        expected_amount: errorData.expected_amount,
        provided_amount: errorData.provided_amount,
        suggested_action: errorData.suggested_action,
      });

      return err;
    }

    // For other errors, wrap in a generic error structure
    return new Error(error.message || "An unexpected error occurred");
  }
}

// Export singleton instance
export const shiftManagementService = new ShiftManagementService();
