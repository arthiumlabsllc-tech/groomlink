#!/bin/bash
# This script runs after expo prebuild on EAS, before Gradle build
# It ensures android.ndk.suppressMinSdkVersionError is in gradle.properties

GRADLE_PROPS="android/gradle.properties"

echo "[eas-hook] Checking gradle.properties at: $(pwd)/$GRADLE_PROPS"

if [ -f "$GRADLE_PROPS" ]; then
  if ! grep -q "suppressMinSdkVersionError" "$GRADLE_PROPS"; then
    echo "" >> "$GRADLE_PROPS"
    echo "# Suppress NDK minSdk error for expo-modules-core" >> "$GRADLE_PROPS"
    echo "android.ndk.suppressMinSdkVersionError=21" >> "$GRADLE_PROPS"
    echo "[eas-hook] Added NDK suppress to gradle.properties"
  else
    echo "[eas-hook] gradle.properties already has NDK suppress"
  fi
else
  echo "[eas-hook] Creating gradle.properties with NDK suppress"
  echo "# Auto-generated gradle.properties" > "$GRADLE_PROPS"
  echo "android.ndk.suppressMinSdkVersionError=21" >> "$GRADLE_PROPS"
fi

echo "[eas-hook] gradle.properties contents:"
cat "$GRADLE_PROPS"
