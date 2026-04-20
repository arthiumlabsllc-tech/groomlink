const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin that adds Android 16 (API 36) compatibility opt-outs
 * to the AndroidManifest.xml at build time.
 *
 * 1. Adds `android:enableOnBackInvokedCallback="false"` to .MainActivity
 *    to temporarily opt out of predictive back gestures.
 *
 * 2. Adds a <property> element inside <application>:
 *    android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY = true
 *    to prevent forced resize on large screens (600dp+) for Android 16+.
 */
function withAndroid16Compat(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Add PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY to <application>
    if (!application['property']) {
      application['property'] = [];
    }

    const propertyName =
      'android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY';

    // Avoid duplicates
    const alreadyHasProperty = application['property'].some(
      (p) => p.$['android:name'] === propertyName
    );

    if (!alreadyHasProperty) {
      application['property'].push({
        $: {
          'android:name': propertyName,
          'android:value': 'true',
        },
      });
    }

    // Add enableOnBackInvokedCallback="false" to .MainActivity
    const mainActivity = application.activity.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      mainActivity.$['android:enableOnBackInvokedCallback'] = 'false';
    }

    return config;
  });
}

module.exports = withAndroid16Compat;
