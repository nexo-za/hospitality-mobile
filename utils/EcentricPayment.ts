import { NativeModules, Platform } from "react-native";
import {
  logAvailableNativeModules,
  findModulesByNamePattern,
} from "./NativeModuleDebug";
import * as SecureStore from "expo-secure-store";
import logManager from "./LogManager";
import { isDev } from "../config/appConfig";
import { getEcentricConfig } from "../config/dynamicAppConfig";

// Define the secure storage key for the authentication token
const AUTH_TOKEN_KEY = "ecentric_auth_token";

// Get the native module if available
const EcentricPaymentModule = NativeModules.EcentricPaymentModule;

// Add custom UUID generator
const generateUUID = (): string => {
  // Generate random hexadecimal string with specified length
  const generateHex = (length: number): string => {
    let result = "";
    const hexChars = "0123456789abcdef";
    for (let i = 0; i < length; i++) {
      result += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
    }
    return result;
  };

  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Where y is one of: 8, 9, a, or b
  const variant = "89ab"[Math.floor(Math.random() * 4)];

  return [
    generateHex(8),
    generateHex(4),
    "4" + generateHex(3),
    variant + generateHex(3),
    generateHex(12),
  ].join("-");
};

/**
 * Interface for Ecentric payment options
 */
export interface EcentricPaymentOptions {
  transactionId?: string;
  currencyCode?: string;
  receiptRequired?: boolean;
  showTransactionStatusScreen?: boolean;
  cardType?: string;
}

/**
 * Interface for Ecentric payment result
 */
export interface EcentricPaymentResult {
  responseCode?: string;
  responseMessage?: string;
  authCode?: string;
  posRefNum?: string;
  cardType?: string;
  maskedPan?: string;
  [key: string]: any; // Allow any additional properties
}

// Define the merchant info interface
export interface MerchantInfo {
  PhoneNo: string;
  Street: string;
  URL: string;
  SupportPhoneNo: string;
  City: string;
  Province: string;
  CountryCode: string;
  CurrencyCode: string;
  PostalCode: string;
}

// Define the payment response interface
export interface PaymentResponse {
  responseCode: string;
  responseMessage: string;
  transactionId?: string;
  authorizationCode?: string;
  cardType?: string;
  cardNumber?: string;
  maskedCardNumber?: string;
  transactionReference?: string;
  transactionType?: string;
  authenticationKey?: string;
  receiptData?: string;
  // Add any other fields that might be returned by the Ecentric payment system
}

class EcentricPayment {
  private appURL: string;
  private appClass: string;
  private merchantID: string;
  private secretKey: string;
  private accessKey: string;
  private isSunmiDevice: boolean;
  private merchantInfo: MerchantInfo;
  private receiptRequired: boolean;
  private showTransactionStatusScreen: boolean;
  private authenticationKey: string | null = null;
  private isAuthenticated: boolean = false;
  private authToken: string = "";
  private keyExpiry: number = 0;

  constructor() {
    // Initialize with sensible defaults that match legacy behavior
    // These will be overridden by dynamic config after login
    this.isSunmiDevice = true; // Default to SUNMI device as per legacy
    
    // Set default app configuration for SUNMI devices (as per legacy logic)
    if (this.isSunmiDevice) {
      this.appURL = "ecentric.thumbzup.com";
      this.appClass = "payment.thumbzup.com.IntentActivity";
    } else {
      this.appURL = "ecentric.thumbzup.com";
      this.appClass = "payment.thumbzup.com.IntentActivity";
    }
    
    // These will be populated from login response
    this.merchantID = "";
    this.secretKey = "";
    this.accessKey = "";
    this.receiptRequired = true;
    this.showTransactionStatusScreen = false;

    // Initialize merchant info with defaults
    this.merchantInfo = {
      PhoneNo: "",
      Street: "",
      URL: "",
      SupportPhoneNo: "",
      City: "",
      Province: "",
      CountryCode: "ZA",
      CurrencyCode: "ZAR",
      PostalCode: "",
    };

    logManager.info("EcentricPayment", "Initialized with default configuration - will load dynamic config after login", {
      appURL: this.appURL,
      appClass: this.appClass,
      isSunmiDevice: this.isSunmiDevice,
    });

    // Run diagnostics if in development
    if (isDev() && !EcentricPaymentModule) {
      logManager.warn(
        "EcentricPayment",
        "Running detailed diagnostics in dev mode"
      );
      logAvailableNativeModules();
    }

    // Try to load stored authentication key on initialization
    this.loadStoredAuthKey();
  }

