const { withGradleProperties, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin: Android 16KB Page Size Compliance
 *
 * This plugin:
 * 1. Sets expo.useLegacyPackaging=false (uncompressed .so storage for AGP page alignment)
 * 2. Copies fix-16kb.gradle into the android/app directory
 * 3. Adds 'apply from: ./fix-16kb.gradle' to app/build.gradle
 *
 * The .gradle file is pure Groovy (no JS escaping issues) and hooks into
 * merge + strip tasks to patch ELF p_align from 4096 → 16384.
 */

function withAndroid16KBPageSize(config) {
  // Step 1: Ensure useLegacyPackaging=false
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const existing = props.find(
      p => p.type === 'property' && p.key === 'expo.useLegacyPackaging'
    );
    if (existing) {
      existing.value = 'false';
    } else {
      props.push({ type: 'property', key: 'expo.useLegacyPackaging', value: 'false' });
    }
    return config;
  });

  // Step 2: Copy fix-16kb.gradle into android/app/ directory
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidAppDir = path.join(projectRoot, 'android', 'app');

      // Look for fix-16kb.gradle in scripts/ directory
      const possibleSources = [
        path.join(projectRoot, '..', '..', 'scripts', 'fix-16kb.gradle'),
        path.join(projectRoot, 'scripts', 'fix-16kb.gradle'),
        path.resolve(__dirname, '..', '..', '..', 'scripts', 'fix-16kb.gradle'),
      ];

      let sourceFile = null;
      for (const src of possibleSources) {
        if (fs.existsSync(src)) {
          sourceFile = src;
          break;
        }
      }

      const destFile = path.join(androidAppDir, 'fix-16kb.gradle');

      if (sourceFile) {
        fs.copyFileSync(sourceFile, destFile);
        console.log(`[16KB] Copied fix-16kb.gradle from ${sourceFile}`);
      } else {
        // If the source file isn't found, write a minimal version inline
        console.warn('[16KB] fix-16kb.gradle not found in scripts/, writing inline version');
        fs.writeFileSync(destFile, getInlineGradleScript());
      }

      return config;
    }
  ]);

  // Step 3: Add 'apply from' to app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('fix-16kb.gradle')) {
      // Add at the very end of the file
      contents += "\napply from: './fix-16kb.gradle'\n";
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

function getInlineGradleScript() {
  // Minimal fallback version if the file isn't found
  return `
afterEvaluate {
    def patchElfFiles = { File baseDir ->
        if (!baseDir.exists()) return 0
        int patchedCount = 0
        fileTree(dir: baseDir, includes: ['**/arm64-v8a/**/*.so', '**/x86_64/**/*.so']).each { File soFile ->
            try {
                RandomAccessFile raf = new RandomAccessFile(soFile, "rw")
                try {
                    byte[] ident = new byte[64]
                    raf.readFully(ident)
                    if (ident[0] != (byte)0x7F || ident[1] != (byte)0x45 || ident[2] != (byte)0x4C || ident[3] != (byte)0x46) return
                    if (ident[4] != (byte)2) return
                    long e_phoff = 0L
                    for (int b = 7; b >= 0; b--) { e_phoff = (e_phoff << 8) | ((long)(ident[32 + b] & 0xFF)) }
                    int e_phentsize = (ident[54] & 0xFF) | ((ident[55] & 0xFF) << 8)
                    int e_phnum = (ident[56] & 0xFF) | ((ident[57] & 0xFF) << 8)
                    if (e_phoff == 0 || e_phnum == 0 || e_phentsize < 56) return
                    boolean modified = false
                    for (int i = 0; i < e_phnum; i++) {
                        long phdrOff = e_phoff + ((long)i * (long)e_phentsize)
                        byte[] phdr = new byte[e_phentsize]
                        raf.seek(phdrOff)
                        raf.readFully(phdr)
                        int pType = (phdr[0] & 0xFF) | ((phdr[1] & 0xFF) << 8) | ((phdr[2] & 0xFF) << 16) | ((phdr[3] & 0xFF) << 24)
                        if (pType != 1) continue
                        long pOffset = 0L; for (int b = 7; b >= 0; b--) { pOffset = (pOffset << 8) | ((long)(phdr[8 + b] & 0xFF)) }
                        long pVaddr = 0L; for (int b = 7; b >= 0; b--) { pVaddr = (pVaddr << 8) | ((long)(phdr[16 + b] & 0xFF)) }
                        long pAlign = 0L; for (int b = 7; b >= 0; b--) { pAlign = (pAlign << 8) | ((long)(phdr[48 + b] & 0xFF)) }
                        if (pAlign >= 16384L) continue
                        if ((pOffset % 16384L) == (pVaddr % 16384L)) {
                            raf.seek(phdrOff + 48L)
                            byte[] na = new byte[8]
                            long v = 16384L
                            for (int b = 0; b < 8; b++) { na[b] = (byte)(v & 0xFFL); v = v >> 8 }
                            raf.write(na)
                            modified = true
                        }
                    }
                    if (modified) { patchedCount++; logger.lifecycle("[16KB] PATCHED: " + soFile.absolutePath) }
                } finally { raf.close() }
            } catch (Exception e) { logger.warn("[16KB] ERROR: " + soFile.name + " - " + e.message) }
        }
        return patchedCount
    }
    tasks.each { Task task ->
        if ((task.name.contains("merge") && (task.name.contains("JniLib") || task.name.contains("NativeLib"))) ||
            (task.name.contains("strip") && task.name.contains("Debug"))) {
            task.doLast {
                logger.lifecycle("[16KB] === Patching after: " + task.name + " ===")
                int total = 0
                [new File(buildDir, "intermediates/merged_jni_libs"),
                 new File(buildDir, "intermediates/merged_native_libs"),
                 new File(buildDir, "intermediates/stripped_native_libs")].each { total += patchElfFiles(it) }
                logger.lifecycle("[16KB] === Done: " + total + " files patched ===")
            }
        }
    }
}
`;
}

module.exports = withAndroid16KBPageSize;
