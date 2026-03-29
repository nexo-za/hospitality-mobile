import * as React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ShiftAPI } from "@/api/services";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentStaff } from "@/contexts/StaffSessionContext";

export interface InventoryItem {
  productId: string;
  productName: string;
  expectedCount: number;
  actualCount: number;
  discrepancy: number;
  category: string;
  product_id?: number;
  item_name?: string;
  qty_on_hand?: number;
  sku?: string;
  variant?: string;
}

export interface CashTransaction {
  id: string;
  amount: number;
  type: "add" | "remove";
  timestamp: string;
  note?: string;
  staffId?: string;
}

export interface StaffSale {
  staffId: string;
  amount: number;
  paymentMethod: "cash" | "card" | "other";
  timestamp: string;
}

export interface Shift {
  id: string | number;
  userId: number;
  storeId: number;
  startTime: string;
  endTime?: string;
  startCash: number;
  endCash?: number;
  cashTransactions: CashTransaction[];
  inventory: InventoryItem[];
  salesTotal: number;
  cashSales: number;
  cardSales: number;
  otherSales: number;
  transactionCount: number;
  comments?: string;
  status: "active" | "completed" | "flagged";
  staffId: string;
  staffName: string;
  activeStaff: {
    staffId: string;
    userId: number;
    name: string;
    joinTime: string;
  }[];
  staffSales: StaffSale[];
}

interface ShiftContextType {
  currentShift: Shift | null;
  shiftHistory: Shift[];
  isShiftActive: boolean;
  startShift: (
    cash: number,
    inventory: InventoryItem[],
    notes: string,
    shiftId: string | number
  ) => Promise<void>;
  joinShift: (
    staffId: string,
    staffName: string,
    userId: number
  ) => Promise<void>;
  leaveShift: (staffId: string, reason?: string) => Promise<void>;
  endShift: (data: {
    userId: number;
    shiftId: number;
    dateTime: string;
    payouts: number;
    closingCash: number;
    comments?: string;
    attachments?: any;
    flagCash?: boolean;
  }) => Promise<Shift>;
  addCashTransaction: (
    amount: number,
    type: "add" | "remove",
    note?: string
  ) => Promise<void>;
  recordSale: (
    amount: number,
    paymentMethod: "cash" | "card" | "other"
  ) => Promise<void>;
  getShiftHistory: () => Promise<Shift[]>;
  getSalesByStaff: (staffId: string) => {
    totalSales: number;
    cashSales: number;
    cardSales: number;
    otherSales: number;
    transactionCount: number;
    lastSaleTime: string | null;
  };
  isLoading: boolean;
  isInitialized: boolean;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const useShift = () => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error("useShift must be used within a ShiftProvider");
  }
  return context;
};

