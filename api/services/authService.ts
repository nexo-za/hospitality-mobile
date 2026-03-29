import api from "../api";
import storage, { STORAGE_KEYS } from "../../utils/storage";
import { setAuthToken, clearAuthToken } from "../../utils/api";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  ValidateSessionResponse,
  ProfileResponse,
  SessionInfo,
  LogoutRequest,
  HospitalityUser,
  OrganizationConfigItem,
} from "../../types/auth";

const AUTH_BASE = "/auth";

class AuthService {
  private static instance: AuthService;
  private refreshPromise: Promise<string | null> | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<{ status: string; data: LoginResponse }>(
      `${AUTH_BASE}/login`,
      {
        email: credentials.email,
        username: credentials.username,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
        deviceInfo: credentials.deviceInfo,
      },
    );

    const loginData = response.data.data ?? response.data;
    await this.persistAuthData(loginData);
    return loginData as LoginResponse;
  }

  async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private lastRefreshFailure: number = 0;
  private static readonly REFRESH_COOLDOWN_MS = 10_000;
  private static readonly MAX_REFRESH_RETRIES = 3;

  private async _doRefresh(): Promise<string | null> {
    const now = Date.now();
    if (now - this.lastRefreshFailure < AuthService.REFRESH_COOLDOWN_MS) {
      console.warn(
        "[AuthService] Skipping refresh — cooldown active for",
        Math.ceil(
          (AuthService.REFRESH_COOLDOWN_MS - (now - this.lastRefreshFailure)) /
            1000,
        ),
        "more seconds",
      );
      return null;
    }

    try {
      const refreshToken = await this.getStoredRefreshToken();
      if (!refreshToken) {
        console.warn("[AuthService] No refresh token available");
        return null;
      }

      const accessToken = await this._attemptRefreshWithRetry(refreshToken);
      if (!accessToken) return null;

      setAuthToken(accessToken);
      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      this.lastRefreshFailure = 0;
      return accessToken;
    } catch (error) {
      this.lastRefreshFailure = Date.now();
      console.error("[AuthService] Token refresh failed:", error);
      return null;
    }
  }

  private async _attemptRefreshWithRetry(
    refreshToken: string,
  ): Promise<string | null> {
    let lastError: any;

    for (let attempt = 0; attempt < AuthService.MAX_REFRESH_RETRIES; attempt++) {
      try {
        const response = await api.post<RefreshTokenResponse>(
          `${AUTH_BASE}/refresh`,
          { refreshToken },
        );

        const { accessToken, expiresIn } = response.data.data;
        console.log(
          `[AuthService] Token refreshed, expires in ${expiresIn}s`,
        );
        return accessToken;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;

        if (status === 429) {
          const retryAfterHeader = error.response?.headers?.["retry-after"];
          const retryAfterMs = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000
            : Math.min(1000 * 2 ** attempt, 8000);

          console.warn(
            `[AuthService] Rate limited (429), retrying in ${retryAfterMs}ms (attempt ${attempt + 1}/${AuthService.MAX_REFRESH_RETRIES})`,
          );
          await this._sleep(retryAfterMs);
          continue;
        }

        break;
      }
    }

    throw lastError;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async validateSession(): Promise<ValidateSessionResponse | null> {
    try {
      const response = await api.get<ValidateSessionResponse>(
        `${AUTH_BASE}/validate`,
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return null;
      }
      throw error;
    }
  }

  async getProfile(): Promise<HospitalityUser | null> {
    try {
      const response = await api.get<ProfileResponse>(`${AUTH_BASE}/profile`);
      return response.data.data as unknown as HospitalityUser;
    } catch {
      return null;
    }
  }

  async getSessions(): Promise<SessionInfo[]> {
    try {
      const response = await api.get<{
        status: string;
        data: SessionInfo[];
      }>(`${AUTH_BASE}/sessions`);
      return response.data.data;
    } catch {
      return [];
    }
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    try {
      await api.delete(`${AUTH_BASE}/sessions/${sessionId}`);
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = await this.getStoredRefreshToken();
      const body: LogoutRequest = {};
      if (refreshToken) body.refreshToken = refreshToken;
      await api.post(`${AUTH_BASE}/logout`, body);
    } catch {
      // Best-effort server logout; always clean up locally
    }

    await this.clearAuthData();
  }

  // ---------------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------------

  private async persistAuthData(loginData: LoginResponse): Promise<void> {
    const { tokens, user, session, organizationConfig } = loginData;

    setAuthToken(tokens.accessToken);

    await Promise.all([
      storage.setItem(STORAGE_KEYS.USER_DATA, user),
      storage.setItem(STORAGE_KEYS.USER_ID, user.id.toString()),
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
      storage.setItem("session_id", session.id),
      storage.setItem("organization_config", organizationConfig),
    ]);

    if (Platform.OS !== "web") {
      try {
        await SecureStore.setItemAsync("refresh_token", tokens.refreshToken);
      } catch {
        // Already stored in AsyncStorage above
      }
    }
  }

  async clearAuthData(): Promise<void> {
    clearAuthToken();

    await Promise.all([
      storage.removeItem(STORAGE_KEYS.USER_DATA),
      storage.removeItem(STORAGE_KEYS.USER_ID),
      storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      storage.removeItem(STORAGE_KEYS.API_TOKEN),
      storage.removeItem("session_id"),
      storage.removeItem("organization_config"),
    ]);

    if (Platform.OS !== "web") {
      try {
        await SecureStore.deleteItemAsync("refresh_token");
        await SecureStore.deleteItemAsync("auth_token");
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  async getStoredRefreshToken(): Promise<string | null> {
    if (Platform.OS !== "web") {
      try {
        const token = await SecureStore.getItemAsync("refresh_token");
        if (token) return token;
      } catch {
        // Fall through to AsyncStorage
      }
    }
    return storage.getItem(STORAGE_KEYS.REFRESH_TOKEN, false);
  }

  async verifyPin(userId: number, pin: string): Promise<boolean> {
    try {
      // Try the hospitality endpoint first; fall back to the legacy retail endpoint
      // if the hospitality backend doesn't implement PIN verification yet.
      const response = await api.post<{
        status: string;
        data?: { verified?: boolean };
      }>("/auth/verify-pin", { userId, pin });
      return (
        response.data?.status === "success" ||
        response.data?.data?.verified === true
      );
    } catch {
      try {
        // Legacy endpoint fallback
        const legacy = await api.post<{ status: string }>("/verify_pin", {
          user_id: userId,
          pin,
        });
        return legacy.data?.status === "success";
      } catch {
        return false;
      }
    }
  }

  async getOrganizationConfig(): Promise<OrganizationConfigItem[]> {
    const config = await storage.getItem("organization_config");
    return config || [];
  }
}

export default AuthService.getInstance();
