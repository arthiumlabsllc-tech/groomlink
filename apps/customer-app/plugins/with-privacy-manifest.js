const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin that adds a Privacy Manifest (PrivacyInfo.xcprivacy)
 * to the iOS project.
 *
 * Apple requires all apps to include a privacy manifest since Spring 2024.
 * This declares:
 *
 * 1. Tracking: The app does NOT track users across apps/websites.
 * 2. Data collection: Basic app functionality data only.
 * 3. Required Reason APIs the app (and its dependencies) use:
 *    - User Defaults (AsyncStorage uses NSUserDefaults)
 *    - File timestamp APIs (Expo file system modules)
 *    - System boot time (AppState listeners)
 *    - Disk space checks (Expo modules)
 *    - Active keyboard APIs (React Native keyboard handling)
 *
 * Dependencies like react-native, expo-modules, etc. ship their own
 * PrivacyInfo.xcprivacy files. This manifest covers the APP-level usage.
 */

const PRIVACY_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <!-- User Defaults (used by AsyncStorage) -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
    <!-- File timestamp APIs (used by Expo modules) -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>
    <!-- System boot time (used by AppState) -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>35F9.1</string>
      </array>
    </dict>
    <!-- Disk space (used by Expo modules) -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>E174.1</string>
      </array>
    </dict>
    <!-- Active keyboards (used by React Native keyboard handling) -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryActiveKeyboards</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>3EC4.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
`;

function withPrivacyManifest(config) {
  return withXcodeProject(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const iosDir = path.join(projectRoot, 'ios');

    if (!fs.existsSync(iosDir)) {
      console.log('[privacy-manifest] No ios/ directory found, skipping');
      return config;
    }

    // Find the app's main directory (e.g., ios/GroomLink/)
    // The main app directory matches the project name from the Xcode project
    const xcodeProject = config.modResults;
    const projectName = xcodeProject.getFirstTarget()?.firstTarget?.name || 'GroomLink';
    const appDir = path.join(iosDir, projectName);

    if (!fs.existsSync(appDir)) {
      console.log(`[privacy-manifest] App directory ${appDir} not found, trying fallback`);
      // Fallback: write to ios/ root
      const fallbackPath = path.join(iosDir, 'PrivacyInfo.xcprivacy');
      if (!fs.existsSync(fallbackPath)) {
        fs.writeFileSync(fallbackPath, PRIVACY_MANIFEST, 'utf8');
        console.log('[privacy-manifest] Wrote PrivacyInfo.xcprivacy to ios/ root');
      }
      return config;
    }

    const privacyPath = path.join(appDir, 'PrivacyInfo.xcprivacy');

    // Only write if it doesn't exist yet (don't overwrite if manually customized)
    if (!fs.existsSync(privacyPath)) {
      fs.writeFileSync(privacyPath, PRIVACY_MANIFEST, 'utf8');
      console.log(`[privacy-manifest] Wrote PrivacyInfo.xcprivacy to ${appDir}`);
    } else {
      console.log('[privacy-manifest] PrivacyInfo.xcprivacy already exists, skipping');
    }

    return config;
  });
}

module.exports = withPrivacyManifest;
