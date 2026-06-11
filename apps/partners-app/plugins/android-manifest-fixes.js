const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin that:
 * 1. Removes READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_EXTERNAL_STORAGE,
 *    WRITE_EXTERNAL_STORAGE permissions (not needed for photo picker one-time access).
 * 2. Adds `android:enableOnBackInvokedCallback="false"` to .MainActivity
 *    to temporarily opt out of predictive back gestures.
 * 3. Adds a <property> element inside <application>:
 *    android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY = true
 *    to prevent forced resize on large screens (600dp+) for Android 16+.
 */
function withAndroid16Compat(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Remove photo/video permissions that trigger Google Play rejection
    const permissionsToRemove = [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ];

    if (manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'].filter(
        (perm) => !permissionsToRemove.includes(perm.$['android:name'])
      );
    }

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
