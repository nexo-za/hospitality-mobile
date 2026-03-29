import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import EcentricPayment from '../utils/EcentricPayment';

// Define context interface
interface EcentricAuthContextType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authenticate: () => Promise<boolean>;
  clearAuthentication: () => Promise<void>;
  error: string | null;
}

// Create context with default values
const EcentricAuthContext = createContext<EcentricAuthContextType>({
  isAuthenticated: false,
  isAuthenticating: false,
  authenticate: async () => false,
  clearAuthentication: async () => {},
  error: null,
});

// Hook for using the context
export const useEcentricAuth = () => useContext(EcentricAuthContext);

// Provider component
export const EcentricAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication on app startup
  useEffect(() => {
    // Only run on Android
    if (Platform.OS !== 'android') return;

    const showPaymentUnavailableAlert = (retry?: () => void) => {
      Alert.alert(
        'Payment terminal unavailable',
        "We couldn't initialize the payment terminal. Card payments may be unavailable on this device. You can continue with cash or contact support at support@nexo.app.",
        [
          {
            text: 'Contact Support',
            onPress: () => Linking.openURL('mailto:support@nexo.app?subject=Payment%20Terminal%20Setup%20Issue'),
          },
          {
            text: 'Use Cash',
            style: 'cancel',
          },
          {
            text: 'Try Again',
            onPress: () => retry && retry(),
          },
        ]
      );
    };

    const initAuth = async () => {
      try {
        // Check if the native module is available
        if (!EcentricPayment.isModuleAvailable()) {
          console.log('[EcentricAuthContext] Native module not available, skipping auto-auth');
          return;
        }

        // Try to load existing key
        const hasKey = !!EcentricPayment.getAuthenticationKey();
        if (hasKey) {
          console.log('[EcentricAuthContext] Found existing authentication key');
          setIsAuthenticated(true);
          return;
        }

        // Try automatic authentication if no existing key
        console.log('[EcentricAuthContext] Attempting automatic authentication at startup');
        setIsAuthenticating(true);
        
        const success = await EcentricPayment.initializeAuthentication();
        setIsAuthenticated(success);

        if (success) {
          console.log('[EcentricAuthContext] Automatic authentication successful');
        } else {
          console.log('[EcentricAuthContext] Automatic authentication failed, will try manually later');
          // Graceful UX: warn that card payments may be unavailable on this terminal
          showPaymentUnavailableAlert(() => {
            // retry
            EcentricPayment.initializeAuthentication().catch(() => {});
          });
        }
      } catch (err) {
        console.error('[EcentricAuthContext] Error during initialization:', err);
        setError('Failed to initialize Ecentric payment system');
        showPaymentUnavailableAlert(() => {
          EcentricPayment.initializeAuthentication().catch(() => {});
        });
      } finally {
        setIsAuthenticating(false);
      }
    };

    initAuth();
  }, []);

  // Manually trigger authentication
  const authenticate = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setError('Card payments are only supported on Android devices');
      return false;
    }

    try {
      setIsAuthenticating(true);
      setError(null);

      const success = await EcentricPayment.initializeAuthentication();
      setIsAuthenticated(success);
      
      if (!success) {
        setError('Authentication failed. Please try again.');
        Alert.alert(
          'Payment terminal unavailable',
          "We couldn't initialize the payment terminal. Card payments may be unavailable on this device. You can continue with cash or contact support at support@nexo.app.",
          [
            {
              text: 'Contact Support',
              onPress: () => Linking.openURL('mailto:support@nexo.app?subject=Payment%20Terminal%20Setup%20Issue'),
            },
            { text: 'Use Cash', style: 'cancel' },
            {
              text: 'Try Again',
              onPress: () => {
                // fire and forget
                EcentricPayment.initializeAuthentication().catch(() => {});
              },
            },
          ]
        );
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EcentricAuthContext] Authentication error:', errorMessage);
      setError(`Authentication error: ${errorMessage}`);
      Alert.alert(
        'Payment terminal unavailable',
        "We couldn't initialize the payment terminal. Card payments may be unavailable on this device. You can continue with cash or contact support at support@nexo.app.",
        [
          {
            text: 'Contact Support',
            onPress: () => Linking.openURL('mailto:support@nexo.app?subject=Payment%20Terminal%20Setup%20Issue'),
          },
          { text: 'Use Cash', style: 'cancel' },
        ]
      );
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Clear authentication data
  const clearAuthentication = async (): Promise<void> => {
    try {
      await EcentricPayment.clearAuthentication();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('[EcentricAuthContext] Error clearing authentication:', error);
    }
  };

  const value = {
    isAuthenticated,
    isAuthenticating,
    authenticate,
    clearAuthentication,
    error,
  };

  return (
    <EcentricAuthContext.Provider value={value}>
      {children}
    </EcentricAuthContext.Provider>
  );
};

export default EcentricAuthContext; 