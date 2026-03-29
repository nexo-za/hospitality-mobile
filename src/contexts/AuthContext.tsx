import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  AccountInfo,
} from "../types/apiTypes";
import { STORAGE_KEYS } from "@/utils/storage";

interface AuthContextType {
  user: AccountInfo | null;
  userId: string | null;
  isAuthenticated: boolean;
  login: (userId: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      if (storedUser && storedUserId) {
        setUser(JSON.parse(storedUser));
        setUserId(storedUserId);
      }
    } catch (error) {
      console.error("Error loading stored user:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userId: string, rememberMe: boolean = false) => {
    try {
      console.log("Login called with userId:", userId);
      setUserId(userId);

      // Get the stored user data from AsyncStorage
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        console.log("Setting user data from storage:", userData);
        setUser(userData);

        if (rememberMe) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, storedUser);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
      setUser(null);
      setUserId(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
        isAuthenticated: !!userId,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
