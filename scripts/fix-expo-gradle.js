#!/usr/bin/env node
/**
 * fix-expo-gradle.js
 * 
 * Brute-force patches ALL build.gradle files in node_modules that contain
 * Expo's undefined Gradle helper methods. Searches recursively.
 * 
 * Methods patched:
 * - useDefaultAndroidSdkVersions() -> explicit compileSdkVersion 35
 * - useExpoPublishing() -> commented out
 * - useCoreDependencies() -> explicit compileSdkVersion 35
 */
const fs = require('fs');
const path = require('path');

console.log('=== [fix-expo-gradle] Starting ===');
console.log('[fix-expo-gradle] __dirname:', __dirname);
console.log('[fix-expo-gradle] cwd:', process.cwd());

// Find the monorepo root by searching upward for pnpm-workspace.yaml or node_modules/.pnpm
function findMonorepoRoot() {
  const candidates = [
    path.resolve(__dirname, '..'),          // scripts/ -> root
    process.cwd(),                          // current working directory
    path.resolve(process.cwd(), '../..'),   // apps/customer-app -> root
    path.resolve(process.cwd(), '..'),      // one level up
  ];
  
  for (const candidate of candidates) {
    const pnpmDir = path.join(candidate, 'node_modules', '.pnpm');
    if (fs.existsSync(pnpmDir)) {
      console.log('[fix-expo-gradle] Found monorepo root:', candidate);
      return candidate;
    }
  }
  
  // Last resort: search upward from cwd
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const pnpmDir = path.join(dir, 'node_modules', '.pnpm');
    if (fs.existsSync(pnpmDir)) {
      console.log('[fix-expo-gradle] Found monorepo root (upward search):', dir);
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  
  console.error('[fix-expo-gradle] ERROR: Could not find monorepo root!');
  return null;
}

/**
 * Recursively find all build.gradle files in a directory (max depth limited)
 */
function findGradleFiles(dir, maxDepth, currentDepth = 0) {
  const results = [];
  if (currentDepth > maxDepth) return results;
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isFile() && entry.name === 'build.gradle') {
        results.push(fullPath);
      } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'build' && entry.name !== 'gradle') {
        results.push(...findGradleFiles(fullPath, maxDepth, currentDepth + 1));
      } else if (entry.isSymbolicLink()) {
        // Follow symlinks for directories
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            results.push(...findGradleFiles(fullPath, maxDepth, currentDepth + 1));
          }
        } catch (e) { /* broken symlink */ }
      }
    }
  } catch (e) {
    // Permission error or other issue
  }
  
  return results;
}

/**
 * Patch a single build.gradle file
 */
function patchFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    if (content.includes('useDefaultAndroidSdkVersions()')) {
      content = content.replace(/useDefaultAndroidSdkVersions\(\)/g, 
        `android {\n    compileSdkVersion 35\n    namespace 'expo.core'\n  }`);
      modified = true;
    }
    
    if (content.includes('useExpoPublishing()')) {
      content = content.replace(/useExpoPublishing\(\)/g,
        '// useExpoPublishing() - patched out');
      modified = true;
    }
    
    if (content.includes('useCoreDependencies()')) {
      content = content.replace(/useCoreDependencies\(\)/g,
        `android {\n    compileSdkVersion 35\n  }`);
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('[fix-expo-gradle] ✓ PATCHED:', filePath);
      return true;
    }
  } catch (e) {
    console.log('[fix-expo-gradle] Error reading/writing:', filePath, e.message);
  }
  return false;
}

// Main
const rootDir = findMonorepoRoot();
if (!rootDir) {
  console.error('[fix-expo-gradle] FATAL: Cannot find node_modules/.pnpm directory');
  process.exit(0); // Don't fail the build, just warn
}

const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');
console.log('[fix-expo-gradle] Scanning .pnpm directory:', pnpmDir);

// Get all expo-related directories in .pnpm
let patchedCount = 0;
try {
  const pnpmEntries = fs.readdirSync(pnpmDir);
  const expoEntries = pnpmEntries.filter(e => e.includes('expo'));
  console.log(`[fix-expo-gradle] Found ${expoEntries.length} expo-related entries in .pnpm`);
  
  for (const entry of expoEntries) {
    const entryPath = path.join(pnpmDir, entry);
    // Search for build.gradle files (limit depth to 5 to avoid infinite recursion)
    const gradleFiles = findGradleFiles(entryPath, 5);
    
    for (const gradleFile of gradleFiles) {
      if (patchFile(gradleFile)) {
        patchedCount++;
      }
    }
  }
} catch (e) {
  console.error('[fix-expo-gradle] Error scanning pnpm directory:', e.message);
}

// Also check direct node_modules symlinks
const directModules = path.join(rootDir, 'node_modules');
try {
  const entries = fs.readdirSync(directModules);
  for (const entry of entries) {
    if (entry === 'expo' || entry.startsWith('expo-')) {
      const gradlePath = path.join(directModules, entry, 'android', 'build.gradle');
      try {
        const realPath = fs.realpathSync(gradlePath);
        if (patchFile(realPath)) patchedCount++;
      } catch (e) { /* doesn't exist */ }
    }
  }
} catch (e) { /* ignore */ }

console.log(`\n=== [fix-expo-gradle] Complete: ${patchedCount} file(s) patched ===`);
