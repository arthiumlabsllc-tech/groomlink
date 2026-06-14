/**
 * patch-so-elf.js — Patches ELF64 program headers in .so files from node_modules
 *
 * Rewrites p_align from 4096 → 16384 for all PT_LOAD segments in arm64-v8a and
 * x86_64 .so files. Runs during eas-build-post-install (after npm install, before
 * npx expo prebuild), so the patched .so files get copied into the AAB.
 *
 * No Gradle task needed — just patches the source files directly.
 */

const fs = require('fs');
const path = require('path');

// Read helpers for little-endian binary data
function readUShort(buf, offset) {
  return buf[offset] | (buf[offset + 1] << 8);
}

function readLong(buf, offset) {
  return Number(buf.readBigUInt64LE(offset));
}

function writeLong(buf, offset, value) {
  buf.writeBigUInt64LE(BigInt(value), offset);
}

// Patch a single .so file in-place
function patchSoFile(filePath) {
  const fd = fs.openSync(filePath, 'r+');
  try {
    // Read ELF header (64 bytes for ELF64)
    const header = Buffer.alloc(64);
    const bytesRead = fs.readSync(fd, header, 0, 64, 0);
    if (bytesRead < 64) return false;

    // Verify ELF magic
    if (header[0] !== 0x7F || header[1] !== 0x45 || header[2] !== 0x4C || header[3] !== 0x46) {
      return false; // Not an ELF file
    }
    // Must be 64-bit (EI_CLASS = 2)
    if (header[4] !== 2) return false;

    const e_phoff = readLong(header, 32);
    const e_phentsize = readUShort(header, 54);
    const e_phnum = readUShort(header, 56);

    if (e_phoff === 0 || e_phnum === 0) return false;

    let modified = false;

    for (let i = 0; i < e_phnum; i++) {
      const phOffset = Number(e_phoff) + i * e_phentsize;

      // Read program header entry
      const phdr = Buffer.alloc(e_phentsize);
      fs.readSync(fd, phdr, 0, e_phentsize, phOffset);

      // p_type at offset 0 (4 bytes LE)
      const pType = phdr.readUInt32LE(0);
      if (pType !== 1) continue; // PT_LOAD only

      const pOffset = readLong(phdr, 8);
      const pVaddr = readLong(phdr, 16);
      const pAlign = readLong(phdr, 48);

      // Already 16KB aligned?
      if (Number(pAlign) >= 16384) continue;

      // Safety: check layout constraint
      const offMod = Number(pOffset) % 16384;
      const vaddrMod = Number(pVaddr) % 16384;

      if (offMod === vaddrMod) {
        // Write new p_align = 16384
        const newAlign = Buffer.alloc(8);
        newAlign.writeBigUInt64LE(BigInt(16384), 0);
        fs.writeSync(fd, newAlign, 0, 8, phOffset + 48);
        modified = true;
      } else {
        console.log(`[16KB] SKIP ${path.basename(filePath)} seg ${i}: offset%16K=${offMod} vaddr%16K=${vaddrMod}`);
      }
    }

    if (modified) {
      console.log(`[16KB] PATCHED ${filePath}`);
    }

    return modified;
  } finally {
    fs.closeSync(fd);
  }
}

// Find and patch all .so files in a directory tree
function patchDirectory(dir) {
  if (!fs.existsSync(dir)) return { fixed: 0, skipped: 0 };

  let totalFixed = 0;
  const allSoFiles = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules/.cache and node_modules/.bin to speed up
        if (entry.name === '.cache' || entry.name === '.bin') continue;
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.so')) {
        // Only patch 64-bit architectures
        if (fullPath.includes('arm64-v8a') || fullPath.includes('x86_64')) {
          allSoFiles.push(fullPath);
        }
      }
    }
  }

  walk(dir);

  for (const soFile of allSoFiles) {
    try {
      if (patchSoFile(soFile)) {
        totalFixed++;
      }
    } catch (err) {
      console.warn(`[16KB] ERROR ${soFile}: ${err.message}`);
    }
  }

  return { fixed: totalFixed, total: allSoFiles.length };
}

// Main: patch .so files in node_modules
const nodeModulesPath = path.resolve(__dirname, '..', 'node_modules');
console.log(`[16KB] Patching .so files in ${nodeModulesPath}`);

const result = patchDirectory(nodeModulesPath);
console.log(`[16KB] Done: patched ${result.fixed}/${result.total} .so files`);

if (result.fixed === 0) {
  console.warn('[16KB] WARNING: No .so files were patched!');
}
