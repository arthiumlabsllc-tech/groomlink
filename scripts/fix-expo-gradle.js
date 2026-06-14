/**
 * fix-expo-gradle.js
 * 
 * EAS Build post-install hook.
 *
 * 1. Patches .so files in node_modules to 16KB alignment (p_align 4096→16384)
 *    before npx expo prebuild runs. The patched files get copied into the AAB.
 * 
 * 2. Patches expo-modules-core ExpoModulesCorePlugin.gradle to fix:
 *    "Could not get unknown property 'release' for SoftwareComponent container"
 *    This error occurs with AGP 8.7+ where components.release may not exist.
 */

const fs = require('fs');
const path = require('path');

// Step 1: Patch .so files in node_modules
console.log('[fix-expo-gradle] Patching .so files in node_modules...');
const { execSync } = require('child_process');
try {
  execSync(`node "${path.join(__dirname, 'patch-so-elf.js')}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('[fix-expo-gradle] Failed to patch .so files:', err.message);
}

// Step 2: Patch ExpoModulesCorePlugin.gradle

function patchExpoModulesCorePlugin() {
  const possiblePaths = [
    path.resolve(__dirname, '..', 'apps', 'customer-app', 'node_modules', 'expo-modules-core', 'android', 'ExpoModulesCorePlugin.gradle'),
    path.resolve(__dirname, '..', 'node_modules', 'expo-modules-core', 'android', 'ExpoModulesCorePlugin.gradle'),
    path.resolve(process.cwd(), 'node_modules', 'expo-modules-core', 'android', 'ExpoModulesCorePlugin.gradle'),
  ];

  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log('[fix-expo-gradle] ExpoModulesCorePlugin.gradle not found, skipping');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('components.findByName')) {
    console.log('[fix-expo-gradle] Already patched, skipping');
    return;
  }

  if (content.includes('from components.release')) {
    content = content.replace('from components.release',
      "def releaseComponent = components.findByName('release')\n          if (releaseComponent) {\n            from releaseComponent\n          }");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[fix-expo-gradle] Patched components.release -> findByName in', filePath);
  } else {
    console.log('[fix-expo-gradle] No patch needed - components.release not found in file');
  }
}

patchExpoModulesCorePlugin();
console.log('[fix-expo-gradle] Done');
