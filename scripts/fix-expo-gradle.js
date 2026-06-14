/**
 * fix-expo-gradle.js
 * 
 * EAS Build post-install hook.
 *
 * 1. Copies fix-16kb.gradle into android/app/ for 16KB page size compliance
 * 
 * 2. Patches expo-modules-core ExpoModulesCorePlugin.gradle to fix:
 *    "Could not get unknown property 'release' for SoftwareComponent container"
 *    This error occurs with AGP 8.7+ where components.release may not exist.
 */

const fs = require('fs');
const path = require('path');

// Step 1: Copy fix-16kb.gradle into android/app/ (belt-and-suspenders with config plugin)
function copyGradleFixScript() {
  const gradleSource = path.join(__dirname, 'fix-16kb.gradle');
  const possibleDests = [
    path.resolve(process.cwd(), 'android', 'app', 'fix-16kb.gradle'),
    path.resolve(__dirname, '..', 'apps', 'customer-app', 'android', 'app', 'fix-16kb.gradle'),
    path.resolve(__dirname, '..', 'apps', 'partners-app', 'android', 'app', 'fix-16kb.gradle'),
  ];

  if (!fs.existsSync(gradleSource)) {
    console.log('[fix-expo-gradle] fix-16kb.gradle not found at', gradleSource);
    return;
  }

  for (const dest of possibleDests) {
    const destDir = path.dirname(dest);
    if (fs.existsSync(destDir)) {
      fs.copyFileSync(gradleSource, dest);
      console.log('[fix-expo-gradle] Copied fix-16kb.gradle to', dest);

      // Also ensure 'apply from' exists in build.gradle
      const buildGradle = path.join(destDir, 'build.gradle');
      if (fs.existsSync(buildGradle)) {
        let content = fs.readFileSync(buildGradle, 'utf8');
        if (!content.includes('fix-16kb.gradle')) {
          content += "\napply from: './fix-16kb.gradle'\n";
          fs.writeFileSync(buildGradle, content, 'utf8');
          console.log('[fix-expo-gradle] Added apply from fix-16kb.gradle to', buildGradle);
        }
      }
      break;
    }
  }
}

copyGradleFixScript();

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
