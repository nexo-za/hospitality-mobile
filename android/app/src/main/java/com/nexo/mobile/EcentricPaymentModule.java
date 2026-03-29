package com.nexo.mobile;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.os.Bundle;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class EcentricPaymentModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private static final int ECENTRIC_AUTH_REQUEST_CODE = 2001;
    private static final int ECENTRIC_SALE_REQUEST_CODE = 2002;
    private Promise pendingPromise;

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent intent) {
        System.out.println("******************************************");
        System.out.println("onActivityResult called (DETAILED DEBUG):");
        System.out.println("- requestCode: " + requestCode);
        System.out.println("- resultCode: " + resultCode + " (" + (resultCode == Activity.RESULT_OK ? "RESULT_OK" : 
                                                                   resultCode == Activity.RESULT_CANCELED ? "RESULT_CANCELED" : 
                                                                   "UNKNOWN") + ")");
        System.out.println("- data present: " + (intent != null));
        System.out.println("- promise present: " + (pendingPromise != null));

        if ((requestCode == ECENTRIC_AUTH_REQUEST_CODE || requestCode == ECENTRIC_SALE_REQUEST_CODE) && pendingPromise != null) {
            
            if (intent == null) {
                pendingPromise.reject("NO_RESPONSE", "No data received from Ecentric.");
                pendingPromise = null;
                return;
            }

            Bundle extras = intent.getExtras();
            if (extras == null) {
                pendingPromise.reject("EMPTY_RESPONSE", "Received empty response bundle.");
                pendingPromise = null;
                return;
            }

            // Log all extras for debugging
            if (extras != null) {
                System.out.println("Intent extras keys: ");
                for (String key : extras.keySet()) {
                    System.out.println("  - " + key + " (type: " + 
                        (extras.get(key) != null ? extras.get(key).getClass().getName() : "null") + ")");
                }
            }

            try {
                // Check if thumbzupApplicationResponse bundle exists (as per legacy)
                Bundle thumbzupBundle = extras.getBundle("thumbzupApplicationResponse");
                if (thumbzupBundle != null) {
                    System.out.println("thumbzupApplicationResponse bundle found");
                    
                    WritableMap result = Arguments.createMap();
                    
                    // First, add all standard fields from the thumbzupBundle
                    for (String key : thumbzupBundle.keySet()) {
                        Object value = thumbzupBundle.get(key);
                        if (value instanceof String) {
                            result.putString(key, (String) value);
                        } else if (value instanceof Integer) {
                            result.putInt(key, (Integer) value);
                        } else if (value instanceof Boolean) {
                            result.putBoolean(key, (Boolean) value);
                        } else if (value instanceof Double) {
                            result.putDouble(key, (Double) value);
                        }
                    }
                    
                    // Check for authentication key specifically
                    if (thumbzupBundle.containsKey("authenticationKey")) {
                        String authKey = thumbzupBundle.getString("authenticationKey");
                        System.out.println("******** AUTHENTICATION KEY FOUND: " + authKey + " ********");
                    }
                    
                    // Now check for and process the receiptBundle if it exists
                    boolean isReceiptDataAvailable = thumbzupBundle.getBoolean("isReceiptDataAvailable", false);
                    if (isReceiptDataAvailable) {
                        Bundle receiptBundle = thumbzupBundle.getBundle("receiptBundle");
                        if (receiptBundle != null) {
                            // Create a nested receipt object
                            WritableMap receiptData = Arguments.createMap();
                            
                            for (String key : receiptBundle.keySet()) {
                                Object value = receiptBundle.get(key);
                                if (value instanceof String) {
                                    receiptData.putString(key, (String) value);
                                } else if (value instanceof Integer) {
                                    receiptData.putInt(key, (Integer) value);
                                } else if (value instanceof Boolean) {
                                    receiptData.putBoolean(key, (Boolean) value);
                                } else if (value instanceof Double) {
                                    receiptData.putDouble(key, (Double) value);
                                }
                            }
                            
                            // Add the receipt data to the result
                            result.putMap("receiptBundle", receiptData);
                            System.out.println("Added receipt bundle to result with " + receiptBundle.size() + " items");
                        } else {
                            System.out.println("isReceiptDataAvailable is true but receiptBundle is null");
                        }
                    }
                    
                    pendingPromise.resolve(result);
                } else {
                    System.out.println("thumbzupApplicationResponse bundle NOT found, using direct extras");
                    // If thumbzupApplicationResponse doesn't exist, use all extras (fallback)
                    WritableMap result = Arguments.createMap();
                    result.putInt("resultCode", resultCode);
                    
                    for (String key : extras.keySet()) {
                        Object value = extras.get(key);
                        if (value instanceof String) {
                            result.putString(key, (String) value);
                        } else if (value instanceof Integer) {
                            result.putInt(key, (Integer) value);
                        } else if (value instanceof Boolean) {
                            result.putBoolean(key, (Boolean) value);
                        } else if (value instanceof Double) {
                            result.putDouble(key, (Double) value);
                        } else if (value instanceof Bundle) {
                            Bundle nestedBundle = (Bundle) value;
                            WritableMap nestedMap = Arguments.createMap();
                            for (String nestedKey : nestedBundle.keySet()) {
                                Object nestedValue = nestedBundle.get(nestedKey);
                                if (nestedValue instanceof String) {
                                    nestedMap.putString(nestedKey, (String) nestedValue);
                                } else if (nestedValue instanceof Integer) {
                                    nestedMap.putInt(nestedKey, (Integer) nestedValue);
                                } else if (nestedValue instanceof Double) {
                                    nestedMap.putDouble(nestedKey, (Double) nestedValue);
                                } else if (nestedValue instanceof Boolean) {
                                    nestedMap.putBoolean(nestedKey, (Boolean) nestedValue);
                                }
                            }
                            result.putMap(key, nestedMap);
                        }
                    }
                    pendingPromise.resolve(result);
                }
            } catch (Exception e) {
                System.out.println("Error processing response: " + e.getMessage());
                pendingPromise.reject("ECENTRIC_ERROR", e.getMessage());
            } finally {
                pendingPromise = null;
            }
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        // Not needed in this implementation.
    }

    public EcentricPaymentModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(this);
    }

    @NonNull
    @Override
    public String getName() {
        return "EcentricPaymentModule";
    }

    /**
     * Checks network connectivity before initiating the request.
     */
    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager = 
            (ConnectivityManager) getReactApplicationContext().getSystemService(Context.CONNECTIVITY_SERVICE);

        if (connectivityManager != null) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                Network network = connectivityManager.getActiveNetwork();
                if (network != null) {
                    NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(network);
                    return capabilities != null && 
                        capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
                }
            } else {
                NetworkInfo activeNetwork = connectivityManager.getActiveNetworkInfo();
                return activeNetwork != null && activeNetwork.isConnected();
            }
        }
        return false;
    }

    @ReactMethod
    public void launchRetailAuth(String appURL, String appClass, String merchantID, String secretKey, 
                                String accessKey, Promise promise) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("ACTIVITY_NOT_FOUND", "Activity not found.");
            return;
        }

        if (!isNetworkAvailable()) {
            promise.reject("NO_INTERNET", "No network connection.");
            return;
        }

        try {
            pendingPromise = promise;
            Intent intent = new Intent();
            intent.setClassName(appURL, appClass);

            // Create the thumbzupBundle as per Ecentric API specification
            Bundle dataBundle = new Bundle();
            dataBundle.putString("launchType", "RETAIL_AUTH");
            dataBundle.putString("merchantID", merchantID);
            dataBundle.putString("secretKey", secretKey);
            dataBundle.putString("accessKey", accessKey);

            intent.putExtra("thumbzupBundle", dataBundle);

            currentActivity.startActivityForResult(intent, ECENTRIC_AUTH_REQUEST_CODE);
        } catch (Exception e) {
            promise.reject("LAUNCH_FAILED", "Failed to start authentication process: " + e.getMessage());
            pendingPromise = null;
        }
    }

    @ReactMethod
    public void launchSaleTransaction(
        String appURL, 
        String appClass, 
        String merchantID, 
        String authenticationKey, 
        double transactionAmount,
        String transactionUuid, 
        String transactionDescription, 
        String customerName, 
        String transactionReferenceNo, 
        String cellNumberToSMSReceipt, 
        String emailAddressToSendReceipt, 
        boolean isReceiptRequired,
        boolean showTransactionStatusScreen,
        String merchantInfoJson,
        String externalSTAN,
        String externalRRN,
        String externalTransactionGUID,
        String externalInvoiceGUID,
        String externalTransactionDateTime,
        String externalTerminalId,
        String latitude,
        String longitude,
        String accuracy,
        String applicationKey,
        Promise promise) {
        
        System.out.println("🚀 ANDROID METHOD CALLED: launchSaleTransaction");
        
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("ACTIVITY_NOT_FOUND", "Activity not found.");
            return;
        }

        if (!isNetworkAvailable()) {
            promise.reject("NO_INTERNET", "No network connection.");
            return;
        }

        try {
            System.out.println("==== LAUNCH SALE TRANSACTION PARAMS ====");
            System.out.println("appURL: " + appURL);
            System.out.println("appClass: " + appClass);
            System.out.println("merchantID: " + merchantID);
            System.out.println("authenticationKey: " + (authenticationKey != null ? "provided" : "null"));
            System.out.println("transactionAmount: " + transactionAmount);
            System.out.println("transactionUuid: " + transactionUuid);
            System.out.println("applicationKey: " + applicationKey);
            System.out.println("======================================");

            pendingPromise = promise;
            Intent intent = new Intent();
            intent.setClassName(appURL, appClass);
            // Don't use FLAG_ACTIVITY_NEW_TASK - it prevents proper result delivery with startActivityForResult
            // intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Create the thumbzupBundle as per legacy implementation
            Bundle dataBundle = new Bundle();
            dataBundle.putString("launchType", "SALE");
            dataBundle.putString("merchantID", merchantID);
            dataBundle.putString("authenticationKey", authenticationKey);
            dataBundle.putLong("transactionAmount", (long)transactionAmount);
            
            // Add application key if provided
            if (applicationKey != null && !applicationKey.isEmpty()) {
                dataBundle.putString("applicationKey", applicationKey);
                System.out.println("Added applicationKey: " + applicationKey);
            } else {
                System.out.println("WARNING: No applicationKey provided");
            }
            
            // Handle merchant info JSON
            try {
                if (merchantInfoJson != null && !merchantInfoJson.isEmpty()) {
                    org.json.JSONObject additionalData = new org.json.JSONObject();
                    org.json.JSONObject merchantInfo = new org.json.JSONObject(merchantInfoJson);
                    additionalData.put("Merchant_Info", merchantInfo);
                    dataBundle.putString("additionalData", additionalData.toString());
                    System.out.println("Added additionalData: " + additionalData.toString());
                }
            } catch (Exception e) {
                System.out.println("Error creating additionalData: " + e.getMessage());
            }
            
            // Add optional parameters
            if (transactionUuid != null) dataBundle.putString("transactionUuid", transactionUuid);
            if (transactionDescription != null) dataBundle.putString("transactionDescription", transactionDescription);
            if (customerName != null) dataBundle.putString("customerName", customerName);
            if (transactionReferenceNo != null) dataBundle.putString("transactionReferenceNo", transactionReferenceNo);
            if (cellNumberToSMSReceipt != null) dataBundle.putString("cellNumberToSMSReceipt", cellNumberToSMSReceipt);
            if (emailAddressToSendReceipt != null) dataBundle.putString("emailAddressToSendReceipt", emailAddressToSendReceipt);
            dataBundle.putBoolean("isReceiptRequired", isReceiptRequired);
            dataBundle.putBoolean("alwaysShowTransactionStatusScreen", showTransactionStatusScreen);
            
            // Handle external parameters
            if (externalSTAN != null && !externalSTAN.isEmpty()) {
                try {
                    int stan = Integer.parseInt(externalSTAN);
                    dataBundle.putInt("externalSTAN", stan);
                } catch (NumberFormatException e) {
                    dataBundle.putString("externalSTAN", externalSTAN);
                    System.out.println("Warning: externalSTAN is not a valid number: " + externalSTAN);
                }
            } else {
                dataBundle.putInt("externalSTAN", 0);
            }
            
            if (externalRRN != null && !externalRRN.isEmpty()) dataBundle.putString("externalRRN", externalRRN);
            if (externalTransactionGUID != null && !externalTransactionGUID.isEmpty()) dataBundle.putString("externalTransactionGUID", externalTransactionGUID);
            if (externalInvoiceGUID != null && !externalInvoiceGUID.isEmpty()) dataBundle.putString("externalInvoiceGUID", externalInvoiceGUID);
            if (externalTransactionDateTime != null && !externalTransactionDateTime.isEmpty()) dataBundle.putString("externalTransactionDateTime", externalTransactionDateTime);
            if (externalTerminalId != null && !externalTerminalId.isEmpty()) dataBundle.putString("externalTerminalId", externalTerminalId);
            
            // Handle location parameters
            if (latitude != null && !latitude.isEmpty()) {
                try {
                    double lat = Double.parseDouble(latitude);
                    dataBundle.putDouble("latitude", lat);
                } catch (NumberFormatException e) {
                    System.out.println("Warning: latitude is not a valid number: " + latitude);
                }
            }
            
            if (longitude != null && !longitude.isEmpty()) {
                try {
                    double lon = Double.parseDouble(longitude);
                    dataBundle.putDouble("longitude", lon);
                } catch (NumberFormatException e) {
                    System.out.println("Warning: longitude is not a valid number: " + longitude);
                }
            }
            
            if (accuracy != null && !accuracy.isEmpty()) {
                try {
                    double acc = Double.parseDouble(accuracy);
                    dataBundle.putDouble("accuracy", acc);
                } catch (NumberFormatException e) {
                    System.out.println("Warning: accuracy is not a valid number: " + accuracy);
                }
            }

            // Use thumbzupBundle like legacy implementation
            intent.putExtra("thumbzupBundle", dataBundle);
            
            System.out.println("========== SALE TRANSACTION BUNDLE CONTENTS ==========");
            for (String key : dataBundle.keySet()) {
                Object value = dataBundle.get(key);
                System.out.println(key + ": " + (value != null ? value.toString() : "null"));
            }
            System.out.println("======================================================");

            currentActivity.startActivityForResult(intent, ECENTRIC_SALE_REQUEST_CODE);
        } catch (Exception e) {
            promise.reject("LAUNCH_FAILED", "Failed to start sale transaction: " + e.getMessage());
            pendingPromise = null;
        }
    }
}

