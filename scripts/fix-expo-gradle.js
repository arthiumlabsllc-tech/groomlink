/**
 * fix-expo-gradle.js
 * 
 * EAS Build post-install hook.
 * 
 * 1. Patches react-native-maps CMakeLists.txt to fix:
 *    "Unknown CMake command 'target_compile_reactnative_options'"
 *    This function was removed/renamed in RN 0.79.
 * 
 * 2. Patches expo-modules-core ExpoModulesCorePlugin.gradle to fix:
 *    "Could not get unknown property 'release' for SoftwareComponent container"
 *    This error occurs with AGP 8.7+ where components.release may not exist.
 */

const fs = require('fs');
const path = require('path');

function patchReactNativeMapsCMake() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'node_modules', 'react-native-maps', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'),
    path.resolve(__dirname, '..', 'apps', 'customer-app', 'node_modules', 'react-native-maps', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'),
  ];

  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log('[fix-expo-gradle] react-native-maps CMakeLists.txt not found, skipping');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('target_compile_reactnative_options')) {
    console.log('[fix-expo-gradle] react-native-maps CMake already compatible, skipping');
    return;
  }

  // Replace the RN 0.81+ only function with standard CMake equivalent
  content = content.replace(
    /target_compile_reactnative_options\(([^)]+)\)/g,
    'target_compile_options($1 PRIVATE -fexceptions -frtti -std=c++20 -DWITH_INSPECTOR=1)'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[fix-expo-gradle] Patched react-native-maps CMakeLists.txt for RN 0.79 compatibility:', filePath);
}

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

patchReactNativeMapsCMake();
patchExpoModulesCorePlugin();
console.log('[fix-expo-gradle] Done');
