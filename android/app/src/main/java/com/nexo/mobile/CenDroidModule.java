package com.nexo.mobile;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class CenDroidModule extends ReactContextBaseJavaModule {
    private static final int CENDROID_REQUEST_CODE = 1001;
    private Promise pendingPromise;

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent intent) {
            if (requestCode == CENDROID_REQUEST_CODE && pendingPromise != null) {
                try {
                    WritableMap result = Arguments.createMap();
                    result.putInt("resultCode", resultCode);

                    if (intent != null && intent.getExtras() != null) {
                        Bundle extras = intent.getExtras();
                        Bundle payload = extras.getBundle("Payload");
                        
                        if (payload != null) {
                            WritableMap payloadMap = Arguments.createMap();
                            for (String key : payload.keySet()) {
                                Object value = payload.get(key);
                                if (value instanceof String) {
                                    payloadMap.putString(key, (String) value);
                                } else if (value instanceof Integer) {
                                    payloadMap.putInt(key, (Integer) value);
                                } else if (value instanceof Double) {
                                    payloadMap.putDouble(key, (Double) value);
                                } else if (value instanceof Boolean) {
                                    payloadMap.putBoolean(key, (Boolean) value);
                                }
                            }
                            result.putMap("payload", payloadMap);
                        }
                    }
                    pendingPromise.resolve(result);
                } catch (Exception e) {
                    pendingPromise.reject("CENDROID_ERROR", e.getMessage());
                } finally {
                    pendingPromise = null;
                }
            }
        }
    };

    public CenDroidModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(activityEventListener);
    }

    @NonNull
    @Override
    public String getName() {
        return "CenDroidLauncher";
    }

    @ReactMethod
    public void launchCenDroid(ReadableMap params, Promise promise) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("NO_ACTIVITY", "No current activity");
            return;
        }

        try {
            pendingPromise = promise;
            Intent intent = new Intent("CenDroid");
            intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

            // Required parameters
            intent.putExtra("Operation", params.getString("operation"));
            intent.putExtra("Time", params.getString("time"));
            intent.putExtra("Caller", params.getString("caller"));
            intent.putExtra("InvocationKey", params.getString("invocationKey"));
            
            // Amount handling (convert to cents)
            double amount = params.getDouble("amount");
            intent.putExtra("IntAmount", (int)(amount * 100));
            
            // Optional parameters
            if (params.hasKey("cashbackAmount")) {
                intent.putExtra("CashbackAmount", params.getInt("cashbackAmount"));
            }
            if (params.hasKey("customHeading")) {
                intent.putExtra("CustomHeading", params.getString("customHeading"));
            }
            if (params.hasKey("reference")) {
                intent.putExtra("Reference", params.getString("reference"));
            }
            if (params.hasKey("ecrHostTransfer")) {
                intent.putExtra("EcrHostTransfer", params.getString("ecrHostTransfer"));
            }
            if (params.hasKey("appName")) {
                intent.putExtra("AppName", params.getString("appName"));
            }

            currentActivity.startActivityForResult(intent, CENDROID_REQUEST_CODE);
        } catch (Exception e) {
            pendingPromise.reject("LAUNCH_ERROR", e.getMessage());
            pendingPromise = null;
        }
    }
}
