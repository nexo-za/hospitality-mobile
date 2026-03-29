/**
 * Application Configuration
 *
 * Centralized, single-source-of-truth configuration for the hospitality app.
 * Toggle USE_LOCAL_DEV to switch between local development and production.
 */

export interface ApiConfig {
  url: string;
  cacheDuration: number;
}

export interface AppConfig {
  api: ApiConfig;
  isDevelopment: boolean;
  platform: "ios" | "android" | "web";
}

const USE_LOCAL_DEV = true;

export const API_URLS = {
  LOCAL_DEV: "http://10.0.2.2:3000/api",
  PRODUCTION: "https://hospitality-api.nexo.app/api",
} as const;

const API_CONFIG: ApiConfig = {
  url: USE_LOCAL_DEV ? API_URLS.LOCAL_DEV : API_URLS.PRODUCTION,
  cacheDuration: 3600,
};

const isDevelopment = __DEV__;

const getPlatform = (): "ios" | "android" | "web" => {
  const { Platform } = require("react-native");
  return Platform.OS as "ios" | "android" | "web";
};

export const appConfig: AppConfig = {
  api: {
    ...API_CONFIG,
    url: (() => {
      let url = API_CONFIG.url;
      if (url.endsWith("/v1/")) url = url.replace("/v1/", "/");
      else if (url.endsWith("/v1")) url = url.replace("/v1", "/");
      if (!url.endsWith("/")) url = `${url}/`;
      return url;
    })(),
  },
  isDevelopment,
  platform: getPlatform(),
};

export const getConfig = <T extends keyof AppConfig>(
  section: T,
): AppConfig[T] => {
  return appConfig[section];
};

export const getApiConfig = (): ApiConfig => {
  return appConfig.api;
};

export const isDev = (): boolean => {
  return appConfig.isDevelopment;
};

export const getCurrentPlatform = (): string => {
  return appConfig.platform;
};

export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!appConfig.api.url) errors.push("API URL is required");
  return { isValid: errors.length === 0, errors };
};

export const logConfigStatus = (): void => {
  console.log("[AppConfig] Configuration loaded:", {
    api: { url: appConfig.api.url, cacheDuration: appConfig.api.cacheDuration },
    environment: {
      isDevelopment: appConfig.isDevelopment,
      platform: appConfig.platform,
    },
  });

  const validation = validateConfig();
  if (!validation.isValid) {
    console.warn("[AppConfig] Configuration issues:", validation.errors);
  }
};

if (isDevelopment) {
  logConfigStatus();
}

export default appConfig;
