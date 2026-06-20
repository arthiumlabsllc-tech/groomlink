/**
 * Dynamic Expo Configuration
 * This file allows us to use environment variables securely
 * 
 * IMPORTANT: API keys are injected at BUILD TIME, not stored in code
 */

export default {
  expo: {
    name: "GroomLink",
    slug: "groomlink-customer",
    version: "1.0.0",
    scheme: "groomlink",
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    splash: {
      image: "./assets/loading-salon-02-splash.png",
      resizeMode: "cover",
      backgroundColor: "#FAF6F0"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.arthiumlabsllc.groomlink",
      buildNumber: "1.0.0",
      // Deep linking handled via top-level scheme property (SDK 53+)
      // urlSchemes removed — use scheme: "groomlink" at top level
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "GroomLink uses your location to find nearby barbershops.",
        NSCameraUsageDescription: "GroomLink needs camera access to upload profile photos.",
        NSPhotoLibraryUsageDescription: "GroomLink needs photo library access to upload profile photos.",
        ITSAppUsesNonExemptEncryption: false,
        // Required: declare URL schemes the app queries (Apple Maps directions)
        LSApplicationQueriesSchemes: ["maps", "googlechromes", "comgooglemaps"],
        // Privacy: declare that the app does not track users across apps/websites
        NSUserTrackingUsageDescription: "GroomLink does not track you across other apps or websites."
      }
    },
    android: {
      package: "com.arthiumlabsllc.groomlink",
      versionCode: 18,
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "groomlink"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "POST_NOTIFICATIONS",
        "FOREGROUND_SERVICE",
        "RECEIVE_BOOT_COMPLETED",
        "SCHEDULE_EXACT_ALARM",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      config: {
        googleMaps: {
          // API key injected at build time from environment variables
          apiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.EAS_BUILD_SECRET_GOOGLE_MAPS_API_KEY || ''
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "81417e23-6df9-4792-bf49-7829dd1d130e"
      }
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24
          },
          ios: {
            deploymentTarget: "15.1",
            useFrameworks: "static"
          }
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#CE1126",
          sounds: ["./assets/notification_alert.wav"]
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "GroomLink needs your location to find nearby salons and barbershops."
        }
      ],
      // 16KB page size handled natively by RN 0.79+ (SDK 53)
      "./plugins/with-privacy-manifest",
      "./plugins/android-manifest-fixes",
      // with-edge-to-edge REMOVED: built-in react-native-edge-to-edge (via edgeToEdgeEnabled: true)
      // already sets Theme.EdgeToEdge parent with transparent bars. Custom plugin was
      // redundantly modifying styles.xml and potentially conflicting with the built-in plugin.
      "./plugins/expo-sdk-fix",
      "./plugins/ios-xcode-compat-fix"
    ],
    owner: "gr3enink"
  }
};