export const ShiftProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode => {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  // Add auth validation effect
  useEffect(() => {
    const validateAuthState = async () => {
      // Add a small delay to ensure authentication state is fully initialized
      if (isInitialized && currentShift) {
        // Wait for user data to stabilize
        if (!user) {
          console.log(
            "[ShiftContext] User data not yet available, waiting before validation"
          );
          // Do nothing and wait for user to load
          return;
        }

        // If user exists but doesn't have an ID, there might be an issue
        if (!user.id) {
          console.warn(
            "[ShiftContext] User data found but missing ID - giving time for data to load"
          );

          // Give more time for auth state to stabilize before taking drastic action
          return;
        }

        console.log(
          "[ShiftContext] Auth validation successful - user ID exists:",
          user.id
        );
      }
    };

    validateAuthState();
  }, [user, currentShift, isInitialized, logout, router]);

  // Initialize shift data from AsyncStorage
  useEffect(() => {
    const initializeShiftData = async () => {
      try {
        console.log("[ShiftContext] Initializing shift data from AsyncStorage");
        setIsLoading(true);

        // Load current shift
        const shiftData = await AsyncStorage.getItem("currentShift");
        console.log(
          "[ShiftContext] Retrieved shift data:",
          shiftData ? "Found" : "Not Found"
        );

        if (shiftData) {
          try {
            const parsedShift = JSON.parse(shiftData);
            console.log(
              `[ShiftContext] Parsed shift with ID: ${parsedShift.id}`
            );
            setCurrentShift(parsedShift);
          } catch (parseError) {
            console.error(
              "[ShiftContext] Error parsing shift data:",
              parseError
            );
          }
        }

        // Load shift history
        const historyData = await AsyncStorage.getItem("shiftHistory");
        console.log(
          "[ShiftContext] Retrieved shift history:",
          historyData ? "Found" : "Not Found"
        );

        if (historyData) {
          try {
            const parsedHistory = JSON.parse(historyData);
            console.log(
              `[ShiftContext] Parsed shift history with ${parsedHistory.length} items`
            );
            setShiftHistory(parsedHistory);
          } catch (parseError) {
            console.error(
              "[ShiftContext] Error parsing shift history:",
              parseError
            );
          }
        }

        setIsInitialized(true);
        console.log("[ShiftContext] Shift data initialization complete");
      } catch (error) {
        // Error handling without console.log
      } finally {
        setIsLoading(false);
      }
    };

    initializeShiftData();
  }, []);

  // Hydrate local currentShift from server if server shows active shift but local is empty
  useEffect(() => {
    const hydrateFromServerIfNeeded = async () => {
      try {
        if (!isInitialized) return;
        if (currentShift) return; // already set
        if (!user?.id) return;

        const resp = await ShiftAPI.getActiveShift({ user_id: Number(user.id) });
        const has = Boolean(resp?.has_active_shift && resp.active_shift);
        if (!has) return;

        const s: any = resp.active_shift || {};
        // Map API payload to local Shift shape with safe fallbacks
        const storeId = Number(
          s.store_id ?? (user as any)?.store_id ?? (user as any)?.storeId ?? 0
        );
        const startTimeIso = (() => {
          const t = s.start_time;
          const n = typeof t === "string" ? Number(t) : typeof t === "number" ? t : undefined;
          return n && !isNaN(n) ? new Date(n).toISOString() : new Date().toISOString();
        })();

        const staffId = getCurrentStaff()?.staffId || (user as any)?.staffId || String(user.id);
        const staffName = s.staff_name || getCurrentStaff()?.displayName || (user as any)?.username || "Staff";

        const hydrated: Shift = {
          id: s.shift_id ?? 0,
          userId: Number(user.id),
          storeId: storeId || Number(user.id),
          startTime: startTimeIso,
          startCash: typeof s.starting_cash === "number" ? s.starting_cash : 0,
          cashTransactions: [],
          inventory: [],
          salesTotal: 0,
          cashSales: 0,
          cardSales: 0,
          otherSales: 0,
          transactionCount: 0,
          status: "active",
          comments: s.comments || "",
          staffId,
          staffName,
          activeStaff: [
            {
              staffId,
              userId: Number(user.id),
              name: staffName,
              joinTime: startTimeIso,
            },
          ],
          staffSales: [],
        };

        try {
          await AsyncStorage.setItem("currentShift", JSON.stringify(hydrated));
        } catch {}
        setCurrentShift(hydrated);
        console.log("[ShiftContext] Hydrated local currentShift from server active shift", {
          id: hydrated.id,
          storeId: hydrated.storeId,
        });
      } catch (e) {
        // Silent fail; sales screen will still gate on server check
      }
    };

    hydrateFromServerIfNeeded();
  }, [isInitialized, currentShift, user?.id]);

  // Save current shift to AsyncStorage whenever it changes
  useEffect(() => {
    const saveCurrentShift = async () => {
      try {
        if (isInitialized && currentShift) {
          console.log(
            `[ShiftContext] Persisting shift to AsyncStorage with ID: ${currentShift.id}`
          );

          // Serialize the data with proper error handling
          let shiftDataString;
          try {
            shiftDataString = JSON.stringify(currentShift);
          } catch (serializeError) {
            console.error(
              "[ShiftContext] Error serializing shift data:",
              serializeError
            );
            console.error(
              "[ShiftContext] Problematic shift data:",
              JSON.stringify({
                id: currentShift.id,
                userId: currentShift.userId,
                startTime: currentShift.startTime,
                // Include other essential fields but omit potentially problematic ones
              })
            );
            return;
          }

          // Ensure we have a valid string before saving
          if (!shiftDataString) {
            console.error("[ShiftContext] Failed to serialize shift data");
            return;
          }

          // Save to AsyncStorage with proper await
          try {
            await AsyncStorage.setItem("currentShift", shiftDataString);
            console.log(
              `[ShiftContext] Successfully saved shift data to AsyncStorage`
            );
          } catch (storageError) {
            console.error("[ShiftContext] AsyncStorage error:", storageError);
            return;
          }

          // Verify what was stored by reading it back
          try {
            const storedShiftData = await AsyncStorage.getItem("currentShift");
            if (storedShiftData) {
              const parsedShift = JSON.parse(storedShiftData);
              console.log(
                `[ShiftContext] Verified persisted shift ID: ${
                  parsedShift.id
                } (type: ${typeof parsedShift.id})`
              );
            } else {
              console.error(
                "[ShiftContext] Verification failed - no data retrieved from storage"
              );
            }
          } catch (verifyError) {
            console.error(
              "[ShiftContext] Error verifying persisted shift:",
              verifyError
            );
          }
        } else if (isInitialized) {
          console.log(
            "[ShiftContext] No shift to persist (currentShift is null)"
          );
        }
      } catch (error) {
        console.error(
          "[ShiftContext] Unexpected error in saveCurrentShift:",
          error
        );
      }
    };

    saveCurrentShift();
  }, [currentShift, isInitialized]);

  // Save shift history to AsyncStorage whenever it changes
  useEffect(() => {
    const saveShiftHistory = async () => {
      try {
        if (isInitialized) {
          console.log(
            `[ShiftContext] Persisting shift history with ${shiftHistory.length} items`
          );

          // Serialize the data with proper error handling
          let historyDataString;
          try {
            historyDataString = JSON.stringify(shiftHistory);
          } catch (serializeError) {
            console.error(
              "[ShiftContext] Error serializing shift history:",
              serializeError
            );
            return;
          }

          // Ensure we have a valid string before saving
          if (!historyDataString) {
            console.error("[ShiftContext] Failed to serialize shift history");
            return;
          }

          // Save to AsyncStorage with proper await
          try {
            await AsyncStorage.setItem("shiftHistory", historyDataString);
            console.log(
              `[ShiftContext] Successfully saved shift history with ${shiftHistory.length} items`
            );
          } catch (storageError) {
            console.error(
              "[ShiftContext] AsyncStorage error saving history:",
              storageError
            );
          }

          // Optionally verify the saved data
          try {
            const storedHistory = await AsyncStorage.getItem("shiftHistory");
            if (storedHistory) {
              const parsedHistory = JSON.parse(storedHistory);
              console.log(
                `[ShiftContext] Verified persisted history with ${parsedHistory.length} items`
              );
            } else {
              console.error(
                "[ShiftContext] Verification failed - no history data retrieved from storage"
              );
            }
          } catch (verifyError) {
            console.error(
              "[ShiftContext] Error verifying persisted history:",
              verifyError
            );
          }
        }
      } catch (error) {
        console.error(
          "[ShiftContext] Unexpected error in saveShiftHistory:",
          error
        );
      }
    };

    saveShiftHistory();
  }, [shiftHistory, isInitialized]);

  // Add effect to monitor currentShift changes
  useEffect(() => {
    // When currentShift changes, log it
    if (currentShift) {
      console.log(
        `[ShiftContext] Current shift state updated with ID: ${currentShift.id}`
      );
      console.log(
        `[ShiftContext] Shift details: startCash=${currentShift.startCash}, time=${currentShift.startTime}`
      );
    } else {
      console.log(`[ShiftContext] Current shift is null`);
    }
  }, [currentShift]);

  // Start shift creates a placeholder in local state
  // The actual server ID will be set by StartShiftScreen after API calls
  const startShift = async (
    cash: number,
    inventory: InventoryItem[],
    notes: string,
    shiftId: string | number
  ): Promise<void> => {
    try {
      console.log("[ShiftContext] startShift parameters:", {
        cash,
        inventoryLength: inventory?.length || 0,
        notesLength: notes?.length || 0,
        shiftId: shiftId || "none",
      });
      setIsLoading(true);

      // Use the backend-provided shift ID if available, otherwise generate a local one
      let safeShiftId;

      if (shiftId) {
        safeShiftId = shiftId;
        console.log(
          `[ShiftContext] Using backend-provided shift ID: ${safeShiftId}`
        );
      } else {
        // Generate a unique ID that's compatible with INT4 in the database
        // Max value for 32-bit signed int is 2,147,483,647
        // Use a smaller number to ensure we're well within bounds
        const randomComponent = Math.floor(Math.random() * 10000);
        const timeComponent = Math.floor(Date.now() % 100000000); // Get last 8 digits of timestamp
        const newShiftId = timeComponent * 10000 + randomComponent; // Combine for uniqueness

        // Double-check that our ID is within INT4 bounds
        safeShiftId = Math.min(newShiftId, 2000000000); // Stay safely under INT4 max
        console.log(
          `[ShiftContext] No backend ID provided, generated local shift ID: ${safeShiftId} (INT4 compatible)`
        );
      }

      // Get the user ID - first try from currentStaff, then fall back to logged-in user
      const currentStaff = getCurrentStaff();

      // FIXED: Always use the main authenticated user (store owner) for userId
      // This ensures consistency with the business logic where the main user owns the store
      const userId = Number(user?.id || 0);

      // Ensure we have a valid user ID
      if (!userId) {
        throw new Error(
          "Cannot start shift: User is not authenticated or has invalid ID"
        );
      }
      if (!shiftId) {
        console.warn(
          "[ShiftContext] Warning: No backend shift ID provided, using placeholder 0"
        );
      }

      // Safety check for invalid inventory
      const validatedInventory = Array.isArray(inventory) ? inventory : [];
      if (validatedInventory.length === 0) {
        console.warn("[ShiftContext] Warning: Empty inventory array");
      } else {
        console.log(
          "[ShiftContext] First inventory item:",
          JSON.stringify(validatedInventory[0])
        );
      }

      // Use userId as storeId if not explicitly provided
      const storeId = currentStaff?.storeId
        ? Number(currentStaff.storeId)
        : userId;

      // Get staff information for multi-tenancy
      let staffId = currentStaff?.staffId || user?.staffId || "";
      let staffName = "";

      // If we have currentStaff, use their display name
      if (currentStaff?.displayName) {
        staffName = currentStaff.displayName;
      }
      // Otherwise fall back to user data
      else if (user?.firstName && user?.lastName) {
        staffName = `${user.firstName} ${user.lastName}`;
      } else if (user?.username) {
        staffName = user.username;
      } else {
        staffName = `Staff ${userId}`;
      }

      console.log(
        `[ShiftContext] Starting shift for user ID: ${userId}, staff ID: ${staffId}, store ID: ${storeId}, using shift ID: ${safeShiftId}`
      );

      // Create a new shift object with the backend ID if provided, or a placeholder
      const newShift: Shift = {
        id: safeShiftId,
        userId: userId, // Use consistent userId from above
        storeId: userId, // Use userId as storeId since store owner = main user
        startTime: new Date().toISOString(),
        startCash:
          typeof cash === "number" ? cash : parseFloat(String(cash)) || 0,
        cashTransactions: [],
        inventory: validatedInventory,
        salesTotal: 0,
        cashSales: 0,
        cardSales: 0,
        otherSales: 0,
        transactionCount: 0,
        status: "active",
        comments: notes || "",

        // Add multi-tenancy support
        staffId: staffId,
        staffName: staffName,
        activeStaff: [
          {
            staffId,
            userId, // Always use the store owner ID, not individual staff userId
            name: staffName,
            joinTime: new Date().toISOString(),
          },
        ],
        staffSales: [],
      };

      console.log(
        `[ShiftContext] Created shift object with ID: ${
          newShift.id
        }, backend ID: ${shiftId || "not provided"}`
      );

      // Instead of relying on the state update right away, let's first save to AsyncStorage
      try {
        const shiftString = JSON.stringify(newShift);
        console.log("[ShiftContext] Syncing shift to AsyncStorage first");
        await AsyncStorage.setItem("currentShift", shiftString);
        console.log("[ShiftContext] Shift synced to AsyncStorage successfully");
      } catch (storageError) {
        console.error(
          "[ShiftContext] Failed to sync shift to AsyncStorage:",
          storageError
        );
      }

      // Now update the React state
      console.log("[ShiftContext] Updating React state with new shift");
      setCurrentShift(newShift);

      console.log(
        `[ShiftContext] State update initiated - verification will happen through useEffect`
      );

      // Return early, allowing React state update to happen naturally
      return;
    } catch (error) {
      console.error(`[ShiftContext] Error in startShift:`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const endShift = async (data: {
    userId: number;
    shiftId: number;
    dateTime: string;
    payouts: number;
    closingCash: number;
    comments?: string;
    attachments?: any;
    flagCash?: boolean;
  }) => {
    try {
      if (!currentShift) {
        throw new Error("No active shift to end");
      }

      setIsLoading(true);

      // Call the API to properly close the shift (final step in the workflow)
      try {
        // FIXED: Always use the store owner's userId from the current shift
        // This ensures consistency with the business logic where the shift belongs to the store owner
        const userId = currentShift.userId; // Use shift's userId (store owner), not data.userId

        // Convert to the format expected by the backend API
        const closeShiftRequest = {
          shift_id: data.shiftId,
          user_id: userId, // Always use store owner's userId
          shift_close_date: data.dateTime,
          date_time: data.dateTime,
          payouts: Number(data.payouts || 0),
          closing_cash: Number(data.closingCash || 0),
          flag_cash: !!data.flagCash, // Ensure it's a boolean
          comments: data.comments || "",
          staff_id: user?.staffId || `STAFF_${userId}`,
          store_id: currentShift.storeId || userId,
          attachments: data.attachments || [],
        };

        const closeShiftResponse = await ShiftAPI.closeShift({
          user_id: closeShiftRequest.user_id,
          shift_id: closeShiftRequest.shift_id,
          closing_cash: closeShiftRequest.closing_cash,
          comments: closeShiftRequest.comments,
        });

        // Check for success in a more flexible way
        // The API can have different response formats
        const isSuccess =
          closeShiftResponse && (closeShiftResponse as any).status === "success";

        if (!isSuccess) {
          // Log the actual response for debugging
          console.error(
            "Unexpected API response format:",
            JSON.stringify(closeShiftResponse)
          );
          const anyResp: any = closeShiftResponse as any;
          const errMsg = anyResp?.message || anyResp?.data?.message || "Failed to close shift";
          throw new Error(errMsg);
        }

        console.log(
          "API shift close successful:",
          JSON.stringify(closeShiftResponse)
        );
      } catch (apiError: any) {
        console.error("API error closing shift:", apiError);
        throw new Error(
          `Failed to close shift in API: ${
            apiError.message || String(apiError)
          }`
        );
      }

      // Update the current shift with end data
      const updatedShift: Shift = {
        ...currentShift,
        userId: currentShift.userId, // Keep the original shift's userId (store owner)
        storeId: currentShift.storeId, // Keep the original shift's storeId
        endTime: data.dateTime,
        endCash: data.closingCash,
        status: data.flagCash ? "flagged" : "completed", // Update local status to match API
        comments: data.comments,
      };

      // Add to shift history
      setShiftHistory((prev) => [...prev, updatedShift]);

      // Clear current shift
      setCurrentShift(null);

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        "shiftHistory",
        JSON.stringify([...shiftHistory, updatedShift])
      );
      await AsyncStorage.removeItem("currentShift");

      return updatedShift;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const addCashTransaction = async (
    amount: number,
    type: "add" | "remove",
    note?: string
  ) => {
    try {
      if (!currentShift) {
        throw new Error("No active shift");
      }

      const newTransaction: CashTransaction = {
        id: `trans_${Date.now()}`,
        amount,
        type,
        timestamp: new Date().toISOString(),
        note,
      };

      setCurrentShift((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          cashTransactions: [...prev.cashTransactions, newTransaction],
        };
      });
    } catch (error) {
      throw error;
    }
  };

  const recordSale = async (
    amount: number,
    paymentMethod: "cash" | "card" | "other"
  ) => {
    try {
      if (!currentShift) {
        throw new Error("No active shift");
      }

      // Get the current staff making the sale
      const staffMember = getCurrentStaff();
      const staffId = staffMember?.staffId || currentShift.staffId;

      // Create a new staff sale record
      const newSale: StaffSale = {
        staffId,
        amount,
        paymentMethod,
        timestamp: new Date().toISOString(),
      };

      setCurrentShift((prev) => {
        if (!prev) return null;

        // Add to staff sales array
        const updatedStaffSales = [...(prev.staffSales || []), newSale];

        return {
          ...prev,
          salesTotal: prev.salesTotal + amount,
          cashSales:
            paymentMethod === "cash" ? prev.cashSales + amount : prev.cashSales,
          cardSales:
            paymentMethod === "card" ? prev.cardSales + amount : prev.cardSales,
          otherSales:
            paymentMethod === "other"
              ? prev.otherSales + amount
              : prev.otherSales,
          transactionCount: prev.transactionCount + 1,
          staffSales: updatedStaffSales,
        };
      });
    } catch (error: any) {
      throw error;
    }
  };

  const getSalesByStaff = (staffId: string) => {
    if (!currentShift || !currentShift.staffSales) {
      return {
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        otherSales: 0,
        transactionCount: 0,
        lastSaleTime: null,
      };
    }

    // Filter sales for this staff member
    const staffSales = currentShift.staffSales.filter(
      (sale) => sale.staffId === staffId
    );

    if (staffSales.length === 0) {
      return {
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        otherSales: 0,
        transactionCount: 0,
        lastSaleTime: null,
      };
    }

    // Calculate totals
    const totalSales = staffSales.reduce((sum, sale) => sum + sale.amount, 0);
    const cashSales = staffSales
      .filter((sale) => sale.paymentMethod === "cash")
      .reduce((sum, sale) => sum + sale.amount, 0);
    const cardSales = staffSales
      .filter((sale) => sale.paymentMethod === "card")
      .reduce((sum, sale) => sum + sale.amount, 0);
    const otherSales = staffSales
      .filter((sale) => sale.paymentMethod === "other")
      .reduce((sum, sale) => sum + sale.amount, 0);

    // Find the last sale time
    const timestamps = staffSales.map((sale) =>
      new Date(sale.timestamp).getTime()
    );
    const lastSaleTime =
      timestamps.length > 0
        ? new Date(Math.max(...timestamps)).toISOString()
        : null;

    return {
      totalSales,
      cashSales,
      cardSales,
      otherSales,
      transactionCount: staffSales.length,
      lastSaleTime,
    };
  };

  const getShiftHistory = async () => {
    return shiftHistory;
  };

  const isShiftActive = Boolean(currentShift);

  const joinShift = async (
    staffId: string,
    staffName: string,
    userId: number // NOTE: This parameter is ignored - we always use store owner's userId
  ) => {
    try {
      setIsLoading(true);

      if (!currentShift) {
        throw new Error("No active shift to join");
      }

      // Check if this staff is already in the shift
      const isStaffAlreadyJoined = currentShift.activeStaff?.some(
        (staff) => staff.staffId === staffId
      );

      if (isStaffAlreadyJoined) {
        console.log(`[ShiftContext] Staff ${staffId} is already in the shift`);
        return;
      }

      // FIXED: Always use the store owner's userId instead of individual staff userId
      // This maintains consistency with the business logic where all staff belong to the same store
      // Note: The userId parameter is ignored to maintain business logic consistency
      const storeOwnerUserId = currentShift.userId; // Use the shift's userId (store owner)

      // Create a new activeStaff entry
      const newActiveStaff = {
        staffId,
        userId: storeOwnerUserId, // Always use store owner's userId, not individual staff userId
        name: staffName,
        joinTime: new Date().toISOString(),
      };

      // Create updated shift object with the new staff member
      const updatedShift: Shift = {
        ...currentShift,
        activeStaff: [...(currentShift.activeStaff || []), newActiveStaff],
      };

      console.log(
        `[ShiftContext] Staff ${staffId} (${staffName}) has joined shift ${currentShift.id} under store owner userId: ${storeOwnerUserId} (ignoring passed userId: ${userId})`
      );

      // Update the current shift
      setCurrentShift(updatedShift);

      return;
    } catch (error) {
      console.error("[ShiftContext] Error joining shift:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const leaveShift = async (staffId: string, reason?: string) => {
    try {
      setIsLoading(true);

      if (!currentShift) {
        throw new Error("No active shift to leave");
      }

      // Find the staff member in active staff
      const staffIndex = currentShift.activeStaff?.findIndex(
        (staff) => staff.staffId === staffId
      );

      if (staffIndex === -1 || staffIndex === undefined) {
        console.log(
          `[ShiftContext] Staff ${staffId} is not in the active shift`
        );
        return;
      }

      // Get the current active staff list
      const updatedActiveStaff = [...currentShift.activeStaff];

      // Mark the staff as inactive by removing them from the active list
      updatedActiveStaff.splice(staffIndex, 1);

      console.log(
        `[ShiftContext] Staff ${staffId} has left shift ${currentShift.id}`
      );

      // Create updated shift object with the staff member removed
      const updatedShift: Shift = {
        ...currentShift,
        activeStaff: updatedActiveStaff,
      };

      // Update the current shift
      setCurrentShift(updatedShift);

      return;
    } catch (error) {
      console.error("[ShiftContext] Error leaving shift:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentShift,
    shiftHistory,
    isShiftActive,
    startShift,
    joinShift,
    leaveShift,
    endShift,
    addCashTransaction,
    recordSale,
    getShiftHistory,
    getSalesByStaff,
    isLoading,
    isInitialized,
  };

  return (
    <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
  );
};

// Add default export
export default ShiftContext;