  /**
   * Load the stored authentication key from secure storage
   */
  private async loadStoredAuthKey(): Promise<void> {
    try {
      const storedKey = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (storedKey) {
        this.authenticationKey = storedKey;
        logManager.info(
          "EcentricPayment",
          "Loaded authentication key from secure storage"
        );
      } else {
        logManager.info(
          "EcentricPayment",
          "No stored authentication key found"
        );
      }
    } catch (error) {
      logManager.error(
        "EcentricPayment",
        "Error loading stored authentication key",
        error
      );
    }
  }

  /**
   * Save the authentication key to secure storage
   */
  private async saveAuthKey(key: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, key);
      logManager.info(
        "EcentricPayment",
        "Authentication key saved to secure storage"
      );
    } catch (error) {
      logManager.error(
        "EcentricPayment",
        "Error saving authentication key",
        error
      );
    }
  }

  /**
   * Initialize authentication on app startup
   * This should be called as early as possible in the app lifecycle
   */
  async initializeAuthentication(): Promise<boolean> {
    logManager.info("EcentricPayment", "Starting initialization process");

    if (!this.isDeviceSupported()) {
      logManager.error(
        "EcentricPayment",
        "Device not supported (non-Android), skipping initialization"
      );
      return false;
    }

    if (!this.isModuleAvailable()) {
      logManager.error(
        "EcentricPayment",
        "Native module not available, cannot initialize"
      );
      return false;
    }

    if (!this.isConfigured()) {
      logManager.warn(
        "EcentricPayment",
        "Not configured - payment configuration must be loaded first"
      );
      return false;
    }

    logManager.info(
      "EcentricPayment",
      "Native module available, continuing initialization"
    );

    // Check if we already have a stored key
    if (this.authenticationKey) {
      logManager.info(
        "EcentricPayment",
        "Already authenticated with key in memory"
      );
      return true;
    }

    // Try to load from secure storage (just to be safe)
    try {
      await this.loadStoredAuthKey();
      if (this.authenticationKey) {
        logManager.info(
          "EcentricPayment",
          "Authentication loaded from secure storage"
        );
        return true;
      }
    } catch (error) {
      logManager.warn("EcentricPayment", "Error loading from storage", error);
      // Continue with authentication attempt
    }

    logManager.info(
      "EcentricPayment",
      "No saved authentication found, attempting new authentication"
    );

    try {
      logManager.info(
        "EcentricPayment",
        "Sending authentication request to terminal..."
      );
      const key = await this.authenticate();
      if (key) {
        logManager.info(
          "EcentricPayment",
          "Authentication succeeded, received token"
        );
        this.setAuthenticationKey(key);
        await this.saveAuthKey(key);
        return true;
      } else {
        logManager.error(
          "EcentricPayment",
          "Authentication failed, no token received"
        );
        return false;
      }
    } catch (error) {
      logManager.error("EcentricPayment", "Authentication error", error);
      return false;
    }
  }

  /**
   * Perform Retail Auth as recommended in Ecentric documentation
   * This should be called when user first logs in or when auth token expires
   */
  async performRetailAuth(): Promise<string> {
    logManager.info("EcentricPayment", "Performing Retail Auth as per documentation");
    
    // Clear any existing authentication first
    await this.clearAuthentication();
    
    try {
      const authKey = await this.authenticate();
      if (authKey) {
        logManager.info("EcentricPayment", "Retail Auth successful, storing token");
        this.setAuthenticationKey(authKey);
        await this.saveAuthKey(authKey);
        return authKey;
      } else {
        throw new Error("No authentication key received from Retail Auth");
      }
    } catch (error) {
      logManager.error("EcentricPayment", "Retail Auth failed", error);
      throw error;
    }
  }

  /**
   * Clear stored authentication data
   */
  async clearAuthentication(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      this.authenticationKey = null;
      logManager.info("EcentricPayment", "Authentication data cleared");
    } catch (error) {
      logManager.error(
        "EcentricPayment",
        "Error clearing authentication data",
        error
      );
    }
  }

  /**
   * Set the authentication key obtained from retail auth
   */
  setAuthenticationKey(key: string) {
    this.authenticationKey = key;

    logManager.info("EcentricPayment", "Authentication key set");

    // Save the key to secure storage
    this.saveAuthKey(key);
  }

  /**
   * Get the current authentication key
   */
  getAuthenticationKey(): string | null {
    return this.authenticationKey;
  }

  /**
   * Check if the device is supported (Android only)
   */
  isDeviceSupported(): boolean {
    return Platform.OS === "android";
  }

  /**
   * Check if EcentricPayment is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.merchantID &&
      this.secretKey &&
      this.accessKey &&
      this.appURL &&
      this.appClass
    );
  }

  /**
   * Check if EcentricPayment is available and configured
   */
  isAvailable(): boolean {
    return this.isDeviceSupported() && this.isModuleAvailable() && this.isConfigured();
  }

  /**
   * Authenticate with the payment provider
   * This needs to be called before processing any payments
   */
  async authenticate(): Promise<string> {
    logManager.info("EcentricPayment", "Starting authentication process");

    if (!this.isDeviceSupported()) {
      const error = new Error(
        "Ecentric Payment is only supported on Android devices"
      );
      logManager.error("EcentricPayment", "Device not supported", {
        errorMessage: error.message,
      });
      throw error;
    }

    if (!EcentricPaymentModule) {
      const error = new Error("EcentricPaymentModule is not available");
      logManager.error("EcentricPayment", "Native module missing", {
        errorMessage: error.message,
      });
      throw error;
    }

    logManager.info(
      "EcentricPayment",
      "Launching Ecentric payment terminal authentication",
      {
        appURL: this.appURL,
        appClass: this.appClass,
        merchantID: this.merchantID ? "****" : "NOT SET",
        isSunmiDevice: this.isSunmiDevice,
      }
    );

    try {
      logManager.info("EcentricPayment", "Initiating Retail Auth", {
        appURL: this.appURL,
        appClass: this.appClass,
        merchantID: this.merchantID,
      });

      logManager.debug("EcentricPayment", "Auth credentials", {
        accessKey: this.accessKey
          ? this.accessKey.substring(0, 4) +
            "..." +
            this.accessKey.substring(this.accessKey.length - 4)
          : "NOT SET",
        accessKeyLength: this.accessKey ? this.accessKey.length : 0,
        secretKey: this.secretKey
          ? this.secretKey.substring(0, 4) +
            "..." +
            this.secretKey.substring(this.secretKey.length - 4)
          : "NOT SET",
        secretKeyLength: this.secretKey ? this.secretKey.length : 0,
      });

      // Add a longer timeout (3 minutes) to allow for user interaction
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Authentication timed out after 3 minutes"));
        }, 180000); // 3 minutes
      });

      // Launch the authentication process
      const authPromise = EcentricPaymentModule.launchRetailAuth(
        this.appURL,
        this.appClass,
        this.merchantID,
        this.secretKey,
        this.accessKey
      );

      // Race between the timeout and the actual authentication
      const response = await Promise.race([authPromise, timeoutPromise]);

      // Check if response is empty or null
      if (!response) {
        logManager.error(
          "EcentricPayment",
          "Received empty response from payment terminal"
        );
        throw new Error(
          "Authentication failed: Empty response received from payment terminal"
        );
      }

      logManager.info(
        "EcentricPayment",
        "Received authentication response",
        response
      );

      // Check for error conditions first (as per Ecentric documentation)
      if (response.resultCode && response.resultCode !== "00") {
        // Handle error response as per documentation
        const errorType = response.errorType || "UNKNOWN";
        const description = response.description || "No description provided";
        const message = response.message || "No message provided";
        const reference = response.reference || "No reference provided";
        
        logManager.error(
          "EcentricPayment",
          "Authentication failed with error response",
          {
            resultCode: response.resultCode,
            resultDescription: response.resultDescription,
            errorType,
            description,
            message,
            reference
          }
        );
        
        throw new Error(
          `Authentication failed: ${description} (Code: ${response.resultCode}, Type: ${errorType})`
        );
      }

      // Check for successful authentication
      if (response && response.authenticationKey) {
        this.authenticationKey = response.authenticationKey;
        logManager.info(
          "EcentricPayment",
          "Authentication key obtained successfully",
          {
            length: this.authenticationKey?.length || 0,
          }
        );
        return response.authenticationKey;
      } else if (response && response.authKey) {
        // Handle alternative field name that might be used
        this.authenticationKey = response.authKey;
        logManager.info(
          "EcentricPayment",
          "Authentication key (authKey) obtained successfully",
          {
            length: this.authenticationKey?.length || 0,
          }
        );
        return response.authKey;
      } else {
        // Log the complete response for debugging
        logManager.error(
          "EcentricPayment",
          "Authentication failed - Response received but no key",
          response
        );
        throw new Error(
          "Authentication failed: No authentication key received in response"
        );
      }
    } catch (error) {
      logManager.error("EcentricPayment", "Authentication error", error);
      throw error;
    }
  }

  /**
   * Process a payment using Ecentric
   * @param amount Amount to charge
   * @param reference Reference number for the transaction
   * @param options Additional options
   * @returns Promise with the payment result
   */
  async processPayment(
    amount: number,
    reference: string,
    options: EcentricPaymentOptions = {}
  ): Promise<EcentricPaymentResult> {
    logManager.info("EcentricPayment", "Starting payment process");

    if (!this.isAvailable()) {
      const error = new Error(
        "Ecentric payment is not available or not configured on this device"
      );
      logManager.error("EcentricPayment", "Not available or configured", {
        error: error.message,
        isDeviceSupported: this.isDeviceSupported(),
        isModuleAvailable: this.isModuleAvailable(),
        isConfigured: this.isConfigured(),
      });
      throw error;
    }

    // Ensure we have an authentication key
    if (!this.authenticationKey) {
      logManager.info(
        "EcentricPayment",
        "No authentication key found, attempting to authenticate"
      );
      try {
        await this.authenticate();
      } catch (error) {
        logManager.error(
          "EcentricPayment",
          "Failed to authenticate with Ecentric payment terminal",
          error
        );
        throw new Error(
          "Failed to authenticate with payment terminal. Please try again."
        );
      }
    }

    if (!this.authenticationKey) {
      const error = new Error(
        "Authentication key is missing. Cannot process payment."
      );
      logManager.error("EcentricPayment", error.message);
      throw error;
    }

    // Generate a unique transaction ID if not provided
    const transactionId = options.transactionId || generateUUID();

    // Format amount as string with 2 decimal places
    const formattedAmount = amount.toFixed(2);

    logManager.info(
      "EcentricPayment",
      `Processing payment of ${formattedAmount} with reference: ${reference}`
    );
    logManager.debug("EcentricPayment", "Payment details", {
      amount: formattedAmount,
      reference,
      transactionId,
      currencyCode: options.currencyCode || "ZAR",
      receiptRequired:
        options.receiptRequired !== undefined
          ? options.receiptRequired
          : this.receiptRequired,
      showTransactionStatusScreen:
        options.showTransactionStatusScreen !== undefined
          ? options.showTransactionStatusScreen
          : this.showTransactionStatusScreen,
      cardType: options.cardType || "Any",
    });

    try {
      logManager.info(
        "EcentricPayment",
        `Launching retail sale with auth key length: ${this.authenticationKey.length}`
      );

      // Log what's being sent to the native module
      logManager.debug("EcentricPayment", "NATIVE MODULE CALL PARAMETERS", {
        appURL: this.appURL,
        appClass: this.appClass,
        merchantID: this.merchantID ? "****" : "NOT SET",
        authenticationKey: this.authenticationKey
          ? this.authenticationKey.substring(0, 4) +
            "..." +
            this.authenticationKey.substring(this.authenticationKey.length - 4)
          : "NOT SET",
        reference: reference,
        formattedAmount: formattedAmount,
        currencyCode: options.currencyCode || "ZAR",
        receiptRequired:
          options.receiptRequired !== undefined
            ? options.receiptRequired
            : this.receiptRequired,
        showTransactionStatusScreen:
          options.showTransactionStatusScreen !== undefined
            ? options.showTransactionStatusScreen
            : this.showTransactionStatusScreen,
        cardType: options.cardType || null,
        additionalOptionsCount: Object.keys(options).filter(
          (key) =>
            ![
              "transactionId",
              "currencyCode",
              "receiptRequired",
              "showTransactionStatusScreen",
              "cardType",
            ].includes(key)
        ).length,
      });

      // Examine and log all option properties for debugging
      if (Object.keys(options).length > 5) {
        logManager.debug("EcentricPayment", "All options properties", options);
      }

      logManager.info("EcentricPayment", "LAUNCHING NATIVE SALE TRANSACTION", {
        appURL: this.appURL,
        appClass: this.appClass,
        merchantID: this.merchantID,
        authTokenLength: this.authenticationKey.length,
      });

      // Match the exact parameter ordering from the Java implementation
      const result = await EcentricPaymentModule.launchSaleTransaction(
        this.appURL,
        this.appClass,
        this.merchantID,
        this.authenticationKey,
        parseFloat(formattedAmount) * 100, // Convert to cents as a number
        transactionId,
        `Nexo sale ${reference}`,
        "", // customer name
        reference, // transactionReferenceNo
        "", // cellNumberToSMSReceipt
        "", // emailAddressToSendReceipt
        options.receiptRequired !== undefined
          ? options.receiptRequired
          : this.receiptRequired,
        options.showTransactionStatusScreen !== undefined
          ? options.showTransactionStatusScreen
          : this.showTransactionStatusScreen,
        JSON.stringify(this.merchantInfo), // merchantInfoJson
        "0", // externalSTAN
        "", // externalRRN
        "", // externalTransactionGUID
        "", // externalInvoiceGUID
        "", // externalTransactionDateTime
        "", // externalTerminalId
        null, // latitude
        null, // longitude
        null, // accuracy
        "NEXO_APP" // applicationKey
      );

      logManager.info("EcentricPayment", "Payment response received", result);

      // Check for receipt bundle
      if (result.isReceiptDataAvailable === true && result.receiptBundle) {
        logManager.info(
          "EcentricPayment",
          "Receipt bundle found",
          result.receiptBundle
        );
      } else if (result.isReceiptDataAvailable === true) {
        logManager.warn(
          "EcentricPayment",
          "isReceiptDataAvailable is true but no receipt bundle found in result"
        );
      } else {
        logManager.info("EcentricPayment", "No receipt bundle found in result");
      }

      return result as EcentricPaymentResult;
    } catch (error) {
      logManager.error("EcentricPayment", "Payment failed", error);
      throw error;
    }
  }

  /**
   * Check if the native module is available and can be used
   */
  isModuleAvailable(): boolean {
    const available = !!EcentricPaymentModule;

    if (!available) {
      logManager.error(
        "EcentricPayment",
        "Native module is not available. App may need to be recompiled."
      );
      // Run diagnostics
      logAvailableNativeModules();
    }

    return available;
  }

  /**
   * Get configuration value for diagnostics
   * @param key The configuration key to get
   * @returns The configuration value or null if not found
   */
  getConfigValue(key: string): string | boolean | null {
    switch (key) {
      case "appURL":
        return this.appURL;
      case "appClass":
        return this.appClass;
      case "merchantID":
        return this.merchantID;
      case "isSunmiDevice":
        return this.isSunmiDevice;
      default:
        return null;
    }
  }

  /**
   * Check if secret key is configured
   */
  hasSecretKey(): boolean {
    return !!(this.secretKey && this.secretKey.length > 0);
  }

  /**
   * Check if access key is configured
   */
  hasAccessKey(): boolean {
    return !!(this.accessKey && this.accessKey.length > 0);
  }

  /**
   * Initialize with dynamic configuration from login response
   * This should be called after successful login when payment config is available
   */
  async initializeWithDynamicConfig(): Promise<boolean> {
    try {
      logManager.info("EcentricPayment", "Loading dynamic configuration from login data...");
      
      const dynamicConfig = await getEcentricConfig();
      
      if (!dynamicConfig) {
        logManager.warn("EcentricPayment", "No dynamic configuration available - using defaults");
        return false;
      }

      logManager.debug("EcentricPayment", "Dynamic config received", {
        hasMerchantId: !!dynamicConfig.merchantId,
        hasSecretKey: !!dynamicConfig.secretKey,
        hasAccessKey: !!dynamicConfig.accessKey,
        appUrl: dynamicConfig.appUrl,
        appClass: dynamicConfig.appClass,
        isSunmiDevice: dynamicConfig.isSunmiDevice,
      });

      // Update configuration with dynamic values (only if they exist)
      if (dynamicConfig.merchantId) {
        this.merchantID = dynamicConfig.merchantId;
      }
      if (dynamicConfig.secretKey) {
        this.secretKey = dynamicConfig.secretKey;
      }
      if (dynamicConfig.accessKey) {
        this.accessKey = dynamicConfig.accessKey;
      }
      
      // Update app configuration if provided (with fallbacks matching legacy)
      if (dynamicConfig.appUrl) {
        this.appURL = dynamicConfig.appUrl;
      }
      if (dynamicConfig.appClass) {
        this.appClass = dynamicConfig.appClass;
      }
      
      // Update device type if provided
      if (dynamicConfig.isSunmiDevice !== undefined) {
        this.isSunmiDevice = dynamicConfig.isSunmiDevice;
        
        // Apply legacy SUNMI device logic
        if (this.isSunmiDevice) {
          logManager.info("EcentricPayment", "Using SUNMI device configuration");
          // For SUNMI devices, always use IntentActivity as per successful implementation
          this.appURL = this.appURL || "ecentric.thumbzup.com";
          this.appClass = this.appClass || "payment.thumbzup.com.IntentActivity";
        } else {
          logManager.info("EcentricPayment", "Using standard device configuration");
          // For standard devices, use values from dynamic config or defaults
          this.appURL = this.appURL || "ecentric.thumbzup.com";
          this.appClass = this.appClass || "payment.thumbzup.com.IntentActivity";
        }
      }
      
      // Update settings if provided
      if (dynamicConfig.receiptRequired !== undefined) {
        this.receiptRequired = dynamicConfig.receiptRequired;
      }
      if (dynamicConfig.showTransactionStatus !== undefined) {
        this.showTransactionStatusScreen = dynamicConfig.showTransactionStatus;
      }

      // Update merchant info if provided
      if (dynamicConfig.merchantPhone) this.merchantInfo.PhoneNo = dynamicConfig.merchantPhone;
      if (dynamicConfig.merchantStreet) this.merchantInfo.Street = dynamicConfig.merchantStreet;
      if (dynamicConfig.merchantUrl) this.merchantInfo.URL = dynamicConfig.merchantUrl;
      if (dynamicConfig.merchantSupportPhone) this.merchantInfo.SupportPhoneNo = dynamicConfig.merchantSupportPhone;
      if (dynamicConfig.merchantCity) this.merchantInfo.City = dynamicConfig.merchantCity;
      if (dynamicConfig.merchantProvince) this.merchantInfo.Province = dynamicConfig.merchantProvince;
      if (dynamicConfig.merchantCountryCode) this.merchantInfo.CountryCode = dynamicConfig.merchantCountryCode;
      if (dynamicConfig.merchantCurrencyCode) this.merchantInfo.CurrencyCode = dynamicConfig.merchantCurrencyCode;
      if (dynamicConfig.merchantPostalCode) this.merchantInfo.PostalCode = dynamicConfig.merchantPostalCode;

      // Validate that we have the essential configuration
      const hasEssentialConfig = !!(this.merchantID && this.secretKey && this.accessKey);
      
      logManager.info("EcentricPayment", "Updated with dynamic configuration", {
        appURL: this.appURL,
        appClass: this.appClass,
        merchantID: this.merchantID ? "****" : "NOT SET",
        secretKey: this.secretKey ? "****" : "NOT SET",
        accessKey: this.accessKey ? "****" : "NOT SET",
        isSunmiDevice: this.isSunmiDevice,
        receiptRequired: this.receiptRequired,
        showTransactionStatusScreen: this.showTransactionStatusScreen,
        hasEssentialConfig: hasEssentialConfig,
      });

      return hasEssentialConfig;
    } catch (error) {
      logManager.error("EcentricPayment", "Failed to initialize with dynamic config", error);
      return false;
    }
  }

  /**
   * Complete post-login flow: Initialize with dynamic config and perform Retail Auth
   * This should be called after successful login and config extraction
   */
  async handlePostLoginFlow(): Promise<boolean> {
    try {
      logManager.info("EcentricPayment", "Starting post-login flow...");
      
      // Step 1: Initialize with dynamic configuration
      const configInitialized = await this.initializeWithDynamicConfig();
      if (!configInitialized) {
        logManager.error("EcentricPayment", "Failed to initialize with dynamic config");
        return false;
      }

      // Step 2: Check if we already have a valid authentication key
      const existingAuth = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (existingAuth) {
        logManager.info("EcentricPayment", "Found existing authentication key, using it");
        this.authenticationKey = existingAuth;
        return true;
      }

      // Step 3: Perform Retail Auth with the new configuration
      logManager.info("EcentricPayment", "No existing auth found, performing Retail Auth...");
      const authKey = await this.performRetailAuth();
      
      if (authKey) {
        logManager.info("EcentricPayment", "Post-login flow completed successfully");
        return true;
      } else {
        logManager.error("EcentricPayment", "Post-login flow failed: No auth key received");
        return false;
      }
      
    } catch (error) {
      logManager.error("EcentricPayment", "Post-login flow failed", error);
      return false;
    }
  }

  /**
   * Launch a sale transaction using Ecentric payment terminal
   * This is the direct method used by the working implementation
   * @param params All parameters required for the transaction
   */
  async launchSaleTransaction(params: any): Promise<any> {
    logManager.info(
      "EcentricPayment",
      "Starting sale transaction with parameters"
    );

    if (!this.isModuleAvailable()) {
      const error = new Error(
        "Ecentric payment module is not available on this device"
      );
      logManager.error("EcentricPayment", "Module not available", {
        error: error.message,
      });
      throw error;
    }

    // Ensure we have an authentication key (use params.authToken first, then fallback to internal)
    if (!params.authToken && !this.authenticationKey) {
      logManager.info(
        "EcentricPayment",
        "No authentication key found, attempting to authenticate"
      );
      try {
        await this.authenticate();
      } catch (error) {
        logManager.error(
          "EcentricPayment",
          "Failed to authenticate with Ecentric payment terminal",
          error
        );
        throw new Error(
          "Failed to authenticate with payment terminal. Please try again."
        );
      }
    }

    const authToken = params.authToken || this.authenticationKey;

    if (!authToken) {
      const error = new Error(
        "Authentication key is missing. Cannot process payment."
      );
      logManager.error("EcentricPayment", error.message);
      throw error;
    }

    try {
      // Call the native module's launchSaleTransaction method
      // This method requires a different parameter structure than launchRetailSale

      logManager.info("EcentricPayment", "LAUNCHING NATIVE SALE TRANSACTION");
      logManager.debug(
        "EcentricPayment",
        "LAUNCHING NATIVE SALE TRANSACTION PARAMETERS",
        {
          appURL: params.appURL || this.appURL,
          appClass: params.appClass || this.appClass,
          merchantID: params.merchantID || this.merchantID,
          authTokenLength: authToken.length,
        }
      );

      // Match the exact parameter ordering from the Java implementation
      const result = await EcentricPaymentModule.launchSaleTransaction(
        params.appURL || this.appURL,
        params.appClass || this.appClass,
        params.merchantID || this.merchantID,
        authToken,
        params.transactionAmount,
        params.transactionUuid,
        params.description || "",
        params.customerName || "",
        params.transactionReferenceNo || "",
        params.cellNumber || "",
        params.emailAddress || "",
        params.isReceiptRequired !== undefined
          ? params.isReceiptRequired
          : true,
        params.alwaysShowTransactionStatusScreen !== undefined
          ? params.alwaysShowTransactionStatusScreen
          : this.showTransactionStatusScreen,
        params.merchantInfoJson || JSON.stringify(this.merchantInfo), // merchantInfoJson
        params.externalSTAN || "0",
        params.externalRRN || "",
        params.externalTransactionGUID || "",
        params.externalInvoiceGUID || "",
        params.externalTransactionDateTime || "",
        params.externalTerminalId || "",
        params.latitude || null,
        params.longitude || null,
        params.accuracy || null,
        params.applicationKey || ""
      );

      logManager.info(
        "EcentricPayment",
        "Sale transaction response received",
        result
      );

      // Check for receipt bundle
      if (result.isReceiptDataAvailable === true && result.receiptBundle) {
        logManager.info(
          "EcentricPayment",
          "Sale transaction receipt bundle found",
          result.receiptBundle
        );
      } else if (result.isReceiptDataAvailable === true) {
        logManager.warn(
          "EcentricPayment",
          "isReceiptDataAvailable is true but no receipt bundle found in sale transaction result"
        );
      } else {
        logManager.info(
          "EcentricPayment",
          "No receipt bundle found in sale transaction result"
        );
      }

      // Return the result processing response based on the working implementation
      if (
        result.resultCode === "01" ||
        result.isApproved === true ||
        result.isApproved === "true"
      ) {
        logManager.info("EcentricPayment", "Transaction successful");
        return {
          success: true,
          isApproved: true,
          resultCode: result.resultCode,
          resultDescription: result.resultDescription,
          receiptBundle: result.receiptBundle || null,
          ...result,
        };
      } else {
        logManager.error("EcentricPayment", "Transaction failed", result);
        return {
          success: false,
          isApproved: false,
          resultCode: result.resultCode,
          resultDescription: result.resultDescription,
          errorType: result.errorType || "ERROR",
          errorDescription: result.resultDescription || result.description,
          errorMessage: result.message,
          errorReference: result.reference,
          ...result,
        };
      }
    } catch (error) {
      logManager.error("EcentricPayment", "Sale transaction failed", error);

      // Special handling for timeout errors
      if (error instanceof Error && error.message.includes("timed out")) {
        logManager.info(
          "EcentricPayment",
          "TIMEOUT ERROR: Sale transaction timed out"
        );
        return {
          success: false,
          errorType: "TIMEOUT",
          errorDescription:
            "Sale transaction timed out. Check if Ecentric app is responding.",
          errorMessage: error.message,
        };
      }

      return {
        success: false,
        errorType: "UNKNOWN",
        errorDescription:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

// Export a singleton instance
export default new EcentricPayment();
