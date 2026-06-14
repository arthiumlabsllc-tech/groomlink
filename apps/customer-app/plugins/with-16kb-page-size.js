const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo config plugin that ensures Android 16KB memory page size support.
 *
 * Google Play requires apps targeting Android 15 (API 35) to support 16KB
 * memory page sizes. This plugin ensures `expo.useLegacyPackaging=false`
 * is set in gradle.properties, which tells AGP to store native .so files
 * uncompressed and 16KB page-aligned inside the APK/AAB.
 *
 * This plugin is idempotent — safe to run multiple times.
 */

function withAndroid16KBPageSize(config) {
  // Ensure expo.useLegacyPackaging=false in gradle.properties
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;

    // Find existing expo.useLegacyPackaging entry
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

  return config;
}

module.exports = withAndroid16KBPageSize;
