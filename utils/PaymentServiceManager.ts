import { Platform, NativeModules } from 'react-native';
import logManager from './LogManager';
import { getCurrentPaymentConfig, isPaymentMethodConfigured, getAvailablePaymentMethods } from './paymentConfig';

// Import payment services
import EcentricPayment from './EcentricPayment';
import CendroidPayment from './CendroidPayment';

// Get CenDroid module for availability check
const CenDroidLauncher = NativeModules.CenDroidLauncher;

export interface PaymentService {
  name: string;
  isAvailable: () => boolean;
  isConfigured: () => boolean | Promise<boolean>;
  initialize: () => Promise<boolean>;
  processPayment?: (amount: number, reference: string, options?: any) => Promise<any>;
}

class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private services: Map<string, PaymentService> = new Map();
  private initializedServices: Set<string> = new Set();

  private constructor() {
    this.registerServices();
  }

  public static getInstance(): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager();
    }
    return PaymentServiceManager.instance;
  }

  /**
   * Register available payment services
   */
  private registerServices(): void {
    // Register Ecentric payment service
    this.services.set('ecentric', {
      name: 'Ecentric',
      isAvailable: () => Platform.OS === 'android' && EcentricPayment.isModuleAvailable(),
      isConfigured: () => EcentricPayment.isConfigured(),
      initialize: async () => {
        try {
          const success = await EcentricPayment.initializeWithDynamicConfig();
          if (success) {
            this.initializedServices.add('ecentric');
            logManager.info('PaymentServiceManager', 'Ecentric payment service initialized');
          }
          return success;
        } catch (error) {
          logManager.error('PaymentServiceManager', 'Failed to initialize Ecentric service', error);
          return false;
        }
      },
      processPayment: async (amount: number, reference: string, options?: any) => {
        // Match LEGACY implementation: authenticate first, then pass authToken explicitly
        
        // Ensure dynamic config is loaded before getting values
        if (!EcentricPayment.isConfigured()) {
          logManager.info('PaymentServiceManager', 'Ecentric not configured, loading dynamic config...');
          const configLoaded = await EcentricPayment.initializeWithDynamicConfig();
          if (!configLoaded) {
            throw new Error('Failed to load Ecentric configuration for payment');
          }
        }
        
        // Debug: Check what config values we're getting
        const appURL = EcentricPayment.getConfigValue('appURL');
        const appClass = EcentricPayment.getConfigValue('appClass');
        const merchantID = EcentricPayment.getConfigValue('merchantID');
        
        console.log('💳 [PaymentServiceManager] Using dynamic Ecentric config:', {
          appURL,
          appClass,
          merchantID: (typeof merchantID === 'string' && merchantID) ? `${merchantID.substring(0, 4)}...${merchantID.substring(merchantID.length - 4)}` : "NOT SET",
          isConfigured: EcentricPayment.isConfigured()
        });
        
        // IMPORTANT: Always get a fresh authentication token before payment (matching LEGACY)
        // Clear any previous auth token first to ensure fresh authentication
        console.log('💳 [PaymentServiceManager] Clearing previous authentication...');
        await EcentricPayment.clearAuthentication();
        
        console.log('💳 [PaymentServiceManager] Authenticating with Ecentric terminal before payment...');
        const authResponse = await EcentricPayment.authenticate();
        let authToken = null;
        
        if (authResponse) {
          console.log('✅ [PaymentServiceManager] Authentication successful, proceeding with payment');
          authToken = authResponse;
        } else {
          console.log('❌ [PaymentServiceManager] Authentication failed, cannot proceed with payment');
          throw new Error('Authentication failed. Cannot proceed with payment.');
        }
        
        // IMPORTANT: Use underscore-separated keys in merchantInfoJson as per SDK requirements (matching LEGACY)
        const merchantInfoJson = options?.merchantInfoJson || JSON.stringify({
          "Phone_No": "",
          "Street": "",
          "URL": "",
          "Support_Phone_No": "",
          "City": "",
          "Province": "",
          "Country_Code": "ZA",
          "Currency_Code": "ZAR",
          "Postal_Code": ""
        });
        
        const paymentParams = {
          appURL,
          appClass,
          merchantID,
          authToken, // PASS authToken explicitly like LEGACY does!
          transactionAmount: amount,
          transactionUuid: options?.transactionId || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          description: options?.description || `Nexo sale ${reference}`,
          customerName: options?.customerName || "Guest Customer",
          transactionReferenceNo: reference,
          cellNumber: options?.cellNumber || "",
          emailAddress: options?.emailAddress || "",
          isReceiptRequired: options?.isReceiptRequired !== undefined ? options.isReceiptRequired : true,
          alwaysShowTransactionStatusScreen: options?.alwaysShowTransactionStatusScreen !== undefined ? options.alwaysShowTransactionStatusScreen : false,
          merchantInfoJson: merchantInfoJson,
          externalSTAN: options?.externalSTAN || "0",
          externalRRN: options?.externalRRN || "",
          externalTransactionGUID: options?.externalTransactionGUID || "",
          externalInvoiceGUID: options?.externalInvoiceGUID || "",
          externalTransactionDateTime: options?.externalTransactionDateTime || "",
          externalTerminalId: options?.externalTerminalId || "",
          latitude: options?.latitude || null,
          longitude: options?.longitude || null,
          accuracy: options?.accuracy || null,
          applicationKey: options?.applicationKey || "NEXO_APP"
        };
        
        console.log('🔍 [PaymentServiceManager] Complete payment params being sent:', JSON.stringify(paymentParams, null, 2));
        
        return await EcentricPayment.launchSaleTransaction(paymentParams);
      }
    });

    // Register CenDroid payment service
    this.services.set('cendroid', {
      name: 'CenDroid',
      isAvailable: () => {
        try {
          // Check if CenDroid native module is available
          return Platform.OS === 'android' && !!CenDroidLauncher;
        } catch (error) {
          return false;
        }
      },
      isConfigured: async () => {
        try {
          return await CendroidPayment.isConfigured();
        } catch (error) {
          return false;
        }
      },
      initialize: async () => {
        try {
          const success = await CendroidPayment.initializeWithDynamicConfig();
          if (success) {
            this.initializedServices.add('cendroid');
            logManager.info('PaymentServiceManager', 'CenDroid payment service initialized');
          }
          return success;
        } catch (error) {
          logManager.error('PaymentServiceManager', 'Failed to initialize CenDroid service', error);
          return false;
        }
      },
      processPayment: async (amount: number, reference: string, options?: any) => {
        return await CendroidPayment.processPayment(amount, reference, options);
      }
    });

    // TODO: Register Altron payment service when implemented
    // this.services.set('altron', {
    //   name: 'Altron',
    //   isAvailable: () => Platform.OS === 'android' && AltronPayment.isModuleAvailable(),
    //   isConfigured: () => AltronPayment.isConfigured(),
    //   initialize: async () => {
    //     // Altron initialization logic
    //   }
    // });
  }

  /**
   * Initialize payment services based on available configuration
   */
  async initializeAvailableServices(): Promise<string[]> {
    logManager.info('PaymentServiceManager', 'Initializing available payment services...');

    const availableMethods = await getAvailablePaymentMethods();
    const initializedServices: string[] = [];

    for (const method of availableMethods) {
      const service = this.services.get(method);
      if (service && service.isAvailable()) {
        try {
          const isConfigured = await isPaymentMethodConfigured(method as 'ecentric' | 'altron');
          if (isConfigured) {
            const success = await service.initialize();
            if (success) {
              initializedServices.push(method);
              logManager.info('PaymentServiceManager', `${method} payment service initialized successfully`);
            } else {
              logManager.warn('PaymentServiceManager', `Failed to initialize ${method} payment service`);
            }
          } else {
            logManager.warn('PaymentServiceManager', `${method} payment service not configured`);
          }
        } catch (error) {
          logManager.error('PaymentServiceManager', `Error initializing ${method} service`, error);
        }
      } else {
        logManager.warn('PaymentServiceManager', `${method} payment service not available on this device`);
      }
    }

    logManager.info('PaymentServiceManager', `Initialized ${initializedServices.length} payment services:`, initializedServices);
    return initializedServices;
  }

  /**
   * Get available payment services
   */
  getAvailableServices(): PaymentService[] {
    return Array.from(this.services.values()).filter(service => service.isAvailable());
  }

  /**
   * Get initialized payment services
   */
  getInitializedServices(): string[] {
    return Array.from(this.initializedServices);
  }

  /**
   * Check if a specific payment service is available and initialized
   */
  isServiceReady(serviceName: string): boolean {
    return this.initializedServices.has(serviceName);
  }

  /**
   * Get a specific payment service
   */
  getService(serviceName: string): PaymentService | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Process payment using the first available service
   */
  async processPayment(amount: number, reference: string, options?: any): Promise<any> {
    const availableServices = this.getInitializedServices();
    
    if (availableServices.length === 0) {
      throw new Error('No payment services are available or initialized');
    }

    // Use the first available service (could be enhanced to allow service selection)
    const serviceName = availableServices[0];
    const service = this.getService(serviceName);
    
    if (!service || !service.processPayment) {
      throw new Error(`Payment service ${serviceName} does not support payment processing`);
    }

    logManager.info('PaymentServiceManager', `Processing payment using ${serviceName} service`);
    return await service.processPayment(amount, reference, options);
  }

  /**
   * Clear all initialized services (useful for logout)
   */
  clearServices(): void {
    this.initializedServices.clear();
    logManager.info('PaymentServiceManager', 'All payment services cleared');
  }
}

export default PaymentServiceManager.getInstance();
