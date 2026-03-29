import axios, {
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import ApiLogger from "./utils/logger";
import { getApiConfig } from "../config/appConfig";

const apiConfig = getApiConfig();

const api = axios.create({
  baseURL: apiConfig.url,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

const formatTimestamp = () => new Date().toISOString();

const logApiCall = (
  type: "REQUEST" | "RESPONSE" | "RESPONSE_SUCCESS" | "RESPONSE_ERROR" | "REQUEST_FAILED" | "ERROR",
  url: string,
  method: string,
  data?: any,
  status?: number
) => {
  const endpoint = url.replace(/^\/|\/api\//g, "");
  const isProductData =
    endpoint.includes("inventory") ||
    endpoint.includes("product") ||
    endpoint.includes("catalogue");

  if (isProductData && type !== "REQUEST_FAILED" && type !== "ERROR" && type !== "RESPONSE_ERROR") return;

  let loggedData = data;
  if (isProductData && data?.data && Array.isArray(data.data)) {
    loggedData = { ...data, data: `[${data.data.length} items hidden]` };
  }

  const logData = {
    timestamp: formatTimestamp(),
    type,
    endpoint,
    method,
    ...(loggedData && { data: loggedData }),
    ...(status !== undefined && { status }),
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version || "unknown",
  };

  if (__DEV__) console.log(`[API ${type}]`, JSON.stringify(logData, null, 2));

  ApiLogger.getInstance().addLog({
    timestamp: logData.timestamp,
    type,
    endpoint,
    method,
    params: type === "REQUEST" ? loggedData : undefined,
    data: type !== "REQUEST" ? loggedData : undefined,
    status,
  });
};

// Request interceptor — Bearer JWT only
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    logApiCall(
      "REQUEST",
      config.url || "",
      config.method?.toUpperCase() || "GET",
      config.params || config.data
    );
    return config;
  },
  (error: Error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Automatic token refresh on 401
// ---------------------------------------------------------------------------

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => {
    logApiCall(
      "RESPONSE_SUCCESS",
      response.config.url || "",
      response.config.method?.toUpperCase() || "GET",
      response.data
    );
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (token) originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const AuthService = (await import("./services/authService")).default;
        const newToken = await AuthService.refreshToken();
        if (newToken) {
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        processQueue(new Error("Token refresh returned null"), null);
      } catch (refreshError) {
        processQueue(refreshError, null);
      } finally {
        isRefreshing = false;
      }

      return Promise.reject(error);
    }

    const errorData = error.response
      ? { status: error.response.status, data: error.response.data }
      : { message: error.message };

    logApiCall(
      error.response ? "RESPONSE_ERROR" : "REQUEST_FAILED",
      error.config?.url || "unknown",
      error.config?.method?.toUpperCase() || "GET",
      errorData,
      error.response?.status
    );

    return Promise.reject(error);
  }
);

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  data?: any;
}

export default api;
