# Automatic Token Refresh System

This document describes the automatic token refresh system implemented to handle 401 "Invalid or expired token" errors.

## Overview

The system automatically detects when API calls fail due to expired access tokens and attempts to refresh them using the stored refresh token. If successful, it retries the original request. If unsuccessful, it redirects the user to the login screen.

## Components

### 1. TokenRefreshService (`api/services/tokenRefreshService.ts`)

- **Singleton service** that manages token refresh operations
- **Prevents multiple simultaneous refresh attempts** using a queue system
- **Stores new access tokens** in both SecureStore and AsyncStorage
- **Updates API instance headers** with new tokens

### 2. AuthErrorHandler (`utils/authErrorHandler.ts`)

- **Centralized error handling** for authentication failures
- **Provides user-friendly error messages**
- **Handles navigation to login** when refresh fails
- **Prevents multiple simultaneous error handling**

### 3. API Interceptors (`api/api.ts`)

- **Automatic 401 error detection** in response interceptor
- **Token refresh and retry logic** for failed requests
- **Prevents infinite retry loops** using request marking

### 4. Enhanced UserService (`utils/userService.ts`)

- **Stores refresh tokens** during login
- **Clears all tokens** during logout
- **Secure storage** using both SecureStore and AsyncStorage

## How It Works

### 1. Login Flow
```
User Login → Store Access Token + Refresh Token → API calls work normally
```

### 2. Token Expiration Flow
```
API Call → 401 Error → Detect in Interceptor → Attempt Token Refresh → Retry Original Request
```

### 3. Refresh Failure Flow
```
Token Refresh Fails → Clear All Tokens → Redirect to Login → User must login again
```

## API Endpoints

### Refresh Token Endpoint
```
POST /api/auth/refresh
{
  "refreshToken": "string"
}
```

### Success Response
```json
{
  "status": "success",
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_jwt_token",
    "expiresIn": 43200
  }
}
```

### Error Responses
```json
{
  "status": "error",
  "message": "Refresh token is required"
}
```

```json
{
  "status": "error",
  "message": "Invalid or expired refresh token"
}
```

## Configuration

### Storage Keys
- `auth_token` - Current access token (SecureStore + AsyncStorage)
- `refresh_token` - Refresh token for getting new access tokens (SecureStore + AsyncStorage)

### Environment Variables
The system uses existing API configuration from `config/appConfig.ts` for basic authentication.

## Usage Examples

### Basic API Call (Automatic Refresh)
```typescript
// The system automatically handles token refresh
const customers = await customerService.getCustomers();
```

### Manual Token Refresh
```typescript
import TokenRefreshService from "@/api/services/tokenRefreshService";

const tokenRefreshService = TokenRefreshService.getInstance();
const newToken = await tokenRefreshService.refreshToken();
```

### Custom Error Handling
```typescript
import AuthErrorHandler from "@/utils/authErrorHandler";

try {
  const result = await apiCall();
} catch (error) {
  const authHandler = AuthErrorHandler.getInstance();
  
  if (authHandler.isAuthError(error)) {
    const message = authHandler.getAuthErrorMessage(error);
    // Show user-friendly message
    console.log(message);
  }
}
```

## Error Handling

### Automatic Retry
- **401 errors** automatically trigger token refresh
- **Original request is retried** with new token
- **No code changes required** in existing API calls

### Fallback Behavior
- **Refresh token expired** → Clear tokens and redirect to login
- **Network errors** → Standard error handling
- **Server errors** → Standard error handling

## Security Features

### Token Storage
- **Access tokens** stored in both SecureStore and AsyncStorage
- **Refresh tokens** stored in SecureStore for maximum security
- **Automatic cleanup** on logout

### Request Protection
- **No infinite retry loops** using request marking
- **Queue system** prevents multiple simultaneous refresh attempts
- **Secure token transmission** using HTTPS

## Troubleshooting

### Common Issues

1. **"No refresh token available"**
   - User needs to login again
   - Refresh token may have expired

2. **"Token refresh failed"**
   - Check network connectivity
   - Verify refresh token endpoint is accessible
   - Check server logs for refresh token validation errors

3. **Infinite redirects to login**
   - Check if login screen is accessible
   - Verify routing configuration
   - Check for circular navigation dependencies

### Debug Logging

The system provides extensive logging:
- `[TokenRefreshService]` - Token refresh operations
- `[API]` - API interceptor operations
- `[AuthErrorHandler]` - Error handling operations
- `[DataService]` - Authentication testing

### Testing

Use the authentication test method:
```typescript
const dataService = DataService.getInstance();
const authResult = await dataService.testAuthentication();
console.log("Auth test result:", authResult);
```

## Migration Notes

### Existing Code
- **No changes required** for existing API calls
- **Automatic token refresh** works transparently
- **Error handling** remains the same

### New Features
- **Automatic retry** for 401 errors
- **Seamless token refresh** without user intervention
- **Improved user experience** with fewer login prompts

## Future Enhancements

1. **Token expiration prediction** - Proactively refresh tokens before they expire
2. **Background refresh** - Refresh tokens in background when app is active
3. **Multiple refresh token support** - Handle multiple concurrent sessions
4. **Offline token validation** - Validate tokens locally when offline

