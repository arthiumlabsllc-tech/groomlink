const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo config plugin: Android 16KB Page Size Compliance
 *
 * Sets expo.useLegacyPackaging=false so .so files are stored uncompressed
 * in the AAB. The actual .so file patching is done by scripts/patch-so-elf.js
 * which runs as eas-build-post-install (after npm install, before prebuild).
 */

function withAndroid16KBPageSize(config) {
  // Set expo.useLegacyPackaging=false (uncompressed .so storage)
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const existing = props.find(
      p => p.type === 'property' && p.key === 'expo.useLegacyPackaging'
    );
    if (existing) {
      existing.value = 'false';
    } else {
      props.push({ type: 'property', key: 'expo.useLegacyPackaging', value: 'false' });
    }
    return config;
  });

  return config;
}

module.exports = withAndroid16KBPageSize;
