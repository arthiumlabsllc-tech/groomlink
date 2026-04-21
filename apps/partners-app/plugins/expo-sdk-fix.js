const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function findExpoBuildGradle(projectRoot) {
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

  const directPath = path.join(projectRoot, 'node_modules', 'expo', 'android', 'build.gradle');
  if (fs.existsSync(directPath)) return directPath;

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
      } catch (e) {}
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
  const buildGradlePath = path.join(projectRoot, 'android', 'build.gradle');
  if (!fs.existsSync(buildGradlePath)) {
    console.log('[expo-sdk-fix] Root build.gradle not found yet');
    return;
  }

  let content = fs.readFileSync(buildGradlePath, 'utf8');
  const suppressBlock = `
// Suppress NDK minSdk version error for all subprojects
allprojects {
    afterEvaluate { project ->
        project.extensions.findByName("android")?.with {
            it.experimentalProperties["android.ndk.suppressMinSdkVersionError"] = 21
        }
    }
}`;

  if (!content.includes('suppressMinSdkVersionError')) {
    content += suppressBlock;
    fs.writeFileSync(buildGradlePath, content, 'utf8');
    console.log('[expo-sdk-fix] Added NDK suppress to root build.gradle allprojects');
  }
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

      // 3. Patch expo's build.gradle if needed
      const gradlePath = findExpoBuildGradle(projectRoot);
      if (gradlePath) {
        console.log('[expo-sdk-fix] Found expo build.gradle at:', gradlePath);
        patchBuildGradle(gradlePath);
      }

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
