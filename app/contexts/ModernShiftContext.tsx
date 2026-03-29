/**
 * Modern Shift Context using Hospitality Shift & Reports Services
 * Provides shift-scoped sales data via the hospitality reports API.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { ShiftAPI } from "@/api/services";
import reportsService from "@/api/services/reportsService";

interface ShiftSalesSummary {
  totalRevenue: number;
  totalChecks: number;
  averageCheck: number;
  totalTips: number;
  coverCount: number;
}

interface ModernShiftContextType {
  salesSummary: ShiftSalesSummary | null;
  isLoading: boolean;
  error: string | null;
  refreshSales: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

const ModernShiftContext = createContext<ModernShiftContextType | undefined>(undefined);

export const useModernShift = () => {
  const context = useContext(ModernShiftContext);
  if (!context) {
    throw new Error("useModernShift must be used within a ModernShiftProvider");
  }
  return context;
};

export const ModernShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [salesSummary, setSalesSummary] = useState<ShiftSalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  const clearError = useCallback(() => setError(null), []);

  const loadShiftSales = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      clearError();

      const performance = await reportsService.getWaiterCurrentShift();
      const data = performance?.data ?? performance;

      const summary: ShiftSalesSummary = {
        totalRevenue: data?.totalRevenue ?? 0,
        totalChecks: data?.totalChecks ?? 0,
        averageCheck: data?.avgCheckAmount ?? 0,
        totalTips: data?.totalTips ?? 0,
        coverCount: data?.totalCovers ?? 0,
      };

      setSalesSummary(summary);
      await AsyncStorage.setItem("salesSummary", JSON.stringify(summary));
    } catch (err: any) {
      console.error("[ModernShiftContext] Error loading shift sales:", err);
      setError(err.message || "Failed to load sales data");
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const refreshSales = useCallback(async (): Promise<void> => {
    await loadShiftSales();
  }, [loadShiftSales]);

  const refreshData = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    try {
      const activeShift = await ShiftAPI.getActiveShift({ user_id: Number(user.id) });

      if (activeShift?.has_active_shift) {
        await loadShiftSales();
      } else {
        setSalesSummary(null);
      }
    } catch (err) {
      console.error("[ModernShiftContext] Error during refreshData:", err);
    }
  }, [user?.id, loadShiftSales]);

  useEffect(() => {
    if (user?.id) {
      refreshData();
    } else {
      setSalesSummary(null);
    }
  }, [user?.id, refreshData]);

  return (
    <ModernShiftContext.Provider
      value={{ salesSummary, isLoading, error, refreshSales, refreshData, clearError }}
    >
      {children}
    </ModernShiftContext.Provider>
  );
};

export default ModernShiftContext;
