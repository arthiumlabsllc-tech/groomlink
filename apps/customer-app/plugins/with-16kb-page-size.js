const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo config plugin that ensures Android 16KB memory page size support.
 *
 * Google Play requires apps targeting Android 15 (API 35) to support 16KB
 * memory page sizes. React Native 0.76 ships precompiled .so files with
 * 4KB ELF page alignment (built with NDK 26). This plugin:
 *
 * 1. Ensures `expo.useLegacyPackaging=false` in gradle.properties.
 *
 * 2. Injects `pickFirsts` for key native libraries into packagingOptions.
 *
 * 3. Appends a pure Groovy Gradle task that patches ELF64 program headers
 *    in-place: rewrites p_align from 4096 to 16384 for all PT_LOAD segments
 *    in 64-bit .so files (arm64-v8a, x86_64). This is safe when the segment
 *    layout already satisfies 16KB alignment (p_offset % 16384 == p_vaddr % 16384),
 *    which is the case for most .so files produced by the Android linker.
 *
 * No external tools (NDK, llvm-objcopy, patchelf) required — runs on any
 * EAS Build / Gradle environment.
 *
 * This plugin is idempotent — safe to run multiple times.
 */

const PICK_FIRSTS_LINE = "        pickFirsts += ['**/libc++_shared.so', '**/libfbjni.so', '**/libhermes.so', '**/libreactnative.so']";

const ALIGNMENT_TASK_BLOCK = `

// ============================================================
// 16KB Page Size ELF Patcher — Pure Groovy, no external tools
// Fixes precompiled .so files from RN 0.76 / Expo SDK 52 that
// were built with NDK 26 and have 4KB ELF page alignment.
// Rewrites p_align in ELF64 PT_LOAD segments from 4096 to 16384.
// ============================================================
afterEvaluate {
    tasks.configureEach { task ->
        if (task.name.contains("merge") &&
            (task.name.contains("JniLib") || task.name.contains("NativeLib"))) {

            def variantName = task.name.replace("merge", "")
                                       .replace("JniLibFolders", "")
                                       .replace("JniLib", "")
                                       .replace("NativeLibs", "")
            def alignTaskName = "align16KB\${variantName}"

            def alignTask
            try {
                alignTask = project.tasks.findByName(alignTaskName)
                if (!alignTask) {
                    alignTask = project.tasks.create(alignTaskName) {
                        doLast {
                            // Helper: read 2-byte LE unsigned short
                            def readUShort = { byte[] buf, int off ->
                                (buf[off] & 0xFF) | ((buf[off+1] & 0xFF) << 8)
                            }
                            // Helper: read 8-byte LE long
                            def readLong = { byte[] buf, int off ->
                                long v = 0
                                for (int i = 7; i >= 0; i--) {
                                    v = (v << 8) | (buf[off + i] & 0xFFL)
                                }
                                return v
                            }
                            // Helper: write 8-byte LE long
                            def writeLong = { byte[] buf, int off, long val ->
                                for (int i = 0; i < 8; i++) {
                                    buf[off + i] = (byte)(val & 0xFF)
                                    val >>= 8
                                }
                            }

                            def mergedDir = file("\${buildDir}/intermediates/merged_jni_libs")
                            if (!mergedDir.exists()) {
                                mergedDir = file("\${buildDir}/intermediates/merged_native_libs")
                            }
                            if (!mergedDir.exists()) {
                                logger.lifecycle "[16KB] merged dir not found, skipping"
                                return
                            }

                            int fixed = 0
                            int skipped = 0
                            fileTree(dir: mergedDir, include: ['**/arm64-v8a/*.so', '**/x86_64/*.so']).each { soFile ->
                                try {
                                    def raf = new RandomAccessFile(soFile, "rw")
                                    try {
                                        // Read ELF identification (first 64 bytes for ELF64 header)
                                        def ident = new byte[64]
                                        raf.readFully(ident)

                                        // Verify ELF magic
                                        if (ident[0] != 0x7F || ident[1] != 0x45 || ident[2] != 0x4C || ident[3] != 0x46) {
                                            return // Not an ELF file
                                        }
                                        // Must be 64-bit (EI_CLASS = 2)
                                        if (ident[4] != 2) {
                                            return // Skip 32-bit .so files
                                        }

                                        // Parse ELF64 header fields (little-endian)
                                        long e_phoff = readLong(ident, 32)
                                        int e_phentsize = readUShort(ident, 54)
                                        int e_phnum = readUShort(ident, 56)

                                        if (e_phoff == 0 || e_phnum == 0) return

                                        boolean modified = false

                                        for (int i = 0; i < e_phnum; i++) {
                                            long phOffset = e_phoff + ((long)i * e_phentsize)

                                            // Read entire program header entry
                                            def phdr = new byte[e_phentsize]
                                            raf.seek(phOffset)
                                            raf.readFully(phdr)

                                            // p_type at offset 0 in Phdr (4 bytes LE)
                                            int p_type = (phdr[0] & 0xFF) | ((phdr[1] & 0xFF) << 8) |
                                                         ((phdr[2] & 0xFF) << 16) | ((phdr[3] & 0xFF) << 24)

                                            // PT_LOAD = 1
                                            if (p_type != 1) continue

                                            // ELF64 Phdr layout:
                                            //   0: p_type(4)  4: p_flags(4)  8: p_offset(8)
                                            //  16: p_vaddr(8) 24: p_paddr(8) 32: p_filesz(8)
                                            //  40: p_memsz(8) 48: p_align(8)
                                            long p_offset = readLong(phdr, 8)
                                            long p_vaddr  = readLong(phdr, 16)
                                            long p_align  = readLong(phdr, 48)

                                            // Only patch if alignment < 16KB
                                            if (p_align < 16384L) {
                                                // Safety: check layout constraint
                                                // p_offset ≡ p_vaddr (mod p_align) must hold for new alignment
                                                long offMod = p_offset % 16384L
                                                long vaddrMod = p_vaddr % 16384L

                                                if (offMod == vaddrMod) {
                                                    // Write new p_align = 16384
                                                    raf.seek(phOffset + 48)
                                                    def buf = new byte[8]
                                                    writeLong(buf, 0, 16384L)
                                                    raf.write(buf)
                                                    modified = true
                                                } else {
                                                    skipped++
                                                    logger.warn "[16KB] Cannot align \${soFile.name} segment \${i}: offset%16K=\${offMod} != vaddr%16K=\${vaddrMod}"
                                                }
                                            }
                                        }

                                        if (modified) {
                                            fixed++
                                        }
                                    } finally {
                                        raf.close()
                                    }
                                } catch (Exception e) {
                                    logger.warn "[16KB] Failed to patch \${soFile.name}: \${e.message}"
                                }
                            }
                            logger.lifecycle "[16KB] Patched \${fixed} .so files to 16KB page alignment (\${skipped} skipped)"
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

  // Step 2 & 3: Inject pickFirsts + ELF patcher task via withAppBuildGradle
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

    // --- Inject ELF patcher task (if not already present) ---
    if (!contents.includes('align16KB')) {
      contents += ALIGNMENT_TASK_BLOCK;
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withAndroid16KBPageSize;
