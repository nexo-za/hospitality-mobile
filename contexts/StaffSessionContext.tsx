import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/utils/userService";
import { AccountInfo } from "@/src/types/apiTypes";
import { STORAGE_KEYS } from "@/utils/storage";

// Keys for storing multiple staff sessions
const ACTIVE_STAFF_KEY = "pos_active_staff";
const CURRENT_STAFF_KEY = "pos_current_staff";

// Global variable to store current staff for non-hook access
let globalCurrentStaff: StaffSession | null = null;

export interface StaffSession {
  staffId: string;
  userId: string | number;
  userName: string;
  displayName: string;
  role: string;
  storeId?: number | string;
  storeName?: string;
  lastActive: number; // timestamp
}

interface StaffSessionContextType {
  activeStaff: StaffSession[];
  currentStaff: StaffSession | null;
  isLoading: boolean;
  addStaffSession: (userData: User | AccountInfo) => Promise<void>;
  removeStaffSession: (staffId: string) => Promise<void>;
  switchToStaff: (staffId: string) => Promise<void>;
  clearAllSessions: () => Promise<void>;
  refreshSessions: () => Promise<void>;
}

const StaffSessionContext = createContext<StaffSessionContextType | undefined>(
  undefined
);

export const StaffSessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeStaff, setActiveStaff] = useState<StaffSession[]>([]);
  const [currentStaff, setCurrentStaff] = useState<StaffSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Update global staff reference when currentStaff changes
  useEffect(() => {
    globalCurrentStaff = currentStaff;
  }, [currentStaff]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      // Load active staff sessions
      const storedStaffJson = await AsyncStorage.getItem(ACTIVE_STAFF_KEY);
      const storedStaff = storedStaffJson ? JSON.parse(storedStaffJson) : [];
      setActiveStaff(storedStaff);

      // Load current active staff
      const currentStaffJson = await AsyncStorage.getItem(CURRENT_STAFF_KEY);
      if (currentStaffJson) {
        setCurrentStaff(JSON.parse(currentStaffJson));
      }
    } catch (error) {
      console.error("Error loading staff sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear sessions helper (used by logout flow)
  const clearSessions = async () => {
    try {
      setActiveStaff([]);
      setCurrentStaff(null);
      await AsyncStorage.removeItem(ACTIVE_STAFF_KEY);
      await AsyncStorage.removeItem(CURRENT_STAFF_KEY);
      globalCurrentStaff = null;
    } catch (e) {
      // ignore
    }
  };

  // Add a new staff session
  const addStaffSession = async (userData: User | AccountInfo) => {
    try {
      console.log("addStaffSession - Received userData:", userData);

      // Create a staff session object
      const staffId =
        "staff_id" in userData ? userData.staff_id : userData.staffId || "";

      if (!staffId) {
        throw new Error("Staff ID is required");
      }

      const userId =
        "user_id" in userData ? userData.user_id : userData.id || "";

      const firstName =
        "first_name" in userData
          ? userData.first_name
          : userData.firstName || "";

      const lastName =
        "last_name" in userData ? userData.last_name : userData.lastName || "";

      let userName = "";
      if ("username" in userData) {
        userName = userData.username;
      } else if ("userName" in userData) {
        userName = (userData as any).userName;
      }

      const displayName = `${firstName} ${lastName}`.trim() || userName;

      const role = userData.role;

      // Support both snake_case and camelCase for store identifiers
      const storeId = ((): number | string | "" => {
        const anyUser: any = userData as any;
        if (anyUser?.store_id != null) return anyUser.store_id;
        if (anyUser?.storeId != null) return anyUser.storeId;
        return "";
      })();

      const storeName = ((): string => {
        const anyUser: any = userData as any;
        if (typeof anyUser?.store_name === "string") return anyUser.store_name;
        if (typeof anyUser?.storeName === "string") return anyUser.storeName;
        return "";
      })();

      // Create session object
      const newSession: StaffSession = {
        staffId,
        userId,
        userName,
        displayName,
        role,
        storeId,
        storeName,
        lastActive: Date.now(),
      };

      console.log("addStaffSession - Created new session:", newSession);

      // Update active staff list
      const updatedStaff = [
        ...activeStaff.filter((s) => s.staffId !== staffId),
        newSession,
      ];
      setActiveStaff(updatedStaff);
      await AsyncStorage.setItem(
        ACTIVE_STAFF_KEY,
        JSON.stringify(updatedStaff)
      );
      console.log(
        `addStaffSession - Updated active staff list (${updatedStaff.length} staff members)`
      );

      // If no current staff is set, make this the current staff
      if (!currentStaff) {
        console.log(
          "addStaffSession - Setting as current staff (no current staff exists)"
        );
        setCurrentStaff(newSession);
        await AsyncStorage.setItem(
          CURRENT_STAFF_KEY,
          JSON.stringify(newSession)
        );
      } else {
        console.log(
          "addStaffSession - Not setting as current staff (current staff already exists)"
        );
      }
    } catch (error) {
      console.error("Error adding staff session:", error);
      throw error;
    }
  };

  // Remove a staff session
  const removeStaffSession = async (staffId: string) => {
    try {
      // Remove from active staff
      const updatedStaff = activeStaff.filter(
        (staff) => staff.staffId !== staffId
      );
      setActiveStaff(updatedStaff);
      await AsyncStorage.setItem(
        ACTIVE_STAFF_KEY,
        JSON.stringify(updatedStaff)
      );

      // If current staff is removed, set a new current staff or null
      if (currentStaff?.staffId === staffId) {
        const newCurrentStaff =
          updatedStaff.length > 0 ? updatedStaff[0] : null;
        setCurrentStaff(newCurrentStaff);

        if (newCurrentStaff) {
          await AsyncStorage.setItem(
            CURRENT_STAFF_KEY,
            JSON.stringify(newCurrentStaff)
          );
        } else {
          await AsyncStorage.removeItem(CURRENT_STAFF_KEY);
        }
      }
    } catch (error) {
      console.error("Error removing staff session:", error);
      throw error;
    }
  };

  // Switch to another staff
  const switchToStaff = async (staffId: string) => {
    try {
      console.log(`switchToStaff - Switching to staff ID: ${staffId}`);
      console.log(
        `switchToStaff - Current active staff: ${activeStaff.length} members`
      );

      const staff = activeStaff.find((s) => s.staffId === staffId);
      if (!staff) {
        console.error(
          `switchToStaff - Staff with ID ${staffId} not found in active sessions`
        );
        throw new Error("Staff not found in active sessions");
      }

      console.log(`switchToStaff - Found staff member:`, staff);

      // Update last active time
      const updatedStaff = { ...staff, lastActive: Date.now() };

      // Update the staff in active list
      const updatedActiveStaff = activeStaff.map((s) =>
        s.staffId === staffId ? updatedStaff : s
      );

      setActiveStaff(updatedActiveStaff);
      setCurrentStaff(updatedStaff);

      console.log(`switchToStaff - Current staff updated to:`, updatedStaff);

      await AsyncStorage.setItem(
        ACTIVE_STAFF_KEY,
        JSON.stringify(updatedActiveStaff)
      );
      await AsyncStorage.setItem(
        CURRENT_STAFF_KEY,
        JSON.stringify(updatedStaff)
      );
      console.log(`switchToStaff - Persisted changes to AsyncStorage`);
    } catch (error) {
      console.error("Error switching staff:", error);
      throw error;
    }
  };

  // Clear all staff sessions
  const clearAllSessions = async () => {
    try {
      setActiveStaff([]);
      setCurrentStaff(null);
      globalCurrentStaff = null;
      await AsyncStorage.removeItem(ACTIVE_STAFF_KEY);
      await AsyncStorage.removeItem(CURRENT_STAFF_KEY);
    } catch (error) {
      console.error("Error clearing all sessions:", error);
      throw error;
    }
  };

  // Refresh sessions
  const refreshSessions = async () => {
    try {
      await loadSessions();
    } catch (error) {
      console.error("Error refreshing sessions:", error);
      throw error;
    }
  };

  return (
    <StaffSessionContext.Provider
      value={{
        activeStaff,
        currentStaff,
        isLoading,
        addStaffSession,
        removeStaffSession,
        switchToStaff,
        clearAllSessions,
        refreshSessions,
      }}
    >
      {children}
    </StaffSessionContext.Provider>
  );
};

export function useStaffSession() {
  const context = useContext(StaffSessionContext);
  if (context === undefined) {
    throw new Error(
      "useStaffSession must be used within a StaffSessionProvider"
    );
  }
  return context;
}

// Utility function to get current staff without hooks
export function getCurrentStaff(): StaffSession | null {
  return globalCurrentStaff;
}

// Add a debug function to check active sessions
export const debugActiveStaffSessions = async () => {
  try {
    // Read directly from AsyncStorage
    const storedStaffJson = await AsyncStorage.getItem(ACTIVE_STAFF_KEY);
    const activeStaff = storedStaffJson ? JSON.parse(storedStaffJson) : [];

    console.log("==== DEBUG: ACTIVE STAFF SESSIONS ====");
    console.log(`Number of active staff sessions: ${activeStaff.length}`);
    console.log("Active staff:", JSON.stringify(activeStaff, null, 2));

    const currentStaffJson = await AsyncStorage.getItem(CURRENT_STAFF_KEY);
    const currentStaff = currentStaffJson ? JSON.parse(currentStaffJson) : null;

    console.log("Current staff:", JSON.stringify(currentStaff, null, 2));
    console.log("==== END DEBUG ====");

    return { activeStaff, currentStaff };
  } catch (error) {
    console.error("Error debugging staff sessions:", error);
    return { activeStaff: [], currentStaff: null };
  }
};

// Add a helper to refresh sessions from AsyncStorage
export const refreshStaffSessionsFromStorage = async () => {
  try {
    // Read directly from AsyncStorage
    const storedStaffJson = await AsyncStorage.getItem(ACTIVE_STAFF_KEY);
    const activeStaff = storedStaffJson ? JSON.parse(storedStaffJson) : [];

    const currentStaffJson = await AsyncStorage.getItem(CURRENT_STAFF_KEY);
    const currentStaff = currentStaffJson ? JSON.parse(currentStaffJson) : null;

    if (currentStaff) {
      globalCurrentStaff = currentStaff;
    }

    return { activeStaff, currentStaff };
  } catch (error) {
    console.error("Error refreshing staff sessions:", error);
    return { activeStaff: [], currentStaff: null };
  }
};
