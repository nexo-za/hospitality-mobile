# Dynamic Configuration System

This document explains how the dynamic configuration system works in the Nexo mobile app.

## Overview

The app uses a hybrid configuration system:
- **Static Configuration**: API base URL and core settings remain constant
- **Dynamic Configuration**: Payment settings are updated after login based on server response

## How It Works

### 1. Static Configuration (API & Core Settings)
- The app starts with static configuration values defined in `config/appConfig.ts`
- API base URL (`http://192.168.1.143:3005/api`) remains constant throughout the app lifecycle
- Core authentication and cache settings are static

### 2. Dynamic Configuration (Payment Settings Only)
- When a user logs in, the server response contains `organizationConfig` with payment settings
- The `extractAndSaveConfigFromLoginResponse` function extracts payment configuration and saves it to AsyncStorage
- Payment-related settings (Ecentric, Altron, etc.) are dynamically updated

### 3. Configuration Priority
1. **Payment Config**: Dynamic (from AsyncStorage, after login)
2. **API Config**: Static (from appConfig.ts, never changes)

## Key Files

### `config/dynamicAppConfig.js`
- Main dynamic configuration module
- Functions to save/load payment config from AsyncStorage
- Functions to extract payment config from login response
- **API configuration remains static**

### `config/appConfig.ts`
- Static configuration definitions
- API base URL and core settings
- Payment configuration defaults

### `api/api.ts`
- Main API client configuration
- **Static base URL** - never changes after initialization
- Axios instance with fixed base URL

### `contexts/AuthContext.tsx`
- Integrates payment configuration with login flow
- **No API base URL updates** - only payment config is saved
- Tests payment configuration after updates

## Configuration Flow

```
1. App starts → Uses static config for API, no payment config
2. User logs in → Server returns organization payment config
3. Payment config extracted → Saved to AsyncStorage
4. API base URL remains unchanged → All API calls use same URL
5. Payment configuration tested → Verified working correctly
```

## Functions

### `getApiConfig()`
- Returns static API configuration
- Base URL never changes
- Used for all API calls

### `getPaymentConfig()`
- Returns dynamic payment configuration from AsyncStorage
- Falls back to empty object if no dynamic config
- Used for payment processing

### `testDynamicConfig()`
- Tests that payment configuration is working
- Logs current configuration status
- Returns test results for debugging

## Usage

### For API Calls (Static)
```typescript
import { getApiConfig } from '@/config/appConfig';

const config = getApiConfig(); // Always returns same URL
console.log('API URL:', config.url); // Never changes
```

### For Payment Processing (Dynamic)
```typescript
import { getPaymentConfig } from '@/config/dynamicAppConfig';

const paymentConfig = await getPaymentConfig();
// Use paymentConfig for Ecentric, Altron, etc.
```

## Benefits

1. **Stable API Endpoints**: API base URL remains consistent
2. **Flexible Payment Settings**: Payment configuration can vary by organization
3. **Runtime Updates**: Payment settings can be changed without app updates
4. **Fallback Safety**: App always has working API configuration

## Testing

The system includes built-in testing:
- Payment configuration is tested after login
- Logs show which config source is being used
- API configuration is always static

## Troubleshooting

### Common Issues
1. **Payment config not updating**: Check AsyncStorage for saved payment config
2. **API calls failing**: Verify static base URL is correct
3. **Payment not working**: Check dynamic payment configuration

### Debug Commands
```typescript
// Test current configuration
import { testDynamicConfig } from '@/config/dynamicAppConfig';
const result = await testDynamicConfig();
console.log(result);

// Check stored payment config
import AsyncStorage from '@react-native-async-storage/async-storage';
const config = await AsyncStorage.getItem('nexo_app_config');
console.log(JSON.parse(config));

// Check static API config
import { getApiConfig } from '@/config/appConfig';
const apiConfig = getApiConfig();
console.log('Static API URL:', apiConfig.url);
```

## Important Notes

- **API Base URL**: Never changes after app initialization
- **Payment Config**: Updated after each login
- **Static vs Dynamic**: Clear separation of concerns
- **Backward Compatibility**: Existing API code continues to work unchanged
