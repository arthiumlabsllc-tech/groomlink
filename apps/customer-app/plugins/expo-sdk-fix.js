const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function findExpoBuildGradle(projectRoot) {
  // Strategy 1: Use require.resolve to find expo's actual location (follows symlinks)
  try {
    const expoPackageJson = require.resolve('expo/package.json', {
      paths: [projectRoot],
    });
    const expoDir = path.dirname(expoPackageJson);
    const gradlePath = path.join(expoDir, 'android', 'build.gradle');
    if (fs.existsSync(gradlePath)) return gradlePath;
  } catch (e) {
    console.log('[expo-sdk-fix] require.resolve failed:', e.message);
  }

  // Strategy 2: Direct path in app's node_modules
  const directPath = path.join(projectRoot, 'node_modules', 'expo', 'android', 'build.gradle');
  if (fs.existsSync(directPath)) return directPath;

  // Strategy 3: Search monorepo root node_modules/.pnpm (go up from app dir)
  let currentDir = projectRoot;
  for (let i = 0; i < 5; i++) {
    const pnpmDir = path.join(currentDir, 'node_modules', '.pnpm');
    if (fs.existsSync(pnpmDir)) {
      try {
        const entries = fs.readdirSync(pnpmDir);
        for (const entry of entries) {
          if (entry.startsWith('expo@') || entry.startsWith('expo+')) {
            const gradlePath = path.join(pnpmDir, entry, 'node_modules', 'expo', 'android', 'build.gradle');
            if (fs.existsSync(gradlePath)) return gradlePath;
          }
        }
      } catch (e) {
        // Continue searching up
      }
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

function patchBuildGradle(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('useDefaultAndroidSdkVersions()')) {
    content = content.replace(
      'useDefaultAndroidSdkVersions()',
      "android {\n    compileSdkVersion 35\n    namespace 'expo.core'\n  }"
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[expo-sdk-fix] Successfully patched:', filePath);
    return true;
  }
  console.log('[expo-sdk-fix] No patch needed (already patched or different format):', filePath);
  return false;
}

function withExpoSdkFix(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      console.log('[expo-sdk-fix] Searching for expo build.gradle from:', projectRoot);

      const gradlePath = findExpoBuildGradle(projectRoot);

      if (gradlePath) {
        console.log('[expo-sdk-fix] Found expo build.gradle at:', gradlePath);
        patchBuildGradle(gradlePath);
      } else {
        console.error('[expo-sdk-fix] ERROR: Could not find expo/android/build.gradle anywhere!');
        console.error('[expo-sdk-fix] Searched from:', projectRoot);
      }

      return config;
    },
  ]);
}

module.exports = withExpoSdkFix;
