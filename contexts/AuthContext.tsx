import React, { createContext, useContext, useState, useEffect } from 'react';
import userService, { User } from '@/utils/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  extractAndSaveConfigFromLoginResponse,
  testDynamicConfig,
} from '@/config/dynamicAppConfig';
import PaymentServiceManager from '@/utils/PaymentServiceManager';
import EcentricPayment from '@/utils/EcentricPayment';
import { Linking } from 'react-native';
import storage from '@/utils/storage';
import { setAuthToken } from '@/utils/api';
import { validateCendroidConfig } from '@/utils/paymentConfig';
import type { LoginResponse, OrganizationConfigItem } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  apiAuthenticated: boolean;
  apiAuthError: string | null;
  organizationConfig: OrganizationConfigItem[];
  login: (
    username: string,
    password: string,
    rememberMe: boolean
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  testApiAuth: () => Promise<boolean>;
  openWebPortal: (path?: string) => Promise<void>;
  refreshUserState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const WEB_PORTAL_URL = 'https://nexo-portal.example.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiAuthenticated, setApiAuthenticated] = useState(false);
  const [apiAuthError, setApiAuthError] = useState<string | null>(null);
  const [organizationConfig, setOrganizationConfig] = useState<
    OrganizationConfigItem[]
  >([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userService.currentUser && !user) {
      refreshUserState();
    }
  }, [user]);

  const testApiAuth = async (): Promise<boolean> => {
    try {
      const isAuth = await userService.testApiAuthentication();
      setApiAuthenticated(isAuth);
      setApiAuthError(isAuth ? null : 'API authentication failed');
      if (isAuth) refreshUserState();
      return isAuth;
    } catch (error: any) {
      const isNetworkError = !error.response;
      setApiAuthenticated(false);
      setApiAuthError(
        error instanceof Error ? error.message : 'Unknown error'
      );
      if (isNetworkError) throw error;
      return false;
    }
  };

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const isAuth = await userService.initialize();

      if (isAuth && userService.currentUser) {
        setUser(userService.currentUser);
        setOrganizationConfig(userService.organizationConfig);
      } else {
        setUser(null);
      }

      if (isAuth) {
        let sessionValid = false;
        try {
          sessionValid = await testApiAuth();
        } catch {
          console.log(
            '[AuthContext] Server unreachable — allowing offline access'
          );
          sessionValid = true;
        }

        if (!sessionValid) {
          console.warn(
            '[AuthContext] Stored session is invalid/expired — logging out'
          );
          await logout();
          return;
        }

        await initPaymentServices();
      }

      refreshUserState();
    } catch (error) {
      console.error('[AuthContext] Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initPaymentServices = async () => {
    try {
      const initializedServices =
        await PaymentServiceManager.initializeAvailableServices();
      console.log(
        '[AuthContext] Payment services initialized:',
        initializedServices
      );

      if (initializedServices.includes('ecentric')) {
        const existingKey = EcentricPayment.getAuthenticationKey();
        if (!existingKey) {
          try {
            await EcentricPayment.handlePostLoginFlow();
          } catch {
            // Will retry during payment
          }
        }
      }
    } catch (error) {
      console.warn(
        '[AuthContext] Failed to initialize payment services:',
        error
      );
    }
  };

  const login = async (
    username: string,
    password: string,
    rememberMe: boolean
  ) => {
    setIsLoading(true);
    setApiAuthError(null);

    try {
      const { userData, response } = await userService.login({
        username,
        password,
        rememberMe,
      });

      // Persist payment / org config from login response
      try {
        await extractAndSaveConfigFromLoginResponse(response);
        await initPaymentServices();

        try {
          const validation = await validateCendroidConfig();
          if (!validation.isValid) {
            console.warn(
              '[AuthContext] CenDroid config invalid:',
              validation.error
            );
          }
        } catch {
          // non-fatal
        }
      } catch {
        // non-fatal
      }

      try {
        await testDynamicConfig();
      } catch {
        // non-fatal
      }

      if (response.tokens?.accessToken) {
        setAuthToken(response.tokens.accessToken);
      }

      if (userData) {
        setUser(userData);
        setOrganizationConfig(response.organizationConfig || []);
      }

      await testApiAuth();
      refreshUserState();
    } catch (error: any) {
      setApiAuthError(error.message || 'Failed to login');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await userService.logout();
      setApiAuthenticated(false);
      setUser(null);
      setOrganizationConfig([]);

      try {
        await AsyncStorage.multiRemove([
          'currentShift',
          'shiftHistory',
          'pos_active_staff',
          'pos_current_staff',
        ]);
      } catch {
        // best-effort
      }

      try {
        PaymentServiceManager.clearServices();
      } catch {
        // best-effort
      }
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserState = () => {
    if (userService.currentUser) {
      setUser(userService.currentUser);
      setOrganizationConfig(userService.organizationConfig);
    }
  };

  const openWebPortal = async (path?: string) => {
    try {
      const url = path ? `${WEB_PORTAL_URL}/${path}` : WEB_PORTAL_URL;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    } catch (error) {
      console.error('[AuthContext] Error opening web portal:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: userService.isAuthenticated,
        apiAuthenticated,
        apiAuthError,
        organizationConfig,
        login,
        logout,
        checkAuth,
        testApiAuth,
        openWebPortal,
        refreshUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
