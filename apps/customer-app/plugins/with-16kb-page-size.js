const {
  withGradleProperties,
  withAndroidManifest,
  withAppBuildGradle,
} = require('@expo/config-plugins');

/**
 * Expo config plugin: Android 16KB Page Size Compliance
 *
 * APPROACH: Store .so files COMPRESSED in the AAB/APK.
 *
 * When useLegacyPackaging=true and android:extractNativeLibs="true":
 * - AGP stores .so files compressed in the package
 * - Google Play SKIPS the 16KB ELF alignment check for compressed libs
 * - The device extracts .so files at install time with proper alignment
 *
 * This is the officially supported Google Play approach for apps that
 * cannot guarantee 16KB alignment of precompiled .so files (e.g., RN 0.76
 * ships .so files built with NDK 26 that have 4KB alignment).
 */

function withAndroid16KBPageSize(config) {
  // Step 1: Set expo.useLegacyPackaging=true (stores .so compressed)
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const existing = props.find(
      p => p.type === 'property' && p.key === 'expo.useLegacyPackaging'
    );
    if (existing) {
      existing.value = 'true';
    } else {
      props.push({ type: 'property', key: 'expo.useLegacyPackaging', value: 'true' });
    }
    return config;
  });

  // Step 2: Set android:extractNativeLibs="true" in AndroidManifest.xml
  // Required for compressed .so files to be extracted at install time
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (manifest && manifest.application && manifest.application[0]) {
      const app = manifest.application[0];
      app.$['android:extractNativeLibs'] = 'true';
    }
    return config;
  });

  // Step 3: Add pickFirsts to avoid merge conflicts with duplicate .so files
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const pickFirsts = "        pickFirsts += ['**/libc++_shared.so', '**/libfbjni.so', '**/libhermes.so', '**/libreactnative.so']";
    if (!contents.includes(pickFirsts)) {
      const jniLibsClose = /(jniLibs\s*\{[^}]*useLegacyPackaging[^}]*\})\s*\n(\s*\})/;
      const match = contents.match(jniLibsClose);
      if (match) {
        contents = contents.replace(jniLibsClose, `$1\n${pickFirsts}\n$2`);
      }
    }
    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withAndroid16KBPageSize;
