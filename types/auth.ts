// =============================================================================
// AUTH TYPES (AUTH_APP - Hospitality)
// =============================================================================

export interface HospitalityUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  position: string;
  contactNumber: string;
  employeeId: string;
  organizationId: number;
  organizationName: string;
  organizationSlug: string;
  regionId: number;
  regionName: string;
  storeId: number;
  storeName: string;
  isAdmin: boolean;
  isStoreManager: boolean;
  canAccessMultipleStores: boolean;
  permissions: string[];
  availableOrganizations: AvailableOrganization[];
  modules: UserModule[];
}

export interface AvailableOrganization {
  id: number;
  name: string;
  slug: string;
  role: string;
  isDefault: boolean;
}

export interface UserModule {
  name: string;
  isActive: boolean;
  icon?: string;
  route?: string;
  subModules?: UserModule[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSession {
  id: string;
  expiresAt: string;
}

export interface OrganizationConfigItem {
  id: number;
  organizationId: number;
  key: string;
  value: string | Record<string, unknown>;
  dataType: string;
  description?: string;
  isEditable: boolean;
  isPublic: boolean;
}

export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: string;
}

export interface LoginResponse {
  message: string;
  isFirstLogin: boolean;
  tokens: AuthTokens;
  user: HospitalityUser;
  session: AuthSession;
  organizationConfig: OrganizationConfigItem[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  status: 'success';
  message: string;
  data: {
    accessToken: string;
    expiresIn: number;
  };
}

export interface ValidateSessionResponse {
  status: 'success';
  message: string;
  data: {
    valid: boolean;
    user: {
      id: number;
      email: string;
      username: string;
      role: string;
      organizationId: number;
      regionId: number;
      storeId: number;
      sessionId: string;
    };
  };
}

export interface ProfileResponse {
  status: 'success';
  message: string;
  data: HospitalityUser & {
    twoFactorEnabled: boolean;
    emailVerified: boolean;
  };
}

export interface SessionInfo {
  sessionId: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
  lastActivity: string;
  expiresAt: string;
  store?: string;
  organization?: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}
