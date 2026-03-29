import { Platform, NativeModules } from 'react-native';
import * as Crypto from 'expo-crypto';
import logManager from './LogManager';
import { getPaymentConfig } from '../config/dynamicAppConfig';
import { 
  CenDroidOperation, 
  CenDroidTransactionResultCode, 
  CenDroidRequest, 
  CenDroidResponse, 
  CenDroidSettings 
} from '../types/api';

const { CenDroidLauncher } = NativeModules;

export interface CendroidPaymentResult {
  success: boolean;
  approved: boolean;
  transactionResultCode: CenDroidTransactionResultCode;
  uuid?: string;
  amount?: number;
  panHash?: string;
  authCode?: string;
  transactionId?: string;
  cardLastFourDigits?: string;
  ecrHostResponse?: string;
  errorMessage?: string;
  cendroidResponse?: CenDroidResponse;
}

class CendroidPayment {
  private static instance: CendroidPayment;
  private isProcessing = false;
  private settings: CenDroidSettings | null = null;

  private constructor() {}

  public static getInstance(): CendroidPayment {
    if (!CendroidPayment.instance) {
      CendroidPayment.instance = new CendroidPayment();
    }
    return CendroidPayment.instance;
  }

  /**
   * Check if CenDroid native module is available
   */
  public static isModuleAvailable(): boolean {
    return Platform.OS === 'android' && !!CenDroidLauncher;
  }

  /**
   * Check if CenDroid is configured
   */
  public async isConfigured(): Promise<boolean> {
    try {
      const paymentConfig = await getPaymentConfig();
      return !!(paymentConfig.cendroid && paymentConfig.cendroid.enabled);
    } catch (error) {
      logManager.error('CendroidPayment', 'Error checking configuration', error);
      return false;
    }
  }

  /**
   * Initialize CenDroid with dynamic configuration
   */
  public async initializeWithDynamicConfig(): Promise<boolean> {
    try {
      logManager.info('CendroidPayment', 'Initializing CenDroid with dynamic configuration...');
      
      const paymentConfig = await getPaymentConfig();
      
      if (!paymentConfig.cendroid) {
        logManager.warn('CendroidPayment', 'No CenDroid configuration found');
        return false;
      }

      if (!paymentConfig.cendroid.enabled) {
        logManager.warn('CendroidPayment', 'CenDroid is disabled in configuration');
        return false;
      }

      // Use 'NexoApp' as default caller if not provided (same as Nexo Lite)
      const caller = paymentConfig.cendroid.caller || 'NexoApp';
      logManager.info('CendroidPayment', 'Using caller:', caller);

      this.settings = {
        enabled: paymentConfig.cendroid.enabled,
        caller: caller,
        testMode: paymentConfig.cendroid.testMode || false,
        timeout: paymentConfig.cendroid.timeout || 60
      };

      logManager.info('CendroidPayment', 'CenDroid initialized successfully', {
        caller: this.settings.caller,
        testMode: this.settings.testMode,
        timeout: this.settings.timeout
      });

      return true;
    } catch (error) {
      logManager.error('CendroidPayment', 'Failed to initialize CenDroid', error);
      return false;
    }
  }

