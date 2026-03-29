# Ecentric Login Integration

## Overview

This document explains how the Ecentric payment authentication is now integrated with the user login flow, eliminating the need to re-authenticate for every payment.

## 🔄 **Complete Flow**

### **1. User Login**
```typescript
// User enters credentials and logs in
const { userData, response } = await userService.login({ username, password });
```

### **2. Config Extraction**
```typescript
// Extract payment configuration from login response
const savedConfig = await extractAndSaveConfigFromLoginResponse(response);
```

**What gets extracted:**
- `merchantId` - Ecentric merchant identifier
- `secretKey` - Ecentric secret key for authentication
- `accessKey` - Ecentric access key for authentication
- `appUrl` - Payment app package name
- `appClass` - Payment app activity class
- `isSunmiDevice` - Device type flag
- Merchant information (phone, address, etc.)

### **3. Ecentric Initialization**
```typescript
// Initialize Ecentric with dynamic config
const ecentricPayment = new EcentricPayment();
await ecentricPayment.handlePostLoginFlow();
```

**What happens:**
1. **Update Configuration**: Replace static config with dynamic values from login
2. **Check Existing Auth**: Look for stored authentication token
3. **Perform Retail Auth**: If no token exists, launch Ecentric app for authentication
4. **Store Token**: Save authentication token securely for future use

### **4. Payment Processing**
```typescript
// When user makes a payment
let authToken = EcentricPayment.getAuthenticationKey();

if (!authToken) {
  // Only authenticate if no token exists
  authToken = await EcentricPayment.performRetailAuth();
}

// Use stored token for payment
const response = await EcentricPayment.launchSaleTransaction(paymentParams);
```

## 🏗️ **Architecture Changes**

### **Before (Inefficient)**
```
Login → Extract Config → Store Config
Payment → Clear Auth → Retail Auth → Payment
Payment → Clear Auth → Retail Auth → Payment
Payment → Clear Auth → Retail Auth → Payment
```

### **After (Efficient)**
```
Login → Extract Config → Store Config → Retail Auth → Store Token
Payment → Use Stored Token → Payment
Payment → Use Stored Token → Payment
Payment → Use Stored Token → Payment
```

## 📁 **Files Modified**

### **1. `config/dynamicAppConfig.js`**
- Enhanced config extraction for Ecentric credentials
- Added `getEcentricConfig()` function
- Better error handling and logging

### **2. `utils/EcentricPayment.ts`**
- Added `initializeWithDynamicConfig()` method
- Added `handlePostLoginFlow()` method
- Support for both static and dynamic configuration

### **3. `contexts/AuthContext.tsx`**
- Integrated Ecentric initialization after login
- Automatic Retail Auth when config is available
- Error handling for payment system initialization

### **4. `app/components/PaymentModal.tsx`**
- Updated to use stored authentication tokens
- Only performs Retail Auth when necessary
- Better error handling and user feedback

## 🔐 **Security Features**

### **Token Storage**
- Authentication tokens stored in Expo SecureStore
- Tokens persist between app sessions
- Automatic token validation before use

### **Credential Protection**
- Merchant credentials never logged in plain text
- Dynamic config loaded securely from AsyncStorage
- Fallback to static config if dynamic config unavailable

## 🚀 **Benefits**

### **User Experience**
- **Faster Payments**: No need to re-authenticate for each payment
- **Seamless Flow**: Authentication happens once after login
- **Better Reliability**: Stored tokens reduce authentication failures

### **System Performance**
- **Reduced API Calls**: Fewer authentication requests to Ecentric
- **Lower Latency**: Payments start immediately with stored tokens
- **Better Success Rate**: Eliminates authentication timing issues

### **Maintenance**
- **Centralized Config**: All payment settings in one place
- **Dynamic Updates**: Config changes with user login
- **Better Debugging**: Clear separation of static vs dynamic config

## 🧪 **Testing**

### **Test the Login Flow**
1. **Login**: Use valid credentials to trigger config extraction
2. **Check Logs**: Verify Ecentric initialization messages
3. **Verify Storage**: Check AsyncStorage for saved config
4. **Test Payment**: Verify stored authentication is used

### **Test the Payment Flow**
1. **First Payment**: Should trigger Retail Auth if no token exists
2. **Subsequent Payments**: Should use stored token without re-authentication
3. **Token Expiry**: Should gracefully fall back to re-authentication

## 🔧 **Configuration**

### **Required Login Response Structure**
```json
{
  "organizationConfig": [
    {
      "key": "merchant_payment_settings",
      "value": "{\"ecentric\":{\"merchantId\":\"...\",\"secretKey\":\"...\",\"accessKey\":\"...\"}}"
    }
  ]
}
```

### **Supported Ecentric Config Fields**
- `merchantId` / `merchant_id`
- `secretKey` / `secret_key`
- `accessKey` / `access_key`
- `appUrl` / `app_url`
- `appClass` / `app_class`
- `isSunmiDevice`
- `receiptRequired`
- `showTransactionStatus`
- Merchant information fields

## 🚨 **Error Handling**

### **Config Extraction Failures**
- Logs warning and continues with static config
- Payment system still functional with fallback settings

### **Authentication Failures**
- Clear error messages for users
- Automatic retry mechanisms
- Fallback to manual authentication if needed

### **Network Issues**
- Graceful degradation when offline
- Clear user feedback about connection status
- Automatic retry when connection restored

## 📝 **Logging**

### **Key Log Messages**
```
[AuthContext] Payment config extracted and saved to AsyncStorage
[AuthContext] Initializing Ecentric payment system...
[EcentricPayment] Starting post-login flow...
[EcentricPayment] Updated with dynamic configuration
[EcentricPayment] Post-login flow completed successfully
```

### **Debug Information**
- Configuration values (with sensitive data masked)
- Authentication token status
- Payment flow progression
- Error details and stack traces

## 🔮 **Future Enhancements**

### **Token Refresh**
- Automatic token refresh before expiry
- Background authentication maintenance
- User notification for expired tokens

### **Multi-Merchant Support**
- Support for multiple merchant configurations
- Dynamic merchant switching
- Per-merchant authentication tokens

### **Advanced Error Recovery**
- Intelligent retry strategies
- User-guided troubleshooting
- Automatic fallback mechanisms
