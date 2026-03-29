/**
 * Inventory Management Service for Shift Operations
 * Handles inventory counting, variance tracking, and product management during shifts
 */

import api from "../api";
import { HOSPITALITY_ENDPOINTS } from "../endpoints.hospitality";
import {
  InventoryCountRequest,
  InventoryCountResponse,
  GetInventoryRequest,
  GetInventoryResponse,
  StoreProduct,
  ProductCount,
  InventoryVariance,
  VARIANCE_TYPES,
  ERROR_CODES,
} from "../types/shift";

/**
 * Service for managing inventory operations during shifts
 * Includes opening/closing counts, variance tracking, and product searches
 */
class InventoryManagementService {

  // ============================================================================
  // INVENTORY COUNTING OPERATIONS
  // ============================================================================

  /**
   * Record opening inventory count at shift start
   * @param data Opening inventory data with product counts
   * @returns Variance analysis and flagged products
   */
  async recordOpeningCount(data: InventoryCountRequest): Promise<InventoryCountResponse> {
    try {
      console.log("[InventoryService] Recording opening inventory count:", {
        shift_id: data.shift_id,
        user_id: data.user_id,
        product_count: data.products.length,
      });

      this.validateInventoryRequest(data, "opening");

      const { data: response } = await api.post<InventoryCountResponse>(HOSPITALITY_ENDPOINTS.INVENTORY.OPEN, {
        user_id: data.user_id,
        shift_id: data.shift_id,
        products: data.products.map(this.formatProductForApi),
        comments: data.comments || "Opening inventory count",
      });

      console.log("[InventoryService] Opening count recorded:", {
        variances_detected: response.data.variances_detected,
        flagged_count: response.data.flagged_products.length,
        requires_approval: response.data.requires_approval,
      });

      // Log variance details if any
      if (response.data.variances_detected) {
        this.logVarianceDetails("Opening", response.data.flagged_products);
      }

      return response;
    } catch (error: any) {
      console.error("[InventoryService] Error recording opening count:", error);
      throw this.handleInventoryError(error, "opening count");
    }
  }

  /**
   * Record closing inventory count at shift end
   * @param data Closing inventory data with product counts
   * @returns Variance analysis and flagged products
   */
  async recordClosingCount(data: InventoryCountRequest): Promise<InventoryCountResponse> {
    try {
      console.log("[InventoryService] Recording closing inventory count:", {
        shift_id: data.shift_id,
        user_id: data.user_id,
        product_count: data.products.length,
      });

      this.validateInventoryRequest(data, "closing");

      const { data: response } = await api.post<InventoryCountResponse>(HOSPITALITY_ENDPOINTS.INVENTORY.CLOSE, {
        user_id: data.user_id,
        shift_id: data.shift_id,
        products: data.products.map(this.formatProductForApi),
        comments: data.comments || "Closing inventory count",
      });

      console.log("[InventoryService] Closing count recorded:", {
        variances_detected: response.data.variances_detected,
        flagged_count: response.data.flagged_products.length,
        requires_approval: response.data.requires_approval,
      });

      // Log variance details if any
      if (response.data.variances_detected) {
        this.logVarianceDetails("Closing", response.data.flagged_products);
      }

      return response;
    } catch (error: any) {
      console.error("[InventoryService] Error recording closing count:", error);
      throw this.handleInventoryError(error, "closing count");
    }
  }

  // ============================================================================
  // PRODUCT RETRIEVAL OPERATIONS
  // ============================================================================

  /**
   * Get all store products for inventory counting
   * @param params Optional filters and pagination
   * @returns List of store products with current quantities
   */
  async getStoreProducts(params: GetInventoryRequest = {}): Promise<GetInventoryResponse> {
    try {
      console.log("[InventoryService] Getting store products:", params);

      const queryParams = this.buildInventoryQueryParams(params);
      const url = `${HOSPITALITY_ENDPOINTS.INVENTORY.BASE}${queryParams ? `?${queryParams}` : ""}`;

      const { data: response } = await api.get<GetInventoryResponse>(url);

      console.log("[InventoryService] Store products retrieved:", {
        product_count: response.data.length,
        total_value: response.total_inventory_value,
        has_pagination: !!response.pagination,
      });

      return response;
    } catch (error: any) {
      console.error("[InventoryService] Error getting store products:", error);
      throw this.handleInventoryError(error, "product retrieval");
    }
  }

