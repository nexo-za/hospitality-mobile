# Ecentric Authentication Flow Implementation

## Overview

This document describes the implementation of the Ecentric Retail Auth flow as per the [official Ecentric documentation](https://ecentric.readme.io/docs/auth-request).

## Key Concepts

### Retail Auth
- **Purpose**: Authentication required before any card transactions can be processed
- **Process**: User must be authenticated to obtain an auth token for payment requests
- **Flow**: Companion App → Payment App → Ecentric Backend → Auth Token → Companion App

### Authentication Token
- **Usage**: Required for all future transactions after successful authentication
- **Storage**: Securely stored using Expo SecureStore
- **Persistence**: Survives app restarts until explicitly cleared

## Implementation Details

### 1. Namespace Configuration

For SUNMI devices (as per documentation):
```typescript
appURL: "ecentric.thumbzup.com"
appClass: "ecentric.thumbzup.com.IntentActivity"
```

For standard devices:
```typescript
appURL: "payment.thumbzup.com"
appClass: "payment.thumbzup.com.IntentActivity"
```

### 2. Authentication Flow

#### Step 1: Retail Auth Request
```typescript
const authKey = await EcentricPayment.performRetailAuth();
```

This method:
- Clears existing authentication
- Launches the Ecentric Payment app via Android Intent
- Waits for user interaction and authentication
- Returns the authentication key on success

#### Step 2: Store Authentication Key
```typescript
// Automatically handled by performRetailAuth()
await EcentricPayment.setAuthenticationKey(authKey);
await EcentricPayment.saveAuthKey(authKey);
```

#### Step 3: Use for Transactions
```typescript
// The authentication key is automatically used for all future transactions
const result = await EcentricPayment.launchSaleTransaction(paymentParams);
```

### 3. Error Handling

The implementation now properly handles error responses as per the documentation:

```typescript
// Error response fields from Ecentric
interface ErrorResponse {
  resultCode: string;        // "04" indicates error
  resultDescription: string; // "ERROR" or "ABORTED"
  errorType?: string;        // "SERVER", "OTHER", "TIMEOUT", "CERTIFICATE", "UNKNOWN", "AUTHENTICATION"
  description?: string;      // Detailed error description
  message?: string;          // Error message
  reference?: string;        // Error reference
}
```

### 4. Component Usage

#### EcentricAuthFlow Component
```tsx
<EcentricAuthFlow
  onAuthSuccess={(authKey) => {
    console.log('Authentication successful:', authKey);
    // Proceed with payment processing
  }}
  onAuthFailure={(error) => {
    console.error('Authentication failed:', error);
    // Handle authentication failure
  }}
  autoStart={true} // Automatically start authentication
/>
```

#### Manual Authentication
```tsx
import EcentricPayment from '@/utils/EcentricPayment';

// At app startup or user login
try {
  const authKey = await EcentricPayment.performRetailAuth();
  console.log('Ready for payments');
} catch (error) {
  console.error('Authentication failed:', error);
}
```

## Configuration

### Required Credentials
```typescript
{
  merchantId: "YOUR_MERCHANT_ID",
  secretKey: "YOUR_SECRET_KEY",      // Provided by Ecentric
  accessKey: "YOUR_ACCESS_KEY",      // Provided by Ecentric
  isSunmiDevice: true                // Set based on device type
}
```

### Optional Settings
```typescript
{
  receiptRequired: true,
  showTransactionStatus: false,
  merchantInfo: {
    PhoneNo: "+27123456789",
    Street: "123 Main St",
    City: "Johannesburg",
    Province: "Gauteng",
    CountryCode: "ZA",
    CurrencyCode: "ZAR"
  }
}
```

## Best Practices

### 1. Authentication Timing
- **App Startup**: Consider authenticating when the app starts
- **User Login**: Authenticate when user logs in to the system
- **Token Expiry**: Re-authenticate if token becomes invalid

### 2. Error Recovery
- **Network Issues**: Retry authentication on network recovery
- **Credential Issues**: Verify merchant credentials with Ecentric
- **Device Issues**: Ensure Ecentric Payment app is properly installed

### 3. User Experience
- **Clear Messaging**: Inform users about authentication requirements
- **Progress Indication**: Show authentication progress
- **Retry Options**: Provide easy retry mechanisms for failed authentication

## Troubleshooting

### Common Issues

#### 1. "Authentication failed: No authentication key received"
- **Cause**: Retail Auth request failed or was cancelled
- **Solution**: Check credentials, network connectivity, and Ecentric app installation

#### 2. "resultCode: 04, resultDescription: ERROR"
- **Cause**: Authentication request rejected by Ecentric backend
- **Solution**: Verify merchant ID, secret key, and access key

#### 3. "Activity not found" or "Module not available"
- **Cause**: Ecentric Payment app not installed or native module missing
- **Solution**: Install Ecentric Payment app and verify native module integration

### Debug Steps

1. **Check Native Module**: Verify `EcentricPaymentModule` is available
2. **Verify Credentials**: Ensure all required credentials are set
3. **Check Device Type**: Confirm correct namespace for device type
4. **Network Connectivity**: Ensure stable internet connection
5. **Ecentric App**: Verify Ecentric Payment app is installed and accessible

## Security Considerations

- **Secure Storage**: Authentication keys are stored using Expo SecureStore
- **Credential Protection**: Never log or expose merchant credentials
- **Token Validation**: Validate authentication tokens before use
- **Session Management**: Clear authentication data when appropriate

## References

- [Ecentric Documentation - Retail Auth](https://ecentric.readme.io/docs/auth-request)
- [Android Intent Documentation](https://developer.android.com/reference/android/content/Intent)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