  /**
   * Process a payment using CenDroid
   */
  public async processPayment(amount: number, reference: string, options?: any): Promise<CendroidPaymentResult> {
    if (this.isProcessing) {
      return {
        success: false,
        approved: false,
        transactionResultCode: CenDroidTransactionResultCode.UNKNOWN,
        errorMessage: 'Another payment is already being processed'
      };
    }

    if (!this.settings) {
      return {
        success: false,
        approved: false,
        transactionResultCode: CenDroidTransactionResultCode.UNKNOWN,
        errorMessage: 'CenDroid is not initialized'
      };
    }

    this.isProcessing = true;

    try {
      logManager.info('CendroidPayment', 'Processing payment', { amount, reference });

      const time = Date.now().toString();
      const invocationKey = await this.generateInvocationKey(time);

      const request: CenDroidRequest = {
        operation: CenDroidOperation.SALE,
        time,
        caller: this.settings.caller,
        invocationKey,
        amount,
        customHeading: 'Nexo Payment',
        reference: `REF-${time.slice(-8)}`,
        ecrHostTransfer: 'Nexo Transaction'
      };

      logManager.info('CendroidPayment', 'Launching CenDroid with request', request);

      const result: CenDroidResponse = await CenDroidLauncher.launchCenDroid(request);

      logManager.info('CendroidPayment', 'CenDroid response received', result);

      if (result.resultCode === -1) { // Android.RESULT_OK
        const payload = result.payload || {};
        
        // Check if the transaction was actually approved
        const isApproved = payload.Approved === true;
        const transactionResultCode = payload.TransactionResultCode !== undefined 
          ? this.mapResultCodeToCenDroidCode(payload.TransactionResultCode)
          : CenDroidTransactionResultCode.UNKNOWN;
        
        logManager.info('CendroidPayment', 'Transaction details', {
          approved: isApproved,
          transactionResultCode: transactionResultCode,
          payload: payload
        });
        
        return {
          success: isApproved, // Only successful if actually approved
          approved: isApproved,
          transactionResultCode: transactionResultCode,
          uuid: payload.UUID,
          amount: payload.Amount ? payload.Amount / 100 : amount,
          panHash: payload.PANHash,
          authCode: payload.AuthCode,
          transactionId: payload.UUID,
          cardLastFourDigits: payload.PANHash ? payload.PANHash.slice(-4) : '',
          ecrHostResponse: payload.EcrHostResponse,
          errorMessage: isApproved ? undefined : this.getErrorMessageFromResultCode(payload.TransactionResultCode || 0),
          cendroidResponse: result
        };
      } else {
        const resultCode = this.mapResultCodeToCenDroidCode(result.resultCode);
        return {
          success: false,
          approved: false,
          transactionResultCode: resultCode,
          errorMessage: this.getErrorMessageFromResultCode(result.resultCode),
          cendroidResponse: result
        };
      }
    } catch (error) {
      logManager.error('CendroidPayment', 'Payment processing error', error);
      return {
        success: false,
        approved: false,
        transactionResultCode: CenDroidTransactionResultCode.UNKNOWN,
        errorMessage: error instanceof Error ? error.message : 'Payment processing failed'
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate invocation key using triple hash algorithm
   */
  private async generateInvocationKey(timeString: string): Promise<string> {
    try {
      const sha1 = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA1, 
        timeString
      );
      const sha256 = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, 
        sha1
      );
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA512, 
        sha256
      );
    } catch (error) {
      logManager.error('CendroidPayment', 'Error generating invocation key', error);
      throw new Error('Failed to generate security key');
    }
  }

  /**
   * Map Android result code to CenDroid transaction result code
   */
  private mapResultCodeToCenDroidCode(code: number): CenDroidTransactionResultCode {
    switch (code) {
      case 0: return CenDroidTransactionResultCode.UNKNOWN;
      case 1: return CenDroidTransactionResultCode.APPROVE;
      case 2: return CenDroidTransactionResultCode.DECLINE;
      case 3: return CenDroidTransactionResultCode.REJECT;
      case 4: return CenDroidTransactionResultCode.HOST;
      case 5: return CenDroidTransactionResultCode.VOICE;
      case 6: return CenDroidTransactionResultCode.COMMS_FAIL;
      default: return CenDroidTransactionResultCode.UNKNOWN;
    }
  }

  /**
   * Get error message from result code
   */
  private getErrorMessageFromResultCode(code: number): string {
    switch (code) {
      case 0: return 'Transaction cancelled';
      case 1: return 'Transaction approved';
      case 2: return 'Transaction declined';
      case 3: return 'Transaction rejected';
      case 4: return 'Host authorization required';
      case 5: return 'Voice authorization required';
      case 6: return 'Communication failure';
      default: return 'Unknown error occurred';
    }
  }

  /**
   * Cancel current payment processing
   */
  public cancelPayment(): void {
    this.isProcessing = false;
    logManager.info('CendroidPayment', 'Payment processing cancelled');
  }

  /**
   * Clear cached settings (useful for logout)
   */
  public clearCachedSettings(): void {
    this.settings = null;
    this.isProcessing = false;
    logManager.info('CendroidPayment', 'Cached settings cleared');
  }

  /**
   * Get current settings
   */
  public getSettings(): CenDroidSettings | null {
    return this.settings;
  }

  /**
   * Check if currently processing
   */
  public isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

export default CendroidPayment.getInstance();
