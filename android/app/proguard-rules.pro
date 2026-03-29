# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ==========================================
# REACT NATIVE CORE
# ==========================================
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# ==========================================
# REACT NATIVE REANIMATED
# ==========================================
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ==========================================
# REACT NATIVE GESTURE HANDLER
# ==========================================
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.gesturehandler.react.** { *; }

# ==========================================
# REACT NATIVE SCREENS
# ==========================================
-keep class com.swmansion.rnscreens.** { *; }

# ==========================================
# REACT NATIVE SVG
# ==========================================
-keep class com.horcrux.svg.** { *; }

# ==========================================
# REACT NATIVE SAFE AREA CONTEXT
# ==========================================
-keep class com.th3rdwave.safeareacontext.** { *; }

# ==========================================
# ASYNC STORAGE
# ==========================================
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ==========================================
# NET INFO
# ==========================================
-keep class com.reactnativecommunity.netinfo.** { *; }

# ==========================================
# REACT NATIVE WEBVIEW
# ==========================================
-keep class com.reactnativecommunity.webview.** { *; }

# ==========================================
# EXPO MODULES
# ==========================================
-keep class expo.modules.** { *; }
-keep class host.exp.exponent.** { *; }

# Expo File System
-keep class expo.modules.filesystem.** { *; }

# Expo Secure Store
-keep class expo.modules.securestore.** { *; }

# Expo Constants
-keep class expo.modules.constants.** { *; }

# Expo Camera
-keep class expo.modules.camera.** { *; }

# Expo Image Picker
-keep class expo.modules.imagepicker.** { *; }

# Expo Crypto
-keep class expo.modules.crypto.** { *; }

# Expo Haptics
-keep class expo.modules.haptics.** { *; }

# Expo Linear Gradient
-keep class expo.modules.lineargradient.** { *; }

# Expo Blur
-keep class expo.modules.blur.** { *; }

# Expo Clipboard
-keep class expo.modules.clipboard.** { *; }

# Expo Document Picker
-keep class expo.modules.documentpicker.** { *; }

# Expo Splash Screen
-keep class expo.modules.splashscreen.** { *; }

# Expo Font
-keep class expo.modules.font.** { *; }

# ==========================================
# SHOPIFY REACT NATIVE SKIA
# ==========================================
-keep class com.shopify.reactnative.skia.** { *; }

# ==========================================
# SUNMI PRINTER
# ==========================================
-keep class com.heasy.sunmi.** { *; }
-keep class woyou.aidlservice.jiuiv5.** { *; }
-keep class com.sunmi.** { *; }

# ==========================================
# DATE TIME PICKER
# ==========================================
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# ==========================================
# OKHTTP & NETWORKING
# ==========================================
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ==========================================
# FRESCO (IMAGE LOADING)
# ==========================================
-keep class com.facebook.fresco.** { *; }
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }

# ==========================================
# GSON (IF USED)
# ==========================================
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }

# ==========================================
# GENERAL ANDROID
# ==========================================
# Keep Parcelables
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    !private <fields>;
    !private <methods>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ==========================================
# JAVASCRIPT INTERFACE (WEBVIEW)
# ==========================================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ==========================================
# DEBUGGING - KEEP LINE NUMBERS
# ==========================================
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ==========================================
# SUPPRESS COMMON WARNINGS
# ==========================================
-dontwarn com.facebook.react.**
-dontwarn org.slf4j.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
