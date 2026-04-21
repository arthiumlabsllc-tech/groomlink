const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// DEPRECATED: No longer needed. expo-build-properties plugin in app.json
// handles SDK version configuration, and ExpoModulesCorePlugin.gradle defines
// helper functions using safeExtGet(). Patching build.gradle files was causing
// duplicate android{} blocks and Kotlin compilation errors.
function findExpoBuildGradle() {
  return null;
}

// DEPRECATED: No-op. Build.gradle patching is no longer needed.
// eslint-disable-next-line no-unused-vars
function patchBuildGradle(filePath) {
  return false;
}

function patchGradleProperties(projectRoot) {
  const gradlePropsPath = path.join(projectRoot, 'android', 'gradle.properties');
  const ndkSuppressLine = 'android.ndk.suppressMinSdkVersionError=21';

  // Create android/ dir if it doesn't exist yet
  const androidDir = path.join(projectRoot, 'android');
  if (!fs.existsSync(androidDir)) {
    fs.mkdirSync(androidDir, { recursive: true });
    console.log('[expo-sdk-fix] Created android/ directory');
  }

  if (fs.existsSync(gradlePropsPath)) {
    let content = fs.readFileSync(gradlePropsPath, 'utf8');
    if (!content.includes('suppressMinSdkVersionError')) {
      content += '\n# Suppress NDK minSdk error for expo-modules-core\n' + ndkSuppressLine + '\n';
      fs.writeFileSync(gradlePropsPath, content, 'utf8');
      console.log('[expo-sdk-fix] Appended NDK suppress to existing gradle.properties');
    }
  } else {
    // Create the file - it will be merged with Expo's generated one
    fs.writeFileSync(gradlePropsPath, '# NDK compatibility\n' + ndkSuppressLine + '\n', 'utf8');
    console.log('[expo-sdk-fix] Created gradle.properties with NDK suppress');
  }
}

function patchRootBuildGradle(projectRoot) {
  // NO-OP: NDK minSdk suppression is already handled correctly via
  // gradle.properties by patchGradleProperties(). Injecting an
  // afterEvaluate block here causes "Cannot run Project.afterEvaluate(Closure)
  // when the project is already evaluated" because the project has already
  // been evaluated by the time this config plugin runs.
  // eslint-disable-next-line no-unused-vars
  void projectRoot;
  return;
}

function withExpoSdkFix(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      console.log('[expo-sdk-fix] Project root:', projectRoot);

      // 1. Patch gradle.properties (create if needed)
      patchGradleProperties(projectRoot);

      // 2. Patch root build.gradle with allprojects block
      patchRootBuildGradle(projectRoot);

      // 3. Build.gradle patching REMOVED - handled by expo-build-properties plugin

      // 4. Log gradle.properties for debugging
      const propsPath = path.join(projectRoot, 'android', 'gradle.properties');
      if (fs.existsSync(propsPath)) {
        const propsContent = fs.readFileSync(propsPath, 'utf8');
        const hasSuppress = propsContent.includes('suppressMinSdkVersionError');
        console.log('[expo-sdk-fix] gradle.properties has NDK suppress:', hasSuppress);
      }

      return config;
    },
  ]);
}

module.exports = withExpoSdkFix;
