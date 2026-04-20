/**
 * fix-expo-gradle.js
 * 
 * Patches ALL expo module android/build.gradle files to replace undefined
 * Gradle helper methods with explicit configurations.
 * 
 * In Expo SDK 52 with pnpm workspaces, the Expo Gradle plugin that provides
 * these helper methods (useDefaultAndroidSdkVersions, useExpoPublishing,
 * useCoreDependencies) doesn't load properly. This script patches all
 * affected build.gradle files after pnpm install.
 * 
 * Runs as a postinstall script at the monorepo root level.
 */
const fs = require('fs');
const path = require('path');

// Methods to patch and their replacements
const PATCHES = [
  {
    // Main expo package - sets SDK versions
    search: /useDefaultAndroidSdkVersions\(\)/g,
    replacement: `android {
    compileSdkVersion 35
    namespace 'expo.core'
  }`,
  },
  {
    // Main expo package - publishing config
    search: /useExpoPublishing\(\)/g,
    replacement: '// useExpoPublishing() - removed (not available in this Gradle plugin version)',
  },
  {
    // Individual expo modules - sets up core dependencies and SDK
    search: /useCoreDependencies\(\)/g,
    replacement: `android {
    compileSdkVersion 35
  }`,
  },
];

/**
 * Recursively find all build.gradle files in expo-related packages
 */
function findAllExpoGradleFiles(rootDir) {
  const files = new Set();
  
  // Search in root node_modules (direct symlinks)
  const rootNodeModules = path.join(rootDir, 'node_modules');
  findExpoGradlesIn(rootNodeModules, files);
  
  // Search in .pnpm store (real files)
  const pnpmDir = path.join(rootNodeModules, '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    try {
      const entries = fs.readdirSync(pnpmDir);
      for (const entry of entries) {
        if (entry.startsWith('expo') || entry.includes('expo')) {
          const nestedModules = path.join(pnpmDir, entry, 'node_modules');
          if (fs.existsSync(nestedModules)) {
            findExpoGradlesIn(nestedModules, files);
          }
        }
      }
    } catch (e) {
      console.log('[fix-expo-gradle] Error scanning pnpm dir:', e.message);
    }
  }
  
  // Search in app-level node_modules
  const appsDir = path.join(rootDir, 'apps');
  if (fs.existsSync(appsDir)) {
    try {
      const apps = fs.readdirSync(appsDir);
      for (const app of apps) {
        const appNodeModules = path.join(appsDir, app, 'node_modules');
        findExpoGradlesIn(appNodeModules, files);
      }
    } catch (e) {
      // ignore
    }
  }
  
  return files;
}

/**
 * Find build.gradle files in expo-* packages within a node_modules directory
 */
function findExpoGradlesIn(nodeModulesDir, files) {
  if (!fs.existsSync(nodeModulesDir)) return;
  
  try {
    const entries = fs.readdirSync(nodeModulesDir);
    for (const entry of entries) {
      if (entry === 'expo' || entry.startsWith('expo-') || entry === '@expo') {
        if (entry === '@expo') {
          // Scan @expo/* packages
          const scopedDir = path.join(nodeModulesDir, entry);
          try {
            const scopedEntries = fs.readdirSync(scopedDir);
            for (const scopedEntry of scopedEntries) {
              const gradlePath = path.join(scopedDir, scopedEntry, 'android', 'build.gradle');
              addRealPath(gradlePath, files);
            }
          } catch (e) { /* ignore */ }
        } else {
          const gradlePath = path.join(nodeModulesDir, entry, 'android', 'build.gradle');
          addRealPath(gradlePath, files);
        }
      }
    }
  } catch (e) {
    // Directory doesn't exist or can't be read
  }
}

function addRealPath(filePath, files) {
  try {
    const realPath = fs.realpathSync(filePath);
    if (fs.existsSync(realPath)) {
      files.add(realPath);
    }
  } catch (e) {
    // File doesn't exist
  }
}

/**
 * Apply all patches to a single build.gradle file
 */
function patchFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const { search, replacement } of PATCHES) {
      if (search.test ? search.test(content) : content.includes(search)) {
        // Reset regex lastIndex
        if (search.lastIndex !== undefined) search.lastIndex = 0;
        content = content.replace(search, replacement);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
  } catch (e) {
    console.log(`[fix-expo-gradle] Error patching ${filePath}:`, e.message);
  }
  return false;
}

// Main execution
const rootDir = path.resolve(__dirname, '..');
console.log('[fix-expo-gradle] Searching for expo build.gradle files from:', rootDir);

const gradleFiles = findAllExpoGradleFiles(rootDir);
console.log(`[fix-expo-gradle] Found ${gradleFiles.size} expo build.gradle file(s)`);

let patchedCount = 0;
for (const file of gradleFiles) {
  if (patchFile(file)) {
    console.log(`[fix-expo-gradle] ✓ Patched: ${file}`);
    patchedCount++;
  }
}

if (patchedCount > 0) {
  console.log(`[fix-expo-gradle] Done! Patched ${patchedCount} file(s).`);
} else {
  console.log('[fix-expo-gradle] No files needed patching.');
}
