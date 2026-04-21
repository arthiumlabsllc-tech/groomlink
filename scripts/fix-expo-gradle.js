/**
 * fix-expo-gradle.js
 * 
 * DEPRECATED: This script previously patched Expo module build.gradle files
 * to work around undefined helper functions. This is no longer needed because:
 * 
 * 1. expo-build-properties plugin in app.json handles SDK version configuration
 * 2. ExpoModulesCorePlugin.gradle defines helper functions using safeExtGet()
 * 3. Patching was creating duplicate android{} blocks causing Kotlin compilation errors
 * 
 * Kept as a no-op to avoid breaking postinstall/eas-build-post-install hooks.
 */

console.log('[fix-expo-gradle] Skipped - SDK configuration handled by expo-build-properties plugin');
