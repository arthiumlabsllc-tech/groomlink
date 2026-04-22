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
 * 
 * 3. Adds Google Maps API Key meta-data to <application>
 */
function withAndroidManifestFixes(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // ============================================
    // 1. Add Google Maps API Key
    // ============================================
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    if (apiKey && !application['meta-data']) {
      application['meta-data'] = [];
    }

    if (apiKey) {
      // Check if Google Maps API key already exists
      const existingKeyIndex = application['meta-data'].findIndex(
        (meta) => meta.$?.['android:name'] === 'com.google.android.geo.API_KEY'
      );

      const googleMapsMetaData = {
        $: {
          'android:name': 'com.google.android.geo.API_KEY',
          'android:value': apiKey,
        },
      };

      if (existingKeyIndex >= 0) {
        // Update existing entry
        application['meta-data'][existingKeyIndex] = googleMapsMetaData;
      } else {
        // Add new entry
        application['meta-data'].push(googleMapsMetaData);
      }
    }

    // ============================================
    // 2. Add PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY to <application>
    // ============================================
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

    // ============================================
    // 3. Add enableOnBackInvokedCallback="false" to .MainActivity
    // ============================================
    const mainActivity = application.activity.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      mainActivity.$['android:enableOnBackInvokedCallback'] = 'false';
    }

    return config;
  });
}

module.exports = withAndroidManifestFixes;
