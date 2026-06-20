# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native modules
-keep public class com.mobileapp.** { *; }

# Keep annotations
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# Keep JS interface methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ModuleMethod *;
}

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }

# Keep okhttp/okio (used by fetch)
-dontwarn okhttp3.**
-dontwarn okio.**
