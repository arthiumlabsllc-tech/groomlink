const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withExpoSdkFix(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // Find the expo module's build.gradle
      const buildGradlePath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'expo',
        'android',
        'build.gradle'
      );

      if (fs.existsSync(buildGradlePath)) {
        let content = fs.readFileSync(buildGradlePath, 'utf8');
        
        // Replace useDefaultAndroidSdkVersions() with explicit SDK versions
        if (content.includes('useDefaultAndroidSdkVersions()')) {
          content = content.replace(
            'useDefaultAndroidSdkVersions()',
            "android {\n    compileSdkVersion 35\n    namespace 'expo.core'\n  }"
          );
          fs.writeFileSync(buildGradlePath, content, 'utf8');
          console.log('[expo-sdk-fix] Patched expo/android/build.gradle with explicit SDK versions');
        }
      } else {
        // Try pnpm hoisted path
        const nodeModulesDir = path.join(config.modRequest.projectRoot, 'node_modules');
        const pnpmDir = path.join(nodeModulesDir, '.pnpm');
        
        if (fs.existsSync(pnpmDir)) {
          // Search for expo's build.gradle in pnpm store
          const findExpoGradle = (dir) => {
            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
              if (entry.startsWith('expo@') || entry.startsWith('expo+')) {
                const gradlePath = path.join(dir, entry, 'node_modules', 'expo', 'android', 'build.gradle');
                if (fs.existsSync(gradlePath)) return gradlePath;
              }
            }
            return null;
          };
          
          const pnpmGradlePath = findExpoGradle(pnpmDir);
          if (pnpmGradlePath) {
            let content = fs.readFileSync(pnpmGradlePath, 'utf8');
            if (content.includes('useDefaultAndroidSdkVersions()')) {
              content = content.replace(
                'useDefaultAndroidSdkVersions()',
                "android {\n    compileSdkVersion 35\n    namespace 'expo.core'\n  }"
              );
              fs.writeFileSync(pnpmGradlePath, content, 'utf8');
              console.log('[expo-sdk-fix] Patched expo/android/build.gradle (pnpm) with explicit SDK versions');
            }
          }
        }
      }

      return config;
    },
  ]);
}

module.exports = withExpoSdkFix;
