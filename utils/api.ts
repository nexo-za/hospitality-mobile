import api from "../api/api";
import storage, { STORAGE_KEYS } from "./storage";

/**
 * Set or clear the Bearer token on the shared axios instance.
 * Call after login with the access token, or with empty string to clear.
 */
export function setAuthToken(token: string) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }
}

export function clearAuthToken(): void {
  setAuthToken("");
}

export function getAuthStatus(): {
  hasBearerToken: boolean;
  authMethod: "Bearer" | "None";
} {
  const authHeader = api.defaults.headers.common["Authorization"];
  const hasBearerToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ");
  return {
    hasBearerToken,
    authMethod: hasBearerToken ? "Bearer" : "None",
  };
}

export async function isTokenExpired(): Promise<boolean> {
  try {
    const accessToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN, false);
    return !accessToken;
  } catch {
    return true;
  }
}
