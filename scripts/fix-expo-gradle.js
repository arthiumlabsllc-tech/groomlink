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

const PATCHES = [
  {
    search: 'useDefaultAndroidSdkVersions()',
    replacement: `android {
    compileSdkVersion 35
    namespace 'expo.core'
  }`,
  },
  {
    search: 'useExpoPublishing()',
    replacement: '// useExpoPublishing() removed - not available in this Gradle plugin version',
  },
];

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

    let content = fs.readFileSync(realPath, 'utf8');
    let modified = false;

    for (const { search, replacement } of PATCHES) {
      if (content.includes(search)) {
        content = content.replace(search, replacement);
        modified = true;
        console.log(`[fix-expo-gradle] ✓ Replaced "${search}" in: ${realPath}`);
      }
    }

    if (modified) {
      fs.writeFileSync(realPath, content, 'utf8');
      return true;
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
