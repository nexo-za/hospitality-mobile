import { setAuthToken, clearAuthToken } from './api';
import storage, { STORAGE_KEYS } from './storage';
import authService from '../api/services/authService';
import type {
  HospitalityUser,
  LoginRequest,
  LoginResponse,
  OrganizationConfigItem,
} from '../types/auth';

export type User = HospitalityUser;

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

class UserService {
  private static instance: UserService;
  private _currentUser: User | null = null;
  private _isAuthenticated: boolean = false;
  private _organizationConfig: OrganizationConfigItem[] = [];

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  get currentUser(): User | null {
    return this._currentUser;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get organizationConfig(): OrganizationConfigItem[] {
    return this._organizationConfig;
  }

  async getAccessToken(): Promise<string | null> {
    return await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN, false);
  }

  /**
   * Initialise from persisted storage on app start.
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[UserService] Initializing');

      const [userData, userId, accessToken] = await Promise.all([
        storage.getItem(STORAGE_KEYS.USER_DATA),
        storage.getItem(STORAGE_KEYS.USER_ID, false),
        storage.getItem(STORAGE_KEYS.ACCESS_TOKEN, false),
      ]);

      if (!userData || !userId) {
        this._isAuthenticated = false;
        this._currentUser = null;
        return false;
      }

      this._currentUser = userData;
      this._isAuthenticated = true;

      if (accessToken) {
        setAuthToken(accessToken);
      }

      const orgConfig = await storage.getItem('organization_config');
      if (orgConfig) {
        this._organizationConfig = orgConfig;
      }

      return true;
    } catch (error) {
      console.error('[UserService] Initialization error:', error);
      this._isAuthenticated = false;
      this._currentUser = null;
      return false;
    }
  }

  /**
   * Log in via the hospitality auth API.
   */
  async login(
    credentials: LoginCredentials
  ): Promise<{ userData: User; response: LoginResponse }> {
    const loginReq: LoginRequest = {
      email: credentials.username,
      username: credentials.username,
      password: credentials.password,
      rememberMe: credentials.rememberMe,
    };

    const response = await authService.login(loginReq);

    const userData: User = response.user;
    this._currentUser = userData;
    this._isAuthenticated = true;
    this._organizationConfig = response.organizationConfig || [];

    if (credentials.rememberMe) {
      await storage.setItem(STORAGE_KEYS.REMEMBERED_USERNAME, credentials.username);
    } else {
      await storage.removeItem(STORAGE_KEYS.REMEMBERED_USERNAME);
    }

    return { userData, response };
  }

  async logout(): Promise<void> {
    await authService.logout();
    this._currentUser = null;
    this._isAuthenticated = false;
    this._organizationConfig = [];
  }

  async getRememberedUsername(): Promise<string | null> {
    return await storage.getItem(STORAGE_KEYS.REMEMBERED_USERNAME, false);
  }

  /**
   * Validate the current session against the server.
   * Returns `true` when the server confirms the token is valid.
   * Returns `false` when the server explicitly rejects the token (401/403).
   * Throws when the server is unreachable (network error) so callers can
   * decide whether to allow offline access.
   */
  async testApiAuthentication(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return false;

    const result = await authService.validateSession();
    return result?.data?.valid === true;
  }

  hasPermission(permission: string): boolean {
    if (!this._currentUser) return false;
    return this._currentUser.permissions.includes(permission);
  }

  /**
   * Look up an organization-config value by key.
   */
  getConfigValue(key: string): OrganizationConfigItem | undefined {
    return this._organizationConfig.find((c) => c.key === key);
  }

  logCurrentUser(): void {
    if (this._currentUser) {
      console.log('Current User:', {
        id: this._currentUser.id,
        username: this._currentUser.username,
        email: this._currentUser.email,
        role: this._currentUser.role,
        storeId: this._currentUser.storeId,
        storeName: this._currentUser.storeName,
        permissions: this._currentUser.permissions,
      });
    } else {
      console.log('No user is currently logged in');
    }
  }
}

export default UserService.getInstance();
