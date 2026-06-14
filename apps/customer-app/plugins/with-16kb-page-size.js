const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo config plugin that ensures Android 16KB memory page size support.
 *
 * Google Play requires apps targeting Android 15 (API 35) to support 16KB
 * memory page sizes. This plugin:
 *
 * 1. Ensures `expo.useLegacyPackaging=false` in gradle.properties.
 *
 * 2. Injects `pickFirsts` for key native libraries into packagingOptions
 *    (at the packagingOptions level, NOT inside jniLibs block).
 *
 * 3. Appends a Gradle task that uses llvm-objcopy --elf-features=+16k_page_size
 *    (from NDK 28+) to fix precompiled .so files from RN 0.76 / Expo SDK 52
 *    that were built with NDK 26 and have 4KB ELF page alignment.
 *
 * IMPORTANT: NDK 28+ is required. The llvm-objcopy --elf-features flag was
 * added in NDK r28. This is configured in app.json (expo-build-properties)
 * and in android/build.gradle (ext.ndkVersion).
 *
 * This plugin is idempotent — safe to run multiple times.
 */

const PICK_FIRSTS_LINE = "        pickFirsts += ['**/libc++_shared.so', '**/libfbjni.so', '**/libhermes.so', '**/libreactnative.so']";

const ALIGNMENT_TASK_BLOCK = `

// ============================================================
// 16KB Page Size Fix for precompiled .so files (RN 0.76 / NDK 26)
// Uses llvm-objcopy from NDK 28+ to rewrite ELF alignment.
// Official Android fix: https://developer.android.com/guide/practices/page-sizes#precompiled
// ============================================================
afterEvaluate {
    def ndkDir = android.ndkDirectory
    def objcopy = null

    // Find llvm-objcopy in NDK toolchain
    if (ndkDir != null && ndkDir.exists()) {
        fileTree(dir: ndkDir, include: '**/llvm-objcopy').each { f ->
            objcopy = f.absolutePath
        }
    }

    if (objcopy != null) {
        logger.lifecycle "[16KB] Found llvm-objcopy: \${objcopy}"

        // Hook into every merge*JniLib* / merge*NativeLib* task
        tasks.configureEach { task ->
            if (task.name.contains("merge") &&
                (task.name.contains("JniLib") || task.name.contains("NativeLib"))) {

                def variantName = task.name.replace("merge", "")
                                           .replace("JniLibFolders", "")
                                           .replace("JniLib", "")
                                           .replace("NativeLibs", "")
                def alignTaskName = "align16KB\${variantName}"

                // Register alignment task (idempotent)
                def alignTask
                try {
                    alignTask = project.tasks.findByName(alignTaskName)
                    if (!alignTask) {
                        alignTask = project.tasks.create(alignTaskName) {
                            doLast {
                                def mergedDir = file("\${buildDir}/intermediates/merged_jni_libs")
                                if (!mergedDir.exists()) {
                                    mergedDir = file("\${buildDir}/intermediates/merged_native_libs")
                                }
                                if (!mergedDir.exists()) {
                                    logger.lifecycle "[16KB] merged dir not found, skipping"
                                    return
                                }
                                int fixed = 0
                                fileTree(dir: mergedDir, include: ['**/arm64-v8a/*.so', '**/x86_64/*.so']).each { soFile ->
                                    try {
                                        exec {
                                            commandLine objcopy, '--elf-features=+16k_page_size', soFile.absolutePath
                                        }
                                        fixed++
                                    } catch (Exception e) {
                                        logger.warn "[16KB] objcopy failed on \${soFile.name}: \${e.message}"
                                    }
                                }
                                logger.lifecycle "[16KB] Rewrote \${fixed} .so files to 16KB page alignment"
                            }
                        }
                    }
                } catch (Exception e) {
                    logger.warn "[16KB] Could not create \${alignTaskName}: \${e.message}"
                    return
                }

                // Run alignment AFTER merge completes
                task.finalizedBy alignTask

                // Ensure packaging task depends on alignment
                tasks.configureEach { pkgTask ->
                    if (pkgTask.name.contains("Package") && pkgTask.name.toLowerCase().contains(variantName.toLowerCase())) {
                        pkgTask.dependsOn alignTask
                    }
                }
            }
        }
    } else {
        logger.warn "[16KB] WARNING: llvm-objcopy not found. Ensure NDK 28+ is configured."
    }
}
`;

function withAndroid16KBPageSize(config) {
  // Step 1: Ensure expo.useLegacyPackaging=false in gradle.properties
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;

    const existing = props.find(
      (p) => p.type === 'property' && p.key === 'expo.useLegacyPackaging'
    );

    if (existing) {
      existing.value = 'false';
    } else {
      props.push({
        type: 'property',
        key: 'expo.useLegacyPackaging',
        value: 'false',
      });
    }

    return config;
  });

  // Step 2 & 3: Inject pickFirsts + alignment task via withAppBuildGradle
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // --- Inject pickFirsts (if not already present) ---
    if (!contents.includes(PICK_FIRSTS_LINE)) {
      const jniLibsClosePattern = /(jniLibs\s*\{[^}]*useLegacyPackaging[^}]*\})\s*\n(\s*\})/;
      const match = contents.match(jniLibsClosePattern);

      if (match) {
        contents = contents.replace(
          jniLibsClosePattern,
          `$1\n        // Force single copy of each native lib for 16KB page alignment (Android 15+)\n${PICK_FIRSTS_LINE}\n$2`
        );
      }
    }

    // --- Inject alignment task (if not already present) ---
    if (!contents.includes('align16KB')) {
      contents += ALIGNMENT_TASK_BLOCK;
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withAndroid16KBPageSize;
