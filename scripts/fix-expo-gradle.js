/**
 * fix-expo-gradle.js
 * 
 * Patches expo's android/build.gradle to replace the non-existent
 * useDefaultAndroidSdkVersions() call with explicit SDK version settings.
 * 
 * This runs as a postinstall script at the monorepo root level,
 * after pnpm install and before expo prebuild/Gradle build.
 */
const fs = require('fs');
const path = require('path');

const SEARCH = 'useDefaultAndroidSdkVersions()';
const REPLACEMENT = `android {
    compileSdkVersion 35
    namespace 'expo.core'
  }`;

function findAndPatchExpoGradle(rootDir) {
  let patched = 0;

  // Strategy 1: Direct symlink path
  const directPath = path.join(rootDir, 'node_modules', 'expo', 'android', 'build.gradle');
  if (patchFile(directPath)) patched++;

  // Strategy 2: Search in .pnpm directory
  const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    try {
      const entries = fs.readdirSync(pnpmDir);
      for (const entry of entries) {
        if (entry.startsWith('expo@') || entry.startsWith('expo+')) {
          const gradlePath = path.join(pnpmDir, entry, 'node_modules', 'expo', 'android', 'build.gradle');
          if (patchFile(gradlePath)) patched++;
        }
      }
    } catch (e) {
      console.log('[fix-expo-gradle] Error reading pnpm dir:', e.message);
    }
  }

  // Strategy 3: Check app-level node_modules (workspace symlinks)
  const appsDir = path.join(rootDir, 'apps');
  if (fs.existsSync(appsDir)) {
    try {
      const apps = fs.readdirSync(appsDir);
      for (const app of apps) {
        const appGradlePath = path.join(appsDir, app, 'node_modules', 'expo', 'android', 'build.gradle');
        if (patchFile(appGradlePath)) patched++;
      }
    } catch (e) {
      // ignore
    }
  }

  return patched;
}

function patchFile(filePath) {
  try {
    // Resolve symlinks to patch the real file
    let realPath = filePath;
    try {
      realPath = fs.realpathSync(filePath);
    } catch (e) {
      // If realpath fails, file doesn't exist
      return false;
    }

    if (!fs.existsSync(realPath)) return false;

    const content = fs.readFileSync(realPath, 'utf8');
    if (content.includes(SEARCH)) {
      const newContent = content.replace(SEARCH, REPLACEMENT);
      fs.writeFileSync(realPath, newContent, 'utf8');
      console.log(`[fix-expo-gradle] ✓ Patched: ${realPath}`);
      return true;
    } else if (content.includes('compileSdkVersion 35')) {
      console.log(`[fix-expo-gradle] Already patched: ${realPath}`);
    }
  } catch (e) {
    // File doesn't exist or can't be read
  }
  return false;
}

// Run from the monorepo root (parent of scripts/)
const rootDir = path.resolve(__dirname, '..');
console.log('[fix-expo-gradle] Searching from:', rootDir);

const count = findAndPatchExpoGradle(rootDir);
if (count > 0) {
  console.log(`[fix-expo-gradle] Done! Patched ${count} file(s).`);
} else {
  console.log('[fix-expo-gradle] No files needed patching (may already be patched or expo not installed yet).');
}
