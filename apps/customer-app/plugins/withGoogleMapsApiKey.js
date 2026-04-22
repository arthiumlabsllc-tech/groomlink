/**
 * Custom Expo Config Plugin to inject Google Maps API Key
 * This plugin adds the API key to AndroidManifest.xml during prebuild
 */

const { withAndroidManifest } = require('@expo/config-plugins');

function withGoogleMapsApiKey(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

    // Find the application element
    const application = androidManifest.manifest.application?.[0];
    
    if (application) {
      // Add meta-data for Google Maps API Key
      application['meta-data'] = application['meta-data'] || [];
      
      // Check if the key already exists
      const existingKeyIndex = application['meta-data'].findIndex(
        (meta) => meta.$?.['android:name'] === 'com.google.android.geo.API_KEY'
      );

      const metaDataEntry = {
        $: {
          'android:name': 'com.google.android.geo.API_KEY',
          'android:value': apiKey,
        },
      };

      if (existingKeyIndex >= 0) {
        // Update existing entry
        application['meta-data'][existingKeyIndex] = metaDataEntry;
      } else {
        // Add new entry
        application['meta-data'].push(metaDataEntry);
      }
    }

    return config;
  });
}

module.exports = withGoogleMapsApiKey;
