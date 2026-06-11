/**
 * fix-expo-gradle.js
 * 
 * 1. Patches expo-modules-core ExpoModulesCorePlugin.gradle to fix:
 *    "Could not get unknown property 'release' for SoftwareComponent container"
 *    This error occurs with AGP 8.7+ where components.release may not exist.
 * 
 * 2. Patches app/build.gradle to add doNotStrip for .so files
 *    to ensure 16KB page alignment for Android 15+ / Google Play.
 */

const fs = require('fs');
const path = require('path');

function patchBuildGradleFor16KB() {
  // Find app/build.gradle in the current app directory
  const possiblePaths = [
    path.resolve(process.cwd(), 'android', 'app', 'build.gradle'),
    path.resolve(__dirname, '..', 'apps', 'customer-app', 'android', 'app', 'build.gradle'),
    path.resolve(__dirname, '..', 'apps', 'partners-app', 'android', 'app', 'build.gradle'),
  ];

  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log('[fix-expo-gradle] app/build.gradle not found, skipping 16KB patch');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already patched
  if (content.includes("doNotStrip '**/*.so'") || content.includes('doNotStrip "**/*.so"')) {
    console.log('[fix-expo-gradle] build.gradle already has doNotStrip, skipping');
    return;
  }

  // Add doNotStrip to the packagingOptions block
  const oldBlock = `packagingOptions {
        jniLibs {
            useLegacyPackaging (findProperty('expo.useLegacyPackaging')?.toBoolean() ?: false)
        }
    }`;

  const newBlock = `packagingOptions {
        jniLibs {
            useLegacyPackaging (findProperty('expo.useLegacyPackaging')?.toBoolean() ?: false)
        }
        // Force all .so files to be uncompressed to ensure 16KB page alignment for Android 15+
        doNotStrip '**/*.so'
    }`;

  if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[fix-expo-gradle] Added doNotStrip for .so files in', filePath);
  } else {
    // Try a more flexible approach - find any packagingOptions with jniLibs
    const jniLibsPattern = /(packagingOptions\s*\{[\s\S]*?jniLibs\s*\{[\s\S]*?useLegacyPackaging[^}]*\}[\s\S]*?\})/;
    const match = content.match(jniLibsPattern);
    if (match) {
      const oldJniBlock = match[1];
      const newJniBlock = oldJniBlock.replace(
        /(useLegacyPackaging[^}]*\})/, 
        "$1\n        }\n        // Force all .so files uncompressed for 16KB alignment\n        doNotStrip '**/*.so'"
      );
      // Fix the double closing brace
      const fixedBlock = newJniBlock.replace(/\}\s*\}\s*\}/, '}\n        }\n    }');
      content = content.replace(oldJniBlock, newJniBlock);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('[fix-expo-gradle] Added doNotStrip (flexible) in', filePath);
    } else {
      console.log('[fix-expo-gradle] Could not find packagingOptions block in build.gradle');
    }
  }
}

function patchExpoModulesCorePlugin() {
  // Find the ExpoModulesCorePlugin.gradle
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

  // Check if already patched
  if (content.includes('components.findByName')) {
    console.log('[fix-expo-gradle] Already patched, skipping');
    return;
  }

  // Replace the problematic publishing block
  const oldBlock = `  project.afterEvaluate {
    publishing {
      publications {
        release(MavenPublication) {
          from components.release
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }`;

  const newBlock = `  project.afterEvaluate {
    publishing {
      publications {
        release(MavenPublication) {
          def releaseComponent = components.findByName('release')
          if (releaseComponent) {
            from releaseComponent
          }
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }`;

  if (content.includes('from components.release')) {
    content = content.replace('from components.release', 
      "def releaseComponent = components.findByName('release')\n          if (releaseComponent) {\n            from releaseComponent\n          }");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[fix-expo-gradle] Patched components.release -> findByName in', filePath);
  } else {
    console.log('[fix-expo-gradle] No patch needed - components.release not found in file');
  }
}

patchBuildGradleFor16KB();
patchExpoModulesCorePlugin();
console.log('[fix-expo-gradle] Done');
