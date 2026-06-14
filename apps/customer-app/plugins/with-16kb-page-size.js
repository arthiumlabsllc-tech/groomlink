const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo config plugin: Android 16KB Page Size Compliance
 *
 * Patches ELF64 program headers in-place for ALL 64-bit .so files,
 * rewriting p_align from 4096 → 16384 on every PT_LOAD segment.
 *
 * KEY APPROACH: Injects patching code via `doLast` directly into the
 * merge and strip Gradle tasks (NOT as separate tasks via finalizedBy).
 * This guarantees the patching runs as part of those tasks, eliminating
 * any task ordering issues.
 */

const ALIGNMENT_BLOCK = `

// ============================================================
// 16KB Page Size ELF Patcher — Pure Groovy
// Rewrites p_align in ELF64 PT_LOAD segments from 4096 → 16384.
// Injected via doLast on merge + strip tasks to guarantee execution.
// ============================================================
afterEvaluate {
    def patchElf16KB = { String taskDisplayName ->
        // --- ELF64 helpers ---
        def readUShort = { byte[] buf, int off ->
            (buf[off] & 0xFF) | ((buf[off+1] & 0xFF) << 8)
        }
        def readLong = { byte[] buf, int off ->
            long v = 0
            for (int i = 7; i >= 0; i--) { v = (v << 8) | (buf[off + i] & 0xFFL) }
            return v
        }
        def writeLong = { byte[] buf, int off, long val ->
            for (int i = 0; i < 8; i++) { buf[off + i] = (byte)(val & 0xFF); val >>= 8 }
        }

        // Search ALL known intermediate directories for 64-bit .so files
        def searchDirs = [
            file("\${buildDir}/intermediates/merged_jni_libs"),
            file("\${buildDir}/intermediates/merged_native_libs"),
            file("\${buildDir}/intermediates/stripped_native_libs"),
            file("\${buildDir}/intermediates/transforms"),
            file("\${buildDir}/intermediates/merged_jni_libs/release"),
            file("\${buildDir}/intermediates/merged_native_libs/release"),
            file("\${buildDir}/intermediates/stripped_native_libs/release"),
            file("\${buildDir}/intermediates/merged_jni_libs/release/mergeReleaseJniLibFolders"),
            file("\${buildDir}/intermediates/merged_native_libs/release/mergeReleaseNativeLibs"),
            file("\${buildDir}/intermediates/stripped_native_libs/release/stripReleaseDebugSymbols"),
        ]
        int totalFixed = 0
        int totalSkipped = 0

        searchDirs.each { dir ->
            if (!dir.exists()) return
            fileTree(dir: dir, include: ['**/arm64-v8a/*.so', '**/x86_64/*.so']).each { soFile ->
                try {
                    def raf = new RandomAccessFile(soFile, "rw")
                    try {
                        def ident = new byte[64]
                        raf.readFully(ident)
                        // ELF magic check
                        if (ident[0] != 0x7F || ident[1] != 0x45 || ident[2] != 0x4C || ident[3] != 0x46) return
                        // Must be 64-bit
                        if (ident[4] != 2) return

                        long e_phoff = readLong(ident, 32)
                        int e_phentsize = readUShort(ident, 54)
                        int e_phnum = readUShort(ident, 56)
                        if (e_phoff == 0 || e_phnum == 0) return

                        boolean modified = false
                        for (int i = 0; i < e_phnum; i++) {
                            long phOffset = e_phoff + ((long)i * e_phentsize)
                            def phdr = new byte[e_phentsize]
                            raf.seek(phOffset)
                            raf.readFully(phdr)

                            int p_type = (phdr[0] & 0xFF) | ((phdr[1] & 0xFF) << 8) |
                                         ((phdr[2] & 0xFF) << 16) | ((phdr[3] & 0xFF) << 24)
                            if (p_type != 1) continue  // PT_LOAD only

                            long p_offset = readLong(phdr, 8)
                            long p_vaddr  = readLong(phdr, 16)
                            long p_align  = readLong(phdr, 48)

                            if (p_align >= 16384L) continue  // already aligned

                            long offMod = p_offset % 16384L
                            long vaddrMod = p_vaddr % 16384L

                            if (offMod == vaddrMod) {
                                raf.seek(phOffset + 48)
                                def buf = new byte[8]
                                writeLong(buf, 0, 16384L)
                                raf.write(buf)
                                modified = true
                            } else {
                                totalSkipped++
                                logger.warn "[16KB] SKIP \${soFile.name} seg \${i}: off%16K=\${offMod} vaddr%16K=\${vaddrMod}"
                            }
                        }
                        if (modified) {
                            totalFixed++
                            logger.lifecycle "[16KB] PATCHED \${soFile.absolutePath}"
                        }
                    } finally { raf.close() }
                } catch (Exception e) {
                    logger.warn "[16KB] ERROR \${soFile.name}: \${e.message}"
                }
            }
        }
        logger.lifecycle "[16KB] \${taskDisplayName}: patched=\${totalFixed}, skipped=\${totalSkipped}"
    }

    // Hook into ALL task types that handle .so files
    tasks.withType(Task) { task ->
        def name = task.name

        // Merge tasks: mergeReleaseJniLibFolders, mergeReleaseNativeLibs, etc.
        if (name.contains("merge") && (name.contains("JniLib") || name.contains("NativeLib"))) {
            task.doLast {
                logger.lifecycle "[16KB] >>> Patching after \${name}"
                patchElf16KB(name)
            }
        }

        // Strip tasks: stripReleaseDebugSymbols, stripReleaseNativeDebugSymbols, etc.
        if (name.contains("strip") && (name.contains("Native") || name.contains("Debug") || name.contains("Symbol"))) {
            task.doLast {
                logger.lifecycle "[16KB] >>> Patching after \${name}"
                patchElf16KB(name)
            }
        }
    }

    // Standalone task for manual verification
    tasks.register("patch16KBVerify") {
        doLast {
            logger.lifecycle "[16KB] Running standalone ELF verification..."
            patchElf16KB("patch16KBVerify")
        }
    }
}
`;

function withAndroid16KBPageSize(config) {
  // Step 1: Ensure expo.useLegacyPackaging=false
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const existing = props.find(p => p.type === 'property' && p.key === 'expo.useLegacyPackaging');
    if (existing) { existing.value = 'false'; }
    else { props.push({ type: 'property', key: 'expo.useLegacyPackaging', value: 'false' }); }
    return config;
  });

  // Step 2: Inject ELF patcher into app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Inject pickFirsts for native libs (avoid merge conflicts)
    const pickFirsts = "        pickFirsts += ['**/libc++_shared.so', '**/libfbjni.so', '**/libhermes.so', '**/libreactnative.so']";
    if (!contents.includes(pickFirsts)) {
      const jniLibsClose = /(jniLibs\s*\{[^}]*useLegacyPackaging[^}]*\})\s*\n(\s*\})/;
      const match = contents.match(jniLibsClose);
      if (match) {
        contents = contents.replace(jniLibsClose, `$1\n${pickFirsts}\n$2`);
      }
    }

    // Inject ELF patcher (idempotent)
    if (!contents.includes('patchElf16KB')) {
      contents += ALIGNMENT_BLOCK;
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withAndroid16KBPageSize;
