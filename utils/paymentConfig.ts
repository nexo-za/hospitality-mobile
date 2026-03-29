import { getPaymentConfig } from '@/config/dynamicAppConfig';

/**
 * Payment Configuration Utility
 * 
 * This utility provides easy access to dynamic payment configuration
 * that gets updated after login from the server response.
 */

export interface PaymentConfig {
  // Ecentric payment settings
  ecentric?: {
    merchantId?: string;
    secretKey?: string;
    accessKey?: string;
    appUrl?: string;
    appClass?: string;
    [key: string]: any;
  };
  
  // Altron payment settings
  altron?: {
    [key: string]: any;
  };
  
  // CenDroid payment settings
  cendroid?: {
    enabled?: boolean;
    caller?: string;
    testMode?: boolean;
    timeout?: number;
    [key: string]: any;
  };
  
  // Generic payment settings
  [key: string]: any;
}

/**
 * Get the current payment configuration
 * This will return the dynamic config if available, or empty object if not
 */
export const getCurrentPaymentConfig = async (): Promise<PaymentConfig> => {
  try {
    const config = await getPaymentConfig();
    return config;
  } catch (error) {
    console.error('[PaymentConfig] Failed to get payment config:', error);
    return {};
  }
};

/**
 * Get Ecentric-specific payment configuration
 */
export const getEcentricConfig = async () => {
  try {
    const config = await getCurrentPaymentConfig();
    return config.ecentric || {};
  } catch (error) {
    console.error('[PaymentConfig] Failed to get Ecentric config:', error);
    return {};
  }
};

/**
 * Get Altron-specific payment configuration
 */
export const getAltronConfig = async () => {
  try {
    const config = await getCurrentPaymentConfig();
    return config.altron || {};
  } catch (error) {
    console.error('[PaymentConfig] Failed to get Altron config:', error);
    return {};
  }
};

/**
 * Get CenDroid-specific payment configuration
 */
export const getCendroidConfig = async () => {
  try {
    const config = await getCurrentPaymentConfig();
    return config.cendroid || {};
  } catch (error) {
    console.error('[PaymentConfig] Failed to get CenDroid config:', error);
    return {};
  }
};

/**
 * Validate CenDroid configuration like nexo-lite
 */
export const validateCendroidConfig = async (): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const config = await getCurrentPaymentConfig();
    const c = config.cendroid;
    if (!c) return { isValid: false, error: 'CenDroid configuration not found' };
    if (!c.enabled) return { isValid: false, error: 'CenDroid payment processing is disabled' };
    if (!c.caller || c.caller.trim() === '') return { isValid: false, error: 'CenDroid caller configuration is missing' };
    return { isValid: true };
  } catch (error) {
    console.error('[PaymentConfig] Error validating CenDroid config:', error);
    return { isValid: false, error: 'Failed to validate CenDroid configuration' };
  }
};

/**
 * Check if a specific payment method is configured
 */
export const isPaymentMethodConfigured = async (method: 'ecentric' | 'altron' | 'cendroid'): Promise<boolean> => {
  try {
    const config = await getCurrentPaymentConfig();
    const methodConfig = config[method];
    
    if (!methodConfig) return false;
    
    // Check if the method has essential configuration
    if (method === 'ecentric') {
      return !!(methodConfig.merchantId && methodConfig.secretKey && methodConfig.accessKey);
    }
    
    if (method === 'altron') {
      // Add Altron-specific validation as needed
      return Object.keys(methodConfig).length > 0;
    }
    
    if (method === 'cendroid') {
      return !!(methodConfig.enabled && methodConfig.caller);
    }
    
    return false;
  } catch (error) {
    console.error(`[PaymentConfig] Failed to check ${method} configuration:`, error);
    return false;
  }
};

/**
 * Get all available payment methods
 */
export const getAvailablePaymentMethods = async (): Promise<string[]> => {
  try {
    const config = await getCurrentPaymentConfig();
    const methods: string[] = [];
    
    if (config.ecentric && Object.keys(config.ecentric).length > 0) {
      methods.push('ecentric');
    }
    
    if (config.altron && Object.keys(config.altron).length > 0) {
      methods.push('altron');
    }
    
    if (config.cendroid && config.cendroid.enabled && config.cendroid.caller) {
      methods.push('cendroid');
    }
    
    return methods;
  } catch (error) {
    console.error('[PaymentConfig] Failed to get available payment methods:', error);
    return [];
  }
};

/**
 * Validate payment configuration
 */
export const validatePaymentConfig = async (): Promise<{ isValid: boolean; errors: string[] }> => {
  const errors: string[] = [];
  
  try {
    const config = await getCurrentPaymentConfig();
    
    if (!config || Object.keys(config).length === 0) {
      errors.push('No payment configuration available');
      return { isValid: false, errors };
    }
    
    // Validate Ecentric config if present
    if (config.ecentric) {
      if (!config.ecentric.merchantId) {
        errors.push('Ecentric merchant ID is missing');
      }
      if (!config.ecentric.secretKey) {
        errors.push('Ecentric secret key is missing');
      }
      if (!config.ecentric.accessKey) {
        errors.push('Ecentric access key is missing');
      }
    }
    
    // Validate Altron config if present
    if (config.altron) {
      // Add Altron-specific validation as needed
      if (Object.keys(config.altron).length === 0) {
        errors.push('Altron configuration is empty');
      }
    }
    
    // Validate CenDroid config if present
    if (config.cendroid) {
      if (!config.cendroid.caller) {
        errors.push('CenDroid caller name is missing');
      }
      if (config.cendroid.enabled === undefined) {
        errors.push('CenDroid enabled status is missing');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    errors.push(`Failed to validate payment config: ${error}`);
    return { isValid: false, errors };
  }
};