  /**
   * Search for specific products by name or SKU
   * @param searchTerm Search query
   * @param params Additional search parameters
   * @returns Filtered list of products
   */
  async searchProducts(
    searchTerm: string, 
    params: Omit<GetInventoryRequest, 'search'> = {}
  ): Promise<GetInventoryResponse> {
    try {
      console.log("[InventoryService] Searching products:", {
        searchTerm,
        limit: params.limit,
      });

      if (!searchTerm.trim()) {
        throw new Error("Search term cannot be empty");
      }

      const searchParams: GetInventoryRequest = {
        ...params,
        search: searchTerm.trim(),
        limit: params.limit || 50, // Default limit for searches
      };

      return await this.getStoreProducts(searchParams);
    } catch (error: any) {
      console.error("[InventoryService] Error searching products:", error);
      throw this.handleInventoryError(error, "product search");
    }
  }

  /**
   * Get products with low stock for priority counting
   * @param threshold Stock threshold (default: 10)
   * @param params Additional parameters
   * @returns Products with stock below threshold
   */
  async getLowStockProducts(
    threshold: number = 10, 
    params: GetInventoryRequest = {}
  ): Promise<StoreProduct[]> {
    try {
      console.log("[InventoryService] Getting low stock products with threshold:", threshold);

      // Get all products without pagination to filter locally
      const response = await this.getStoreProducts({
        ...params,
        no_pagination: true,
      });

      const lowStockProducts = response.data.filter(
        product => product.qty_on_hand <= threshold
      );

      console.log("[InventoryService] Low stock products found:", {
        total_products: response.data.length,
        low_stock_count: lowStockProducts.length,
        threshold,
      });

      return lowStockProducts;
    } catch (error: any) {
      console.error("[InventoryService] Error getting low stock products:", error);
      throw this.handleInventoryError(error, "low stock retrieval");
    }
  }

  // ============================================================================
  // VARIANCE ANALYSIS
  // ============================================================================

  /**
   * Analyze inventory variances for a given set of counts
   * @param expectedCounts Expected product quantities
   * @param actualCounts Actual counted quantities
   * @returns Variance analysis results
   */
  analyzeVariances(
    expectedCounts: Array<{ product_id: number; quantity: number }>,
    actualCounts: Array<{ product_id: number; quantity: number }>
  ): InventoryVariance[] {
    try {
      console.log("[InventoryService] Analyzing variances:", {
        expected_count: expectedCounts.length,
        actual_count: actualCounts.length,
      });

      const variances: InventoryVariance[] = [];

      // Create maps for efficient lookup
      const expectedMap = new Map(
        expectedCounts.map(item => [item.product_id, item.quantity])
      );
      const actualMap = new Map(
        actualCounts.map(item => [item.product_id, item.quantity])
      );

      // Get all unique product IDs
      const allProductIds = new Set([
        ...expectedCounts.map(item => item.product_id),
        ...actualCounts.map(item => item.product_id),
      ]);

      for (const productId of allProductIds) {
        const expected = expectedMap.get(productId) || 0;
        const actual = actualMap.get(productId) || 0;
        const variance = actual - expected;

        if (variance !== 0) {
          variances.push({
            product_id: productId,
            expected_qty: expected,
            actual_qty: actual,
            variance,
            variance_type: variance < 0 ? 
              VARIANCE_TYPES.INVENTORY_SHORTAGE : 
              VARIANCE_TYPES.INVENTORY_OVERAGE,
          });
        }
      }

      console.log("[InventoryService] Variance analysis complete:", {
        total_variances: variances.length,
        shortages: variances.filter(v => v.variance < 0).length,
        overages: variances.filter(v => v.variance > 0).length,
      });

      return variances;
    } catch (error: any) {
      console.error("[InventoryService] Error analyzing variances:", error);
      throw new Error(`Variance analysis failed: ${error.message}`);
    }
  }

