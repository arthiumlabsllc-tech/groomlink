const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo config plugin that ensures Android 16KB memory page size support.
 *
 * Google Play requires apps targeting Android 15 (API 35) to support 16KB
 * memory page sizes. This plugin:
 *
 * 1. Injects `pickFirsts` for common native libraries into the app's
 *    build.gradle `packagingOptions.jniLibs` block. Combined with
 *    `useLegacyPackaging=false`, AGP will store .so files uncompressed
 *    and 16KB page-aligned inside the APK/AAB.
 *
 * 2. Ensures `expo.useLegacyPackaging=false` is set in gradle.properties
 *    so that AGP uses modern (non-legacy) native lib packaging.
 *
 * This plugin is idempotent — safe to run multiple times.
 */

const PICK_FIRST_LIBS = [
  '**/libc++_shared.so',
  '**/libfbjni.so',
];

const PICK_FIRST_BLOCK = `pickFirsts += [${PICK_FIRST_LIBS.map(l => `'${l}'`).join(', ')}]`;

function withAndroid16KBPageSize(config) {
  // ── 1. Patch app/build.gradle ──────────────────────────────────────────────
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // If the pickFirsts line is already present, do nothing
    if (contents.includes(PICK_FIRST_BLOCK)) {
      return config;
    }

    // Inject pickFirsts inside the jniLibs { ... } block
    const jniLibsRegex = /(jniLibs\s*\{[^}]*?useLegacyPackaging[^}]*?)(\n\s*\})/s;
    if (jniLibsRegex.test(contents)) {
      contents = contents.replace(
        jniLibsRegex,
        `$1\n            // 16KB page alignment: ensure only one copy of each .so is packaged\n            ${PICK_FIRST_BLOCK}$2`
      );
    } else {
      // Fallback: if the regex didn't match (different formatting), inject a
      // standalone packagingOptions block before the androidResources block
      const fallbackBlock = `    packagingOptions {
        jniLibs {
            useLegacyPackaging false
            // 16KB page alignment: ensure only one copy of each .so is packaged
            ${PICK_FIRST_BLOCK}
        }
    }
    `;
      if (!contents.includes('pickFirsts += [')) {
        contents = contents.replace(
          /(\n\s*androidResources\s*\{)/,
          `\n${fallbackBlock}$1`
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });

  // ── 2. Ensure expo.useLegacyPackaging=false in gradle.properties ────────────
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
