/**
 * Application Configuration
 *
 * Centralized, single-source-of-truth configuration for the hospitality app.
 * Dev API target can be switched via env without code changes.
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

const isDevelopment = __DEV__;
const DEFAULT_API_PORT = "3000";
const DEFAULT_DEV_MACHINE_IP = "172.20.10.14";

type DevApiTarget = "emulator" | "usb" | "lan";

const getEnv = (key: string): string | undefined => {
  const value = process.env[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  return value.toLowerCase() === "true";
};

const normalizeApiUrl = (url: string): string => {
  let normalized = url.trim();
  if (normalized.endsWith("/v1/")) normalized = normalized.replace("/v1/", "/");
  else if (normalized.endsWith("/v1")) normalized = normalized.replace("/v1", "/");
  if (!normalized.endsWith("/")) normalized = `${normalized}/`;
  return normalized;
};

const getDevTarget = (): DevApiTarget => {
  const envTarget = getEnv("EXPO_PUBLIC_API_TARGET")?.toLowerCase();
  if (envTarget === "usb" || envTarget === "lan" || envTarget === "emulator") {
    return envTarget;
  }
  return "emulator";
};

const buildDevApiUrl = (): string => {
  const port = getEnv("EXPO_PUBLIC_API_PORT") || DEFAULT_API_PORT;
  const target = getDevTarget();

  if (target === "usb") return `http://127.0.0.1:${port}/api`;
  if (target === "lan") {
    const ip = getEnv("EXPO_PUBLIC_DEV_MACHINE_IP") || DEFAULT_DEV_MACHINE_IP;
    return `http://${ip}:${port}/api`;
  }
  return `http://10.0.2.2:${port}/api`;
};

export const API_URLS = {
  EMULATOR_DEV: `http://10.0.2.2:${DEFAULT_API_PORT}/api`,
  USB_DEV: `http://127.0.0.1:${DEFAULT_API_PORT}/api`,
  LAN_DEV: `http://${DEFAULT_DEV_MACHINE_IP}:${DEFAULT_API_PORT}/api`,
  PRODUCTION: "https://hospitality-api.nexo.app/api",
} as const;

const USE_LOCAL_DEV = toBoolean(
  getEnv("EXPO_PUBLIC_USE_LOCAL_DEV"),
  isDevelopment
);

const resolvedApiUrl = (() => {
  const explicitUrl = getEnv("EXPO_PUBLIC_API_URL");
  if (explicitUrl) return explicitUrl;
  if (!USE_LOCAL_DEV) return API_URLS.PRODUCTION;
  return buildDevApiUrl();
})();

const API_CONFIG: ApiConfig = {
  url: normalizeApiUrl(resolvedApiUrl),
  cacheDuration: 3600,
};

const getPlatform = (): "ios" | "android" | "web" => {
  const { Platform } = require("react-native");
  return Platform.OS as "ios" | "android" | "web";
};

export const appConfig: AppConfig = {
  api: {
    ...API_CONFIG,
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