  /**
   * Calculate total variance value based on product prices
   * @param variances List of inventory variances
   * @param products Product details with prices
   * @returns Total monetary value of variances
   */
  calculateVarianceValue(
    variances: InventoryVariance[],
    products: StoreProduct[]
  ): { totalValue: number; shortageValue: number; overageValue: number } {
    try {
      const productPriceMap = new Map(
        products.map(p => [p.product_id, p.price])
      );

      let totalValue = 0;
      let shortageValue = 0;
      let overageValue = 0;

      for (const variance of variances) {
        const price = productPriceMap.get(variance.product_id) || 0;
        const value = Math.abs(variance.variance) * price;
        
        totalValue += value;
        
        if (variance.variance < 0) {
          shortageValue += value;
        } else {
          overageValue += value;
        }
      }

      console.log("[InventoryService] Variance value calculated:", {
        totalValue,
        shortageValue,
        overageValue,
        variance_count: variances.length,
      });

      return { totalValue, shortageValue, overageValue };
    } catch (error: any) {
      console.error("[InventoryService] Error calculating variance value:", error);
      throw new Error(`Variance value calculation failed: ${error.message}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private buildInventoryQueryParams(params: GetInventoryRequest): string {
    const queryParams = new URLSearchParams();
    
    if (params.user_id) queryParams.append("user_id", params.user_id.toString());
    if (params.store_id) queryParams.append("store_id", params.store_id.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", Math.min(params.limit, 100).toString()); // Max 100
    if (params.no_pagination) queryParams.append("no_pagination", "true");

    return queryParams.toString();
  }

  private formatProductForApi(product: ProductCount) {
    return {
      product_id: product.product_id,
      ...(product.expected_qty !== undefined && { expected_qty: product.expected_qty }),
      actual_qty: product.actual_qty,
      ...(product.comments && { comments: product.comments }),
    };
  }

  private validateInventoryRequest(data: InventoryCountRequest, type: "opening" | "closing"): void {
    if (!data.user_id) {
      throw new Error("User ID is required for inventory counting");
    }
    
    if (!data.shift_id) {
      throw new Error("Shift ID is required for inventory counting");
    }
    
    if (!Array.isArray(data.products) || data.products.length === 0) {
      throw new Error("Products array is required and cannot be empty");
    }

    // Validate each product
    data.products.forEach((product, index) => {
      if (!product.product_id || product.product_id <= 0) {
        throw new Error(`Invalid product ID at index ${index}`);
      }
      
      if (product.actual_qty === undefined || product.actual_qty === null) {
        throw new Error(`Actual quantity is required for product at index ${index}`);
      }
      
      if (product.actual_qty < 0) {
        throw new Error(`Actual quantity cannot be negative for product at index ${index}`);
      }

      // For closing counts, expected_qty should be provided
      if (type === "closing" && (product.expected_qty === undefined || product.expected_qty === null)) {
        console.warn(`Expected quantity not provided for product ${product.product_id} in closing count`);
      }
    });
  }

  private logVarianceDetails(type: string, variances: InventoryVariance[]): void {
    console.log(`[InventoryService] ${type} inventory variances detected:`);
    
    variances.forEach((variance, index) => {
      console.log(`  ${index + 1}. Product ${variance.product_id}: ${variance.variance} units (${variance.variance_type})`);
    });

    const shortages = variances.filter(v => v.variance < 0);
    const overages = variances.filter(v => v.variance > 0);
    
    console.log(`[InventoryService] ${type} variance summary:`, {
      total_variances: variances.length,
      shortages: shortages.length,
      overages: overages.length,
      total_shortage_units: shortages.reduce((sum, v) => sum + Math.abs(v.variance), 0),
      total_overage_units: overages.reduce((sum, v) => sum + v.variance, 0),
    });
  }

  private handleInventoryError(error: any, operation: string): Error {
    // Extract meaningful error information
    const message = error.response?.data?.message || 
                   error.message || 
                   `${operation} operation failed`;
    
    const errorCode = error.response?.data?.error_code || ERROR_CODES.INVENTORY_VARIANCE_ERROR;
    
    console.error(`[InventoryService] ${operation} error:`, {
      message,
      errorCode,
      originalError: error.message,
    });

    // Create structured error
    const structuredError: any = new Error(message);
    structuredError.error_code = errorCode;
    structuredError.operation = operation;
    
    // Add specific error data if available
    if (error.response?.data) {
      const errorData = error.response.data;
      if (errorData.variances) structuredError.variances = errorData.variances;
      if (errorData.flagged_products) structuredError.flagged_products = errorData.flagged_products;
      if (errorData.suggested_action) structuredError.suggested_action = errorData.suggested_action;
    }

    return structuredError;
  }
}

// Export singleton instance
export const inventoryManagementService = new InventoryManagementService();
