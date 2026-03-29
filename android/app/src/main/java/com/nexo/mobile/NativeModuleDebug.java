package com.nexonative;

import android.util.Log;

/**
 * Utility class for debug logging from native modules
 */
public class NativeModuleDebug {
    private static final String TAG = "EcentricPayment";
    private static final boolean DEBUG = true;

    /**
     * Log a debug message
     * @param message The message to log
     */
    public static void log(String message) {
        if (DEBUG) {
            Log.d(TAG, message);
            System.out.println("[" + TAG + "] " + message);
        }
    }

    /**
     * Log an error message
     * @param message The error message to log
     */
    public static void error(String message) {
        Log.e(TAG, message);
        System.err.println("[" + TAG + " ERROR] " + message);
    }

    /**
     * Log an error message with exception details
     * @param message The error message to log
     * @param e The exception that was thrown
     */
    public static void error(String message, Throwable e) {
        Log.e(TAG, message, e);
        System.err.println("[" + TAG + " ERROR] " + message + ": " + e.getMessage());
    }
} 