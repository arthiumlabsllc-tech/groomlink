const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo config plugin that ensures Android 16KB memory page size support.
 *
 * Google Play requires apps targeting Android 15 (API 35) to support 16KB
 * memory page sizes. This plugin:
 *
 * 1. Ensures `expo.useLegacyPackaging=false` in gradle.properties, which tells
 *    AGP to store native .so files uncompressed and 16KB page-aligned.
 *
 * 2. Injects `pickFirsts` for key native libraries into packagingOptions
 *    (at the packagingOptions level, NOT inside jniLibs block — that syntax
 *    crashes the Gradle daemon).
 *
 * IMPORTANT: NDK 27+ is also required so that native modules compiled from
 * source produce 16KB-aligned ELF binaries. This is configured in app.json
 * via expo-build-properties and in android/build.gradle ext.ndkVersion.
 *
 * This plugin is idempotent — safe to run multiple times.
 */

const PICK_FIRSTS_LINE = "        pickFirsts += ['**/libc++_shared.so', '**/libfbjni.so', '**/libhermes.so', '**/libreactnative.so']";

function withAndroid16KBPageSize(config) {
  // Ensure expo.useLegacyPackaging=false in gradle.properties
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;

    const existing = props.find(
      (p) => p.type === 'property' && p.key === 'expo.useLegacyPackaging'
    );

    if (existing) {
      existing.value = 'false';
    } else {
      props.push({
        type: 'property',
        key: 'expo.useLegacyPackaging',
        value: 'false',
      });
    }

    return config;
  });

  // Inject pickFirsts into packagingOptions (NOT inside jniLibs block)
  config = withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes(PICK_FIRSTS_LINE)) {
      // Already patched
      return config;
    }

    // Insert pickFirsts after the jniLibs block inside packagingOptions
    const jniLibsClosePattern = /(jniLibs\s*\{[^}]*useLegacyPackaging[^}]*\})\s*\n(\s*\})/;
    const match = contents.match(jniLibsClosePattern);

    if (match) {
      config.modResults.contents = contents.replace(
        jniLibsClosePattern,
        `$1\n        // Force single copy of each native lib for 16KB page alignment (Android 15+)\n${PICK_FIRSTS_LINE}\n$2`
      );
    }

    return config;
  });

  return config;
}

module.exports = withAndroid16KBPageSize;
