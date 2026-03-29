/**
 * Dynamic App Config — Payment configuration loaded from server after login.
 * API URL comes from appConfig.ts (single source of truth).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIG_KEY = 'nexo_app_config';

export async function getPaymentConfig() {
    try {
        const dynamicConfig = await loadAppConfig();
        if (dynamicConfig?.paymentConfig) {
            return dynamicConfig.paymentConfig;
        }
        return {};
    } catch (error) {
        console.error("[DynamicAppConfig] Error getting payment config:", error);
        return {};
    }
}

export async function getAppConfig() {
    try {
        const dynamicConfig = await loadAppConfig();
        return { paymentConfig: dynamicConfig?.paymentConfig || {} };
    } catch (error) {
        console.error("[DynamicAppConfig] Error getting app config:", error);
        return { paymentConfig: {} };
    }
}

export async function testDynamicConfig() {
    try {
        const paymentConfig = await getPaymentConfig();
        return {
            success: true,
            paymentConfig,
            hasPaymentConfig: Object.keys(paymentConfig).length > 0,
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function saveAppConfig(config) {
    try {
        await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
        console.error("[DynamicAppConfig] Error saving config:", error);
    }
}

export async function loadAppConfig() {
    try {
        const value = await AsyncStorage.getItem(CONFIG_KEY);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error("[DynamicAppConfig] Error loading config:", error);
        return null;
    }
}

export async function extractAndSaveConfigFromLoginResponse(response) {
    if (!response) return;

    try {
        const organisationConfigArray = response.organizationConfig || [];
        if (!Array.isArray(organisationConfigArray) || organisationConfigArray.length === 0) return;

        const merchantPaymentSettings = organisationConfigArray.find(config => config.key === 'merchant_payment_settings');
        if (!merchantPaymentSettings?.value) return;

        let paymentSettings;
        try {
            paymentSettings = JSON.parse(merchantPaymentSettings.value);
        } catch (e) {
            console.error("[DynamicAppConfig] Failed to parse payment settings JSON:", e);
            return;
        }

        if (!paymentSettings || typeof paymentSettings !== 'object') return;

        let paymentConfig = {};

        if (paymentSettings.ecentric) {
            const ec = paymentSettings.ecentric;
            paymentConfig.ecentric = {
                enabled: ec.enabled ?? true,
                testMode: ec.testMode ?? false,
                merchantId: ec.merchantId || ec.merchant_id,
                secretKey: ec.secretKey || ec.secret_key,
                accessKey: ec.accessKey || ec.access_key,
                appUrl: ec.appUrl || ec.app_url || "ecentric.thumbzup.com",
                appClass: ec.appClass || ec.app_class || "payment.thumbzup.com.IntentActivity",
                isSunmiDevice: ec.isSunmiDevice ?? true,
                receiptRequired: ec.receiptRequired ?? true,
                showTransactionStatus: ec.showTransactionStatus ?? false,
                timeout: ec.timeout || 60,
                retryAttempts: ec.retryAttempts || 3,
                merchantPhone: ec.merchantPhone || ec.merchant_phone || "",
                merchantStreet: ec.merchantStreet || ec.merchant_street || "",
                merchantUrl: ec.merchantUrl || ec.merchant_url || "",
                merchantSupportPhone: ec.merchantSupportPhone || ec.merchant_support_phone || "",
                merchantCity: ec.merchantCity || ec.merchant_city || "",
                merchantProvince: ec.merchantProvince || ec.merchant_province || "",
                merchantCountryCode: ec.merchantCountryCode || ec.merchant_country_code || "ZA",
                merchantCurrencyCode: ec.merchantCurrencyCode || ec.merchant_currency_code || "ZAR",
                merchantPostalCode: ec.merchantPostalCode || ec.merchant_postal_code || "",
            };
        }

        if (paymentSettings.cash) {
            paymentConfig.cash = {
                enabled: paymentSettings.cash.enabled ?? true,
                requireExactChange: paymentSettings.cash.requireExactChange || false,
                allowChangeGiving: paymentSettings.cash.allowChangeGiving ?? true,
                maxCashTransaction: paymentSettings.cash.maxCashTransaction || 10000,
            };
        }

        if (paymentSettings.card) {
            paymentConfig.card = {
                enabled: paymentSettings.card.enabled ?? true,
                contactless: paymentSettings.card.contactless ?? true,
                chipAndPin: paymentSettings.card.chipAndPin ?? true,
                swipe: paymentSettings.card.swipe ?? true,
                minimumAmount: paymentSettings.card.minimumAmount || 0.01,
            };
        }

        if (paymentSettings.cendroid) {
            paymentConfig.cendroid = {
                enabled: paymentSettings.cendroid.enabled ?? true,
                caller: paymentSettings.cendroid.caller || "NexoApp",
                testMode: paymentSettings.cendroid.testMode ?? false,
                timeout: paymentSettings.cendroid.timeout || 60,
            };
        }

        await saveAppConfig({ paymentConfig });
        return { paymentConfig };
    } catch (error) {
        console.error('[DynamicAppConfig] Error extracting config:', error);
        throw error;
    }
}

export async function getEcentricConfig() {
    try {
        const dynamicConfig = await loadAppConfig();
        return dynamicConfig?.paymentConfig?.ecentric || null;
    } catch (error) {
        console.error("[DynamicAppConfig] Error getting Ecentric config:", error);
        return null;
    }
}

export async function getCendroidConfig() {
    try {
        const dynamicConfig = await loadAppConfig();
        return dynamicConfig?.paymentConfig?.cendroid || null;
    } catch (error) {
        console.error("[DynamicAppConfig] Error getting CenDroid config:", error);
        return null;
    }
}
