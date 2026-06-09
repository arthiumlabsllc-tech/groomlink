const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix for Hermes/fmt library compilation failure on Xcode 26+
 * 
 * Error: "call to consteval function 'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING, 0>' 
 *         is not a constant expression"
 * 
 * Root cause: Xcode 26's Clang tightened C++20 consteval validation. The fmt library 
 * vendored inside React Native/Hermes uses a pattern that no longer satisfies the 
 * stricter constant-expression rules.
 * 
 * Fix: Compile ONLY the 'fmt' pod with C++17 standard. Since consteval didn't exist 
 * before C++20, the problematic code path is skipped and fmt falls back to runtime 
 * format string validation. The rest of the project keeps C++20.
 * 
 * Reference: https://bleepingswift.com/blog/fmt-consteval-error-xcode-26-4-react-native
 */
function withIosXcodeCompatFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const podfilePath = path.join(projectRoot, 'ios', 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.log('[ios-xcode-compat-fix] No ios/Podfile found, skipping');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Check if already patched
      if (podfileContent.includes("target.name == 'fmt'")) {
        console.log('[ios-xcode-compat-fix] Podfile already patched for fmt C++17 fix');
        return config;
      }

      // The fmt fix - only downgrades the fmt pod to C++17
      const fmtFix = `
    # Fix fmt consteval error with Xcode 26+ (newer Clang)
    # Only the fmt pod needs C++17; everything else stays on C++20
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end`;

      // Try to inject into existing post_install block (after react_native_post_install)
      if (podfileContent.includes('react_native_post_install')) {
        podfileContent = podfileContent.replace(
          /(react_native_post_install\([^)]*\))/,
          `$1\n${fmtFix}`
        );
        console.log('[ios-xcode-compat-fix] Injected fmt fix after react_native_post_install');
      } else if (podfileContent.includes('post_install do |installer|')) {
        // Inject after post_install opening
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${fmtFix}`
        );
        console.log('[ios-xcode-compat-fix] Injected fmt fix into existing post_install');
      } else {
        // Append a new post_install block before the final 'end'
        const lastEndIndex = podfileContent.lastIndexOf('end');
        if (lastEndIndex !== -1) {
          const insertBlock = `\n  post_install do |installer|\n${fmtFix}\n  end\n\n`;
          podfileContent = podfileContent.slice(0, lastEndIndex) + insertBlock + podfileContent.slice(lastEndIndex);
        } else {
          podfileContent += `\npost_install do |installer|\n${fmtFix}\nend\n`;
        }
        console.log('[ios-xcode-compat-fix] Added new post_install block with fmt fix');
      }

      fs.writeFileSync(podfilePath, podfileContent, 'utf8');
      console.log('[ios-xcode-compat-fix] Successfully patched Podfile');

      return config;
    },
  ]);
}

module.exports = withIosXcodeCompatFix;
